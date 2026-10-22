import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const dist = path.join(root, "dist");
const catalog = JSON.parse(await readFile(path.join(root, "src", "data", "catalog.json"), "utf8"));
const regionPayload = JSON.parse(await readFile(path.join(root, "src", "data", "regions.json"), "utf8"));
const regions = Array.isArray(regionPayload) ? regionPayload : regionPayload.regions;
const manifest = JSON.parse(await readFile(path.join(dist, "build-manifest.json"), "utf8"));
const regionalCategories = catalog.filter((category) => category.regional === true);
const commonCategories = catalog.filter((category) => category.regional !== true);

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else files.push(target);
  }
  return files;
}

function routeTarget(href) {
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  const raw = href.split(/[?#]/)[0];
  let decoded;
  try { decoded = decodeURIComponent(raw); } catch { return "__INVALID_ENCODING__"; }
  if (decoded === "/") return path.join(dist, "index.html");
  const relative = decoded.replace(/^\/+/, "");
  if (relative.endsWith("/")) return path.join(dist, `${relative}index.html`);
  if (/\.(?:css|js|png|ico|webp|xml|json|txt)$/i.test(relative)) return path.join(dist, relative);
  return path.join(dist, `${relative}.html`);
}

const allFiles = await walk(dist);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
const failures = [];
let servicePagesChecked = 0;
let commonPartnerPagesChecked = 0;
let sponsoredLinks = 0;

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  if (!html.includes("<meta charset=\"utf-8\">")) failures.push(`${file}: UTF-8 선언 누락`);
  if (!html.includes("<link rel=\"canonical\"")) failures.push(`${file}: canonical 누락`);
  if (!html.includes(`<link rel="icon" href="${manifest.baseUrl}/favicon.ico"`)) failures.push(`${file}: 절대경로 파비콘 선언 누락`);
  if (!html.includes('<meta property="og:image"')) failures.push(`${file}: og:image 누락`);

  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const target = routeTarget(match[1]);
    if (!target) continue;
    try { await access(target); } catch { failures.push(`${path.relative(dist, file)} -> 없는 내부 링크 ${match[1]}`); }
  }

  const partnerCount = [...html.matchAll(/rel="sponsored nofollow noopener noreferrer"/g)].length;
  if (partnerCount) {
    const isRegionalServicePage = html.includes('class="region-network"');
    if (isRegionalServicePage) servicePagesChecked += 1;
    else commonPartnerPagesChecked += 1;
    sponsoredLinks += partnerCount;
    if (partnerCount !== 4) failures.push(`${path.relative(dist, file)}: 제휴 버튼 ${partnerCount}개`);
    const partnerImages = [...html.matchAll(/<img class="partner-thumb" src="([^"]+)"/g)].map((match) => match[1]);
    if (partnerImages.length !== 4 || new Set(partnerImages).size !== 4) failures.push(`${path.relative(dist, file)}: 업체 사진이 4개 고유 이미지가 아닙니다.`);
    if (!html.includes('<details class="detail-guide">') || !html.includes('class="detail-guide-content"')) failures.push(`${path.relative(dist, file)}: 접이식 상세 안내 누락`);
    if (!html.includes('class="service-photo-strip"')) failures.push(`${path.relative(dist, file)}: 서비스 사진 영역 누락`);
    if (isRegionalServicePage && !html.includes('class="region-network"')) failures.push(`${path.relative(dist, file)}: 지역 페이지 연결 블록 누락`);
    if (isRegionalServicePage && !html.includes('"@type":"ItemList"')) failures.push(`${path.relative(dist, file)}: 네이버 캐러셀 ItemList 누락`);
  }
}

const homeHtml = await readFile(path.join(dist, "index.html"), "utf8");
const naverVerificationMeta = '<meta name="naver-site-verification" content="ed62499587760918eb629eb80e8631291b9c3fdf">';
if (!homeHtml.includes(naverVerificationMeta)) failures.push("홈페이지 네이버 소유확인 메타 태그 누락");
for (const file of htmlFiles.filter((file) => path.relative(dist, file) !== "index.html")) {
  const html = await readFile(file, "utf8");
  if (html.includes(naverVerificationMeta)) failures.push(`${path.relative(dist, file)}: 홈페이지 전용 네이버 소유확인 태그 포함`);
}
if (!homeHtml.includes('"@type":"ItemList"')) failures.push("홈페이지 네이버 캐러셀 ItemList 누락");

const expectedServicePages = regions.length * regionalCategories.length;
const expectedHtmlFiles = expectedServicePages + catalog.length + 4;
const expectedPartnerPages = expectedServicePages + commonCategories.length;
if (manifest.servicePageCount !== expectedServicePages) failures.push(`manifest 상세 페이지 수 불일치: ${manifest.servicePageCount}`);
if (servicePagesChecked !== expectedServicePages) failures.push(`제휴 카드가 있는 상세 페이지 수 불일치: ${servicePagesChecked}`);
if (commonPartnerPagesChecked !== commonCategories.length) failures.push(`공통 제휴 페이지 수 불일치: ${commonPartnerPagesChecked}`);
if (sponsoredLinks !== expectedPartnerPages * 4) failures.push(`전체 제휴 버튼 수 불일치: ${sponsoredLinks}`);
if (htmlFiles.length !== expectedHtmlFiles) failures.push(`HTML 파일 수 불일치: ${htmlFiles.length} / ${expectedHtmlFiles}`);
if (allFiles.length !== manifest.outputFileCount) failures.push(`전체 파일 수 불일치: ${allFiles.length} / ${manifest.outputFileCount}`);

const requiredFiles = ["index.html", "404.html", "robots.txt", "rss.xml", "sitemap.xml", "sitemap-index.xml", "styles.css", "app.js", "_headers", "data/regions.json", "favicon.ico", "favicon-32x32.png", "favicon-192.png", "favicon-512.png", "apple-touch-icon.png"];
for (const file of requiredFiles) {
  try { await access(path.join(dist, file)); } catch { failures.push(`필수 파일 누락: ${file}`); }
}

const partnerImageFiles = allFiles.filter((file) => file.includes(`${path.sep}images${path.sep}partners${path.sep}`) && file.endsWith(".webp"));
if (partnerImageFiles.length !== 20) failures.push(`업체 전용 사진 수 불일치: ${partnerImageFiles.length} / 20`);

const report = {
  ok: failures.length === 0,
  regionCount: regions.length,
  categoryCount: catalog.length,
  regionalCategoryCount: regionalCategories.length,
  servicePagesChecked,
  commonPartnerPagesChecked,
  htmlFileCount: htmlFiles.length,
  outputFileCount: allFiles.length,
  sponsoredLinkCount: sponsoredLinks,
  partnerImageCount: partnerImageFiles.length,
  failures: failures.slice(0, 50)
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
