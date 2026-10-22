import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const outputPath = resolve(projectRoot, "src/data/regions.json");
const defaultSeedPath = resolve(projectRoot, "../new-chat/outputs/regions-480.txt");
const seedPath = process.env.SEED_REGIONS_FILE || defaultSeedPath;

const landingUrl = "https://jumin.mois.go.kr/etcStatAvgAge.do";
const downloadUrl = "https://jumin.mois.go.kr/downloadCsvEtc.do?searchYearMonth=month&xlsStats=3";
const legalCodeUrl = "https://www.code.go.kr/stdcode/regCodeL.do";
const legalPageSize = 100;

function cookieHeader(response) {
  const values = response.headers.getSetCookie?.() ?? [];
  const raw = values.length ? values : [response.headers.get("set-cookie")].filter(Boolean);
  return raw.map((value) => value.split(";", 1)[0]).join("; ");
}

function shortTopLevel(value) {
  if (value.startsWith("서울")) return "서울";
  if (value.startsWith("전남광주")) return "광주";
  if (value.startsWith("부산")) return "부산";
  if (value.startsWith("대구")) return "대구";
  if (value.startsWith("인천")) return "인천";
  if (value.startsWith("대전")) return "대전";
  if (value.startsWith("울산")) return "울산";
  if (value.startsWith("세종")) return "세종";
  return value;
}

function displayLabel(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return shortTopLevel(parts[0]);

  const top = parts[0];
  const isUrbanTop = /(특별시|광역시|특별자치시|통합특별시)$/.test(top);
  if (isUrbanTop) {
    if (/시$/.test(parts[1])) {
      const city = parts[1].replace(/시$/, "");
      return [city, ...parts.slice(2)].join(" ");
    }
    return [shortTopLevel(top), ...parts.slice(1)].join(" ");
  }

  let city = parts[1].replace(/시$/, "");
  if (top === "경기도" && city === "광주") city = "경기 광주";
  return [city, ...parts.slice(2)].join(" ");
}

function normalizeRegion(value) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized
    .replace(/^서울 성동구 성수[12]가제\d+동$/, "서울 성동구 성수동")
    .replace(/^서울 성동구 성수동[12]가$/, "서울 성동구 성수동");
}

function parseRows(csvText) {
  const rows = [];
  for (const line of csvText.split(/\r?\n/).slice(1)) {
    const firstCell = line.match(/^"([^"]+)"/u)?.[1];
    if (!firstCell) continue;
    const match = firstCell.match(/^(.+?)\s*\((\d{10})\)$/u);
    if (!match) continue;
    rows.push({ fullName: match[1].trim(), code: match[2] });
  }
  return rows;
}

function classifyRows(rows) {
  const filtered = rows.filter(({ fullName }) => fullName !== "전국");

  const cities = filtered.filter(({ fullName, code }) => {
    const last = fullName.split(/\s+/).at(-1);
    const topLevelCity = /^\d{2}0{8}$/.test(code) && /(특별시|광역시|특별자치시|통합특별시)$/.test(fullName);
    const provinceCity = /^\d{5}0{5}$/.test(code) && /시$/.test(last);
    return topLevelCity || provinceCity;
  });

  const districts = filtered.filter(({ fullName, code }) => {
    const last = fullName.split(/\s+/).at(-1);
    return /^\d{5}0{5}$/.test(code) && /구$/.test(last) && !/(^|\s)[^\s]+군(\s|$)/.test(fullName);
  });

  const dongs = filtered.filter(({ fullName, code }) => {
    const last = fullName.split(/\s+/).at(-1);
    return /^\d{8}00$/.test(code)
      && !/^\d{5}0{5}$/.test(code)
      && /동$/.test(last)
      && !/(^|\s)[^\s]+군(\s|$)/.test(fullName);
  });

  return { cities, districts, dongs };
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&#39;|&#x27;/giu, "'")
    .replace(/&quot;/giu, '"')
    .replace(/\s+/gu, " ")
    .trim();
}

function parseLegalCodePage(html) {
  const rows = [];
  const pattern = /class="table_left">\s*(\d{10})\s*<\/td>\s*<td class="table_center01">\s*([^<]+?)\s*<\/td>/giu;
  for (const match of html.matchAll(pattern)) {
    rows.push({ code: match[1], fullName: decodeHtml(match[2]) });
  }
  const totalText = html.match(/총\s*<strong><font[^>]*>([\d,]+)<\/font><\/strong>건/iu)?.[1];
  return { rows, total: totalText ? Number(totalText.replaceAll(",", "")) : null };
}

async function fetchLegalCodePage(page) {
  const body = new URLSearchParams({
    cPage: String(page),
    regionCd_pk: "",
    chkWantCnt: "0",
    reqSggCd: "",
    reqUmdCd: "",
    reqRiCd: "",
    searchOk: "",
    codeseId: "00002",
    regionCd: "",
    locataddNm: "",
    disuseAt: "0",
    stdate: "",
    enddate: "",
    pageSize: String(legalPageSize),
    sidoCd: "*",
    sggCd: "*",
    umdCd: "*",
    riCd: "*"
  });
  const response = await fetch(legalCodeUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "user-agent": "Mozilla/5.0"
    },
    body
  });
  if (!response.ok) throw new Error(`법정동 코드 ${page}페이지 요청 실패: ${response.status}`);
  return parseLegalCodePage(await response.text());
}

async function fetchLegalRows() {
  const first = await fetchLegalCodePage(1);
  if (!first.total || !first.rows.length) throw new Error("법정동 코드 첫 페이지를 해석하지 못했습니다.");

  const pages = Math.ceil(first.total / legalPageSize);
  const rows = [...first.rows];
  const concurrency = 12;
  for (let start = 2; start <= pages; start += concurrency) {
    const pageNumbers = Array.from(
      { length: Math.min(concurrency, pages - start + 1) },
      (_, index) => start + index
    );
    const batches = await Promise.all(pageNumbers.map(fetchLegalCodePage));
    for (const batch of batches) rows.push(...batch.rows);
  }
  if (rows.length !== first.total) {
    throw new Error(`법정동 코드 수 불일치: 예상 ${first.total}, 수집 ${rows.length}`);
  }
  return rows;
}

function classifyLegalDongs(rows) {
  return rows.filter(({ fullName }) => {
    const parts = fullName.split(/\s+/u);
    const last = parts.at(-1);
    return parts.length >= 2
      && /동$/u.test(last)
      && !/(^|\s)[^\s]+군(\s|$)/u.test(fullName);
  });
}

async function fetchAdministrativeRows() {
  const landing = await fetch(landingUrl, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!landing.ok) throw new Error(`행정안전부 페이지 요청 실패: ${landing.status}`);
  const landingHtml = await landing.text();
  const cookie = cookieHeader(landing);
  const year = landingHtml.match(/var yearDB\s*=\s*'(\d{4})'/u)?.[1] ?? new Date().getFullYear().toString();
  const month = landingHtml.match(/var monthDB\s*=\s*'(\d{2})'/u)?.[1] ?? "01";

  const body = new URLSearchParams({
    sltOrgType: "1",
    sltOrgLvl1: "A",
    sltOrgLvl2: "",
    sum: "sum",
    gender: "gender",
    searchYearStart: year,
    searchMonthStart: month,
    searchYearEnd: year,
    searchMonthEnd: month,
    sltOrderType: "1",
    sltOrderValue: "ASC",
    category: "avgAgeDetail",
    state: "3",
    stateMobile: "3"
  });

  const response = await fetch(downloadUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "user-agent": "Mozilla/5.0",
      ...(cookie ? { cookie } : {})
    },
    body
  });
  if (!response.ok) throw new Error(`행정동 CSV 요청 실패: ${response.status}`);
  const bytes = await response.arrayBuffer();
  const csvText = new TextDecoder("euc-kr").decode(bytes);
  return { rows: parseRows(csvText), referenceMonth: `${year}-${month}` };
}

async function loadSeedRegions() {
  if (!existsSync(seedPath)) {
    if (existsSync(outputPath)) {
      const previous = JSON.parse(await readFile(outputPath, "utf8"));
      const preserved = previous.regions
        .filter((region) => region.source === "section-480")
        .map((region) => normalizeRegion(region.name));
      console.warn(`원본 생활권 파일이 없어 기존 병합 결과에서 ${preserved.length}개를 보존합니다.`);
      return preserved;
    }
    console.warn(`생활권 시드 파일과 기존 지역 데이터가 없습니다: ${seedPath}`);
    return [];
  }
  const text = await readFile(seedPath, "utf8");
  return text.split(/\r?\n/).map(normalizeRegion).filter(Boolean);
}

function addRegion(map, name, kind, source) {
  const normalized = normalizeRegion(name);
  if (!normalized || map.has(normalized)) return;
  map.set(normalized, { name: normalized, kind, source });
}

async function main() {
  const [{ rows, referenceMonth }, legalRows, seedRegions] = await Promise.all([
    fetchAdministrativeRows(),
    fetchLegalRows(),
    loadSeedRegions()
  ]);
  const { cities, districts, dongs } = classifyRows(rows);
  const legalDongs = classifyLegalDongs(legalRows);
  const merged = new Map();

  for (const row of cities) addRegion(merged, displayLabel(row.fullName), "city", "official");
  for (const row of districts) addRegion(merged, displayLabel(row.fullName), "district", "official");
  for (const row of dongs) addRegion(merged, displayLabel(row.fullName), "dong", "official");
  const administrativeCount = merged.size;
  for (const row of legalDongs) addRegion(merged, displayLabel(row.fullName), "dong", "official-legal");
  const officialCount = merged.size;
  for (const name of seedRegions) addRegion(merged, name, "living-area", "section-480");

  const result = {
    generatedAt: new Date().toISOString(),
    referenceMonth,
    source: "행정안전부 주민등록 인구통계 행정동, 행정표준코드관리시스템 법정동 및 사용자 생활권 목록",
    legalSourceUrl: legalCodeUrl,
    counts: {
      administrativeAfterNormalization: administrativeCount,
      legalDongInput: legalDongs.length,
      legalDongAdded: officialCount - administrativeCount,
      officialAfterNormalization: officialCount,
      seedInput: seedRegions.length,
      mergedUnique: merged.size
    },
    regions: [...merged.values()]
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(result.counts));
  console.log(`저장: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
