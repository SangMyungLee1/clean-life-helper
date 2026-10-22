import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { generateUniqueGuide } from "./unique-content.mjs";

const root = process.cwd();
const dist = path.join(root, "dist");
const config = JSON.parse(await readFile(path.join(root, "site.config.json"), "utf8"));
const catalog = JSON.parse(await readFile(path.join(root, "src", "data", "catalog.json"), "utf8"));
const detailedGuides = JSON.parse(await readFile(path.join(root, "src", "data", "guides.json"), "utf8"));
const contentVariants = JSON.parse(await readFile(path.join(root, "src", "data", "content-variants.json"), "utf8"));
const reviewEntries = JSON.parse(await readFile(path.join(root, "src", "data", "reviews.json"), "utf8"));
const regionPayload = JSON.parse(await readFile(path.join(root, "src", "data", "regions.json"), "utf8"));
const regions = Array.isArray(regionPayload) ? regionPayload : regionPayload.regions;
const baseUrl = config.baseUrl.replace(/\/+$/, "");
const builtAt = new Date().toISOString();
const regionNameSet = new Set(regions.map((region) => region.name));
const regionalCategories = catalog.filter((category) => category.regional === true);
const commonCategories = catalog.filter((category) => category.regional !== true);
const cleaningCategoryIds = new Set(["move-in-cleaning", "move-out-cleaning"]);

const icons = {
  moving: "📦",
  "move-in-cleaning": "✨",
  "move-out-cleaning": "🧹",
  internet: "🌐",
  water: "💧",
  "rental-car": "🚗"
};

const categoryImages = {
  moving: "/images/moving.webp",
  "move-in-cleaning": "/images/cleaning.webp",
  "move-out-cleaning": "/images/related-cleaning.webp",
  internet: "/images/internet.webp",
  water: "/images/water.webp",
  "rental-car": "/images/rental-car.webp"
};

const relatedServiceImages = {
  moving: "/images/related-moving.webp",
  "move-in-cleaning": "/images/related-cleaning.webp",
  "move-out-cleaning": "/images/related-cleaning.webp",
  internet: "/images/related-internet.webp",
  water: "/images/related-water.webp",
  "rental-car": "/images/related-rental-car.webp"
};

const cleaningHookPrefixes = [
  "완벽한", "최저가", "1위 추천", "저렴한", "가성비 좋은", "할인받는",
  "특가", "프로모션", "인기", "추천", "합리적인", "알뜰한",
  "믿을 수 있는", "꼼꼼한", "전문적인", "만족도 높은", "비용을 아끼는",
  "안심", "실속형", "혜택 많은", "빠르게 만나는", "맞춤형", "지역별 추천", "전국 비교"
];
const cleaningHookSubjects = [
  "입주청소", "입주청소 업체", "입주청소 견적", "입주청소 서비스", "입주청소 상담"
];
const cleaningHookClaims = [
  "최저가 조건", "할인 혜택", "특가 혜택", "프로모션", "무료견적",
  "예상 비용", "가격 조건", "추가 혜택", "1위 업체", "저렴한 업체",
  "싼곳", "추천 업체", "인기 업체", "전문 업체", "가성비 업체",
  "맞춤 견적", "비교 견적", "작업 범위", "신청 조건", "상담 조건"
];
const cleaningHookActions = ["확인", "비교", "알아보기", "안내", "살펴보기", "체크"];
const cleaningTitleHooks = [
  ...cleaningHookPrefixes.flatMap((prefix) => cleaningHookSubjects.map((subject) => `${prefix} ${subject}`)),
  ...cleaningHookClaims.flatMap((claim) => cleaningHookActions.map((action) => `입주청소 ${claim} ${action}`))
];

function stableIndex(value, size) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % size;
}

function cleaningTitleHook(regionName) {
  return cleaningTitleHooks[stableIndex(`${regionName}:cleaning-title-v1`, cleaningTitleHooks.length)];
}

const partnerImages = Object.fromEntries(catalog.map((category) => {
  const imageKey = cleaningCategoryIds.has(category.id) ? "cleaning" : category.id;
  return [category.id, Array.from({ length: 4 }, (_, index) => `/images/partners/${imageKey}-${index + 1}.webp`)];
}));

const regionByName = new Map(regions.map((region) => [region.name, region]));
const regionPosition = new Map(regions.map((region, index) => [region.name, index]));
const regionNavigationCache = new Map();
const verifiedReviewMap = new Map();
for (const review of reviewEntries) {
  if (review.verified !== true) continue;
  const key = `${review.serviceId}:${review.region}`;
  const entries = verifiedReviewMap.get(key) || [];
  entries.push(review);
  verifiedReviewMap.set(key, entries);
}

const htmlEscapeMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => htmlEscapeMap[char]);
const escapeXml = escapeHtml;
const safeJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

function safeSegment(value) {
  return String(value)
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[. ]+$/g, "") || "지역";
}

function regionSegments(region) {
  return region.name.split(/\s+/).map(safeSegment);
}

function serviceRoute(category, region) {
  const parts = [safeSegment(category.slug), ...regionSegments(region)];
  parts[parts.length - 1] += ".html";
  return parts.join("/");
}

function categoryRoute(category) {
  return `${safeSegment(category.slug)}/index.html`;
}

function categoryHref(category, region = null) {
  return category.regional && region
    ? hrefForRoute(serviceRoute(category, region))
    : hrefForRoute(categoryRoute(category));
}

function hrefForRoute(route) {
  const publicRoute = route.endsWith("/index.html")
    ? route.slice(0, -"index.html".length)
    : route.endsWith(".html")
      ? route.slice(0, -".html".length)
      : route;
  return `/${publicRoute.split("/").filter(Boolean).map(encodeURIComponent).join("/")}${publicRoute.endsWith("/") ? "/" : ""}`;
}

function canonicalForRoute(route) {
  return `${baseUrl}${hrefForRoute(route)}`;
}

function absoluteUrlForHref(href) {
  return new URL(href, `${baseUrl}/`).href;
}

function pageShell({ title, description, canonical, body, structuredData = null, pageClass = "", ogImage = `${baseUrl}/images/home-hero.webp`, headExtra = "" }) {
  const schemas = structuredData
    ? (Array.isArray(structuredData) ? structuredData : [structuredData])
    : [];
  const schema = schemas.map((item) => `<script type="application/ld+json">${safeJson(item)}</script>`).join("\n  ");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${headExtra}
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="icon" href="${baseUrl}/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="${baseUrl}/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="192x192" href="${baseUrl}/favicon-192.png">
  <link rel="apple-touch-icon" sizes="180x180" href="${baseUrl}/apple-touch-icon.png">
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(config.siteName)} RSS" href="${baseUrl}/rss.xml">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ko_KR">
  <meta property="og:site_name" content="${escapeHtml(config.siteName)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:alt" content="${escapeHtml(title)} 대표 이미지">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <meta name="theme-color" content="#1f63e9">
  <link rel="stylesheet" href="/styles.css">
  ${schema}
</head>
<body class="${escapeHtml(pageClass)}">
  ${headerMarkup()}
  ${body}
  ${footerMarkup()}
  <script src="/app.js" defer></script>
</body>
</html>`;
}

const servicePhotoCaptions = {
  moving: ["이사 일정 상담", "포장 범위 확인", "운반 동선 점검", "가구·가전 보호", "견적 조건 비교"],
  "move-in-cleaning": ["입주 전 범위 확인", "창틀·문틀 공사 분진", "새 수납공간 내부", "욕실 잔여물 확인", "바닥 마감 상태 점검"],
  "move-out-cleaning": ["이사 일정과 범위 확인", "창틀 생활 오염", "주방·수납공간 청소", "욕실 물때·곰팡이", "바닥 묵은 때 점검"],
  internet: ["통신사 조건 확인", "설치 가능 지역 조회", "요금제 비교", "결합 혜택 확인", "설치 일정 상담"],
  water: ["정수기 유형 비교", "설치 공간 확인", "필터 관리 상담", "렌탈 조건 비교", "방문 설치 안내"],
  "rental-car": ["차종 선택", "렌탈 조건 확인", "보험 범위 비교", "인도 일정 상담", "월 비용 비교"]
};

function servicePhotoGalleryMarkup(category, regionName) {
  const images = [relatedServiceImages[category.id], ...partnerImages[category.id]];
  const captions = servicePhotoCaptions[category.id];
  return `<section class="service-photo-section shell" aria-labelledby="service-photo-title">
    <div class="section-heading photo-heading"><div><h2 id="service-photo-title">${escapeHtml(regionName)} ${escapeHtml(category.name)} 확인 항목</h2></div></div>
    <div class="service-photo-strip">
      ${images.map((src, index) => `<figure><img src="${src}" alt="${escapeHtml(`${regionName} ${category.name} ${captions[index]}`)}" width="520" height="390" loading="lazy"><figcaption>${escapeHtml(captions[index])}</figcaption></figure>`).join("")}
    </div>
  </section>`;
}

function headerMarkup() {
  return `<header class="site-header">
  <div class="shell header-inner">
    <a class="brand" href="/" aria-label="${escapeHtml(config.siteName)} 홈">
      <span class="brand-mark" aria-hidden="true">365</span>
      <span><strong>${escapeHtml(config.siteName)}</strong><small>생활 서비스 비교 안내</small></span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav">메뉴</button>
    <nav id="main-nav" class="main-nav" aria-label="주요 서비스">
      ${catalog.map((category) => `<a href="/${encodeURIComponent(category.slug)}/">${escapeHtml(category.name)}</a>`).join("")}
    </nav>
  </div>
</header>`;
}

function footerMarkup() {
  return `<footer class="site-footer">
  <div class="shell footer-inner">
    <div><strong>${escapeHtml(config.siteName)}</strong><p>${escapeHtml(config.tagline)}</p></div>
    <nav aria-label="사이트 안내"><a href="/affiliate-disclosure">제휴 안내</a><a href="/privacy">개인정보처리방침</a><a href="/rss.xml">RSS</a></nav>
  </div>
</footer>`;
}

function searchMarkup(selectedSlug = "") {
  return `<form class="finder" data-region-finder>
  <div class="finder-heading"><strong>지역과 서비스를 선택하세요</strong><span>원하는 조건의 비교 페이지로 바로 이동합니다.</span></div>
  <label><span>지역</span><input name="region" list="region-options" placeholder="예: 서울 종로구 평창동" autocomplete="off" required></label>
  <datalist id="region-options"></datalist>
  <label><span>서비스</span><select name="category" required>
    ${regionalCategories.map((category) => `<option value="${escapeHtml(category.slug)}"${category.slug === selectedSlug ? " selected" : ""}>${escapeHtml(category.name)}</option>`).join("")}
  </select></label>
  <button type="submit">비교 페이지 보기</button>
  <p class="finder-error" data-finder-error role="alert" hidden></p>
</form>`;
}

function partnerCardsMarkup(category, regionName) {
  return `<div class="partner-grid">
    ${category.partners.map((partner, index) => `<a class="partner-card${index === 0 ? " is-featured" : ""}" href="${escapeHtml(partner.url)}" target="_blank" rel="sponsored nofollow noopener noreferrer" aria-label="${escapeHtml(`${partner.name} ${category.buttonLabel}`)}">
      ${index === 0 ? '<span class="recommended">추천 비교</span>' : ""}
      <header class="partner-head">
        <span class="rank" aria-label="${index + 1}번째 업체">${index + 1}</span>
        <img class="partner-thumb" src="${partnerImages[category.id][index]}" alt="${escapeHtml(partner.name)} 사진" width="76" height="76" loading="lazy">
        <div><p class="partner-category">${escapeHtml(regionName)} ${escapeHtml(category.name)}</p><h3>${escapeHtml(partner.name)}</h3></div>
      </header>
      <ul class="partner-features">
        ${partner.features.map((feature) => `<li><span aria-hidden="true">✓</span>${escapeHtml(feature)}</li>`).join("")}
      </ul>
      <span class="partner-cta">${escapeHtml(category.buttonLabel)}<span aria-hidden="true">↗</span></span>
    </a>`).join("")}
  </div>`;
}

function regionNavigationMarkup(category, region) {
  let navigation = regionNavigationCache.get(region.name);
  if (!navigation) {
  const parts = regionSegments(region);
  let parent = null;
  for (let length = parts.length - 1; length > 0; length -= 1) {
    const candidate = regionByName.get(parts.slice(0, length).join(" "));
    if (candidate) {
      parent = candidate;
      break;
    }
  }

  const directChildren = regions.filter((candidate) => {
    const candidateParts = regionSegments(candidate);
    return candidateParts.length === parts.length + 1 && candidate.name.startsWith(`${region.name} `);
  });
  const siblingPrefix = parent ? `${parent.name} ` : `${parts[0]} `;
  const siblings = regions.filter((candidate) => {
    if (candidate.name === region.name) return false;
    const candidateParts = regionSegments(candidate);
    return candidateParts.length === parts.length && candidate.name.startsWith(siblingPrefix);
  });

  const linked = [];
  const seen = new Set([region.name]);
  const candidates = directChildren.length ? directChildren : siblings;
  const linkLimit = directChildren.length ? Number.POSITIVE_INFINITY : 10;
  for (const candidate of candidates) {
    if (seen.has(candidate.name)) continue;
    seen.add(candidate.name);
    linked.push(candidate);
    if (linked.length === linkLimit) break;
  }

  const index = regionPosition.get(region.name);
  const previous = index > 0 ? regions[index - 1] : null;
  const next = index < regions.length - 1 ? regions[index + 1] : null;

    navigation = { parent, linked, previous, next };
    regionNavigationCache.set(region.name, navigation);
  }

  const { parent, linked, previous, next } = navigation;

  return `<div class="region-network">
    <div class="region-network-heading"><div><p class="eyebrow">지역 페이지 연결</p><h2>${escapeHtml(category.name)} 다른 지역 둘러보기</h2></div>${parent ? `<a class="parent-region" href="${hrefForRoute(serviceRoute(category, parent))}">← ${escapeHtml(parent.name)} 전체 보기</a>` : `<a class="parent-region" href="/${encodeURIComponent(category.slug)}/">← 전국 지역 선택</a>`}</div>
    ${linked.length ? `<div class="region-network-links">${linked.map((candidate) => `<a href="${hrefForRoute(serviceRoute(category, candidate))}"><span>${escapeHtml(candidate.name)}</span><small>${escapeHtml(category.name)} 보기 →</small></a>`).join("")}</div>` : ""}
    <nav class="region-pager" aria-label="이전 및 다음 지역">${previous ? `<a rel="prev" href="${hrefForRoute(serviceRoute(category, previous))}"><small>이전 지역</small><strong>← ${escapeHtml(previous.name)}</strong></a>` : "<span></span>"}${next ? `<a rel="next" href="${hrefForRoute(serviceRoute(category, next))}"><small>다음 지역</small><strong>${escapeHtml(next.name)} →</strong></a>` : "<span></span>"}</nav>
  </div>`;
}

function breadcrumbMarkup(category, region) {
  const levels = regionSegments(region);
  const crumbs = [{ label: "홈", href: "/" }, { label: category.name, href: `/${encodeURIComponent(category.slug)}/` }];

  for (let i = 0; i < levels.length - 1; i += 1) {
    const partial = { name: levels.slice(0, i + 1).join(" ") };
    crumbs.push({ label: levels[i], href: regionNameSet.has(partial.name) ? hrefForRoute(serviceRoute(category, partial)) : null });
  }
  crumbs.push({ label: levels.at(-1), href: null });

  return `<nav class="breadcrumbs" aria-label="현재 위치">${crumbs.map((crumb, index) => `${index ? '<span aria-hidden="true">›</span>' : ""}${crumb.href ? `<a href="${crumb.href}">${escapeHtml(crumb.label)}</a>` : `<span aria-current="page">${escapeHtml(crumb.label)}</span>`}`).join("")}</nav>`;
}

function detailedGuideMarkup(category, region) {
  const guide = category.regional
    ? generateUniqueGuide(category.id, region.name, contentVariants[`${category.id}:${region.name}`] || 0)
    : detailedGuides[category.id];
  if (!guide) return "";

  const injectRegion = (value) => escapeHtml(String(value).replaceAll("{지역}", region.name));
  return `<section class="detail-guide-section">
    <div class="shell">
      <details class="detail-guide">
        <summary>
          <span class="detail-guide-icon" aria-hidden="true">${icons[category.id]}</span>
          <span class="detail-guide-summary"><small>한 번에 읽는 지역 맞춤 안내</small><strong>${escapeHtml(region.name)} ${escapeHtml(guide.label)}</strong><em>작업 범위와 계약 조건을 자세히 확인하세요.</em></span>
          <span class="detail-guide-toggle" aria-hidden="true"><span class="detail-guide-open">상세 안내 확인</span><span class="detail-guide-close">상세 안내 접기</span><b>＋</b></span>
        </summary>
        <div class="detail-guide-content">
          <p class="detail-guide-lead">${injectRegion(guide.lead)}</p>
          <ul class="detail-guide-points">${guide.keypoints.map((point) => `<li><span aria-hidden="true">✓</span>${injectRegion(point)}</li>`).join("")}</ul>
          <div class="detail-guide-articles">${guide.sections.map((section, index) => `<article><span class="detail-guide-number">${String(index + 1).padStart(2, "0")}</span><h3>${injectRegion(section.title)}</h3>${section.subtitle ? `<p class="detail-guide-subtitle">${injectRegion(section.subtitle)}</p>` : ""}${section.paragraphs.map((paragraph) => `<p>${injectRegion(paragraph)}</p>`).join("")}</article>`).join("")}</div>
          ${guide.caseExample ? `<aside class="case-example"><strong>상담 사례 예시</strong><p>${injectRegion(guide.caseExample)}</p></aside>` : ""}
        </div>
      </details>
    </div>
  </section>`;
}

function verifiedReviewsMarkup(category, region) {
  const reviews = verifiedReviewMap.get(`${category.id}:${region.name}`) || [];
  if (!reviews.length) return "";
  return `<section class="section shell verified-reviews" aria-labelledby="verified-review-title">
    <div class="section-heading"><div><p class="eyebrow">게시 동의 확인</p><h2 id="verified-review-title">${escapeHtml(region.name)} 실제 이용 후기</h2></div><p>실제 이용자가 작성하거나 최종 문구를 확인하고 게시에 동의한 후기만 표시합니다.</p></div>
    <div class="review-grid">${reviews.map((review) => `<article><div><strong>${escapeHtml(review.displayName)}</strong><span>${escapeHtml(review.usedAt)} 이용</span></div><p>${escapeHtml(review.text)}</p><small>후기 확인일 ${escapeHtml(review.consentAt)}</small></article>`).join("")}</div>
  </section>`;
}

function servicePage(category, region) {
  const titleSuffix = cleaningTitleHook(`${region.name}:${category.id}`);
  const title = category.id === "move-in-cleaning"
    ? `${region.name} 입주청소 | ${titleSuffix}`
    : `${region.name} 이사청소 견적 비교 | ${titleSuffix}`;
  const description = `${region.name} ${category.name} 업체 4곳의 상담 특징과 확인 사항을 비교하고 원하는 업체의 무료 견적 페이지로 바로 연결하세요.`;
  const route = serviceRoute(category, region);
  const canonical = canonicalForRoute(route);
  const otherCategories = catalog.filter((item) => item.id !== category.id);

  const body = `<main>
  <div class="shell">${breadcrumbMarkup(category, region)}</div>
  <section class="service-hero">
    <div class="shell hero-grid">
      <div>
        <p class="eyebrow">${escapeHtml(category.eyebrow)}</p>
        <h1>${escapeHtml(region.name)} <span>${escapeHtml(category.name)}</span></h1>
        <p class="hero-copy">${escapeHtml(category.description)} 아래 업체별 안내를 살펴본 뒤 원하는 상담 페이지로 이동할 수 있습니다.</p>
        <ul class="hero-points">
          ${category.checklist.map((item) => `<li><span aria-hidden="true">✓</span>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>
      <figure class="service-hero-photo">
        <img src="${categoryImages[category.id]}" alt="${escapeHtml(category.name)} 사진" width="900" height="720">
        <figcaption class="hero-summary"><span class="summary-icon" aria-hidden="true">${icons[category.id]}</span><div><strong>4개 제휴업체 비교</strong><p>회원가입 없이 상담 페이지를 확인하세요.</p></div><a href="#partners">업체 보기</a></figcaption>
      </figure>
    </div>
  </section>

  <section id="partners" class="section shell">
    <div class="section-heading"><div><p class="eyebrow">업체별 상담 조건 확인</p><h2>${escapeHtml(region.name)} ${escapeHtml(category.name)} 비교</h2></div><p>버튼을 누르면 해당 업체의 견적 신청 페이지가 새 창에서 열립니다.</p></div>
    ${partnerCardsMarkup(category, region.name)}
  </section>

  ${detailedGuideMarkup(category, region)}

  ${verifiedReviewsMarkup(category, region)}

  ${servicePhotoGalleryMarkup(category, region.name)}

  <section class="section section-muted">
    <div class="shell two-column">
      <div>
        <p class="eyebrow">상담 전 체크</p>
        <h2>${escapeHtml(region.name)}에서 미리 확인할 내용</h2>
        <ol class="check-steps">${category.checklist.map((item, index) => `<li><span>${index + 1}</span><div><strong>${escapeHtml(item)}</strong><p>업체에 같은 조건을 전달하면 제안 내용을 비교하기 쉽습니다.</p></div></li>`).join("")}</ol>
      </div>
      <div>
        <p class="eyebrow">자주 묻는 질문</p>
        <h2>${escapeHtml(category.name)} FAQ</h2>
        <div class="faq-list">${category.faqs.map((faq, index) => `<details${index === 0 ? " open" : ""}><summary>${escapeHtml(index === 0 ? `${region.name}에서 ${faq.q}` : faq.q)}</summary><p>${escapeHtml(faq.a)}</p></details>`).join("")}</div>
      </div>
    </div>
  </section>

  <section class="section shell">
    <div class="section-heading"><div><p class="eyebrow">다른 생활 서비스</p><h2>${escapeHtml(region.name)}의 다른 견적도 확인하세요</h2></div></div>
      <div id="related-services" class="related-grid">${otherCategories.map((item) => `<a href="${categoryHref(item, region)}"><img class="related-photo" src="${relatedServiceImages[item.id]}" alt="${escapeHtml(item.name)}" width="520" height="330" loading="lazy"><div class="related-card-body"><span class="related-icon" aria-hidden="true">${icons[item.id]}</span><strong>${escapeHtml(item.regional ? `${region.name} ${item.name}` : item.name)}</strong><small>${item.regional ? "같은 지역 비교하기" : "제휴업체 4곳 보기"} →</small></div></a>`).join("")}</div>
    ${regionNavigationMarkup(category, region)}
    <div class="reset-box"><p>다른 지역이나 서비스 조건을 찾으시나요?</p><a href="/#find">지역·서비스 다시 선택하기</a></div>
  </section>
</main>`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: config.siteName, url: `${baseUrl}/` },
    about: { "@type": "Service", name: `${region.name} ${category.name}`, areaServed: region.name }
  };
  const relatedItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${region.name} 관련 생활 서비스`,
    itemListElement: otherCategories.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.regional ? `${region.name} ${item.name}` : item.name,
      image: `${baseUrl}${relatedServiceImages[item.id]}`,
      url: absoluteUrlForHref(categoryHref(item, region))
    }))
  };

  return pageShell({
    title,
    description,
    canonical,
    body,
    structuredData: [
      {
        ...structuredData,
        primaryImageOfPage: { "@type": "ImageObject", contentUrl: `${baseUrl}${categoryImages[category.id]}` }
      },
      relatedItemList
    ],
    pageClass: "service-page",
    ogImage: `${baseUrl}${categoryImages[category.id]}`
  });
}

function homePage() {
  const title = `${config.siteName} | ${config.tagline}`;
  const description = "전국 지역별 입주청소와 이사청소 업체를 비교하고 이사, 인터넷 가입, 정수기 렌탈, 렌터카 제휴 상담 페이지를 확인하세요.";
  const featuredRegions = ["서울", "서울 강남구", "서울 종로구", "부산", "부산 해운대구", "대구", "인천", "광주", "대전", "울산", "경기 수원시", "경기 화성시"];
  const regionMap = new Map(regions.map((region) => [region.name, region]));
  const moveInCleaning = catalog.find((item) => item.id === "move-in-cleaning");
  const moveOutCleaning = catalog.find((item) => item.id === "move-out-cleaning");
  const homeItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${config.siteName} 생활 서비스`,
    itemListElement: catalog.map((category, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: category.name,
      image: `${baseUrl}${categoryImages[category.id]}`,
      url: canonicalForRoute(categoryRoute(category))
    }))
  };

  const body = `<main>
  <section class="home-hero">
    <div class="shell home-hero-inner">
      <div class="home-hero-copy"><p class="eyebrow">우리 집에 필요한 순간</p><h1>생활 서비스 견적,<br><span>가볍게 비교하세요</span></h1><p>${escapeHtml(config.tagline)} 정보를 지역별로 찾고 원하는 업체의 상담 페이지로 바로 이동할 수 있습니다.</p><div id="find">${searchMarkup()}</div></div>
      <figure class="home-photo"><img src="/images/home-hero.webp" alt="밝은 아파트에서 입주 청소를 준비하는 모습" width="1536" height="1024"><figcaption><strong>전국 ${regions.length.toLocaleString("ko-KR")}개 지역</strong><span>지역별 생활 서비스 비교 안내</span></figcaption></figure>
    </div>
  </section>
  <section class="section shell">
    <div class="section-heading"><div><p class="eyebrow">6개 비교 카테고리</p><h2>원하는 서비스를 선택하세요</h2></div><p>각 카테고리마다 4개 제휴업체의 특징을 확인할 수 있습니다.</p></div>
    <div class="category-grid">${catalog.map((category) => `<a href="/${encodeURIComponent(category.slug)}/"><img class="category-card-photo" src="${categoryImages[category.id]}" alt="${escapeHtml(category.name)}" width="640" height="430" loading="lazy"><div class="category-card-body"><span class="category-icon" aria-hidden="true">${icons[category.id]}</span><strong>${escapeHtml(category.name)}</strong><p>${escapeHtml(category.description)}</p><small>${category.regional ? "지역 선택하기" : "제휴업체 보기"} →</small></div></a>`).join("")}</div>
  </section>
  <section class="section section-muted"><div class="shell"><div class="section-heading"><div><p class="eyebrow">많이 찾는 지역</p><h2>지역별 입주청소·이사청소</h2></div></div><div class="region-links">${featuredRegions.filter((name) => regionMap.has(name)).flatMap((name) => [moveInCleaning, moveOutCleaning].map((category) => `<a href="${hrefForRoute(serviceRoute(category, regionMap.get(name)))}">${escapeHtml(name)} ${escapeHtml(category.name)}</a>`)).join("")}</div></div></section>
  <section class="section shell trust-section"><div><p class="eyebrow">이용 방법</p><h2>복잡한 가입 없이 간단하게</h2></div><ol><li><span>1</span><strong>지역 선택</strong><p>검색창에서 시·구·동 단위 지역을 고릅니다.</p></li><li><span>2</span><strong>업체 비교</strong><p>업체별 설명과 상담 조건을 확인합니다.</p></li><li><span>3</span><strong>외부 상담</strong><p>원하는 업체 버튼을 눌러 직접 견적을 신청합니다.</p></li></ol></section>
</main>`;

  return pageShell({
    title,
    description,
    canonical: `${baseUrl}/`,
    body,
    pageClass: "home-page",
    headExtra: '<meta name="naver-site-verification" content="ed62499587760918eb629eb80e8631291b9c3fdf">',
    structuredData: [
      { "@context": "https://schema.org", "@type": "WebSite", name: config.siteName, url: `${baseUrl}/`, description },
      homeItemList
    ]
  });
}

function categoryPage(category) {
  const canonical = canonicalForRoute(categoryRoute(category));
  if (category.regional) {
    const titleSuffix = cleaningTitleHook(`전국:${category.id}`);
    const title = category.id === "move-in-cleaning"
      ? `전국 입주청소 | ${titleSuffix}`
      : `전국 이사청소 견적 비교 | ${titleSuffix}`;
    const description = `전국 시·구·동별 ${category.name} 제휴업체 4곳의 상담 특징을 비교하고 원하는 지역의 견적 페이지를 확인하세요.`;
    const featured = regions.filter((region) => region.kind !== "dong").slice(0, 36);
    const body = `<main>
      <section class="category-hero"><div class="shell category-hero-grid"><div><p class="eyebrow">${escapeHtml(category.eyebrow)}</p><span class="hero-category-icon" aria-hidden="true">${icons[category.id]}</span><h1>전국 ${escapeHtml(category.name)} 견적 비교</h1><p>${escapeHtml(category.headline)} 지역을 선택하면 업체 4곳의 안내와 직접 연결되는 견적 버튼을 볼 수 있습니다.</p><div id="find">${searchMarkup(category.slug)}</div></div><figure class="category-hero-media"><img src="${categoryImages[category.id]}" alt="${escapeHtml(category.name)} 서비스" width="900" height="720"></figure></div></section>
      <section class="section shell"><div class="section-heading"><div><p class="eyebrow">지역 바로가기</p><h2>${escapeHtml(category.name)} 주요 지역</h2></div></div><div class="region-links">${featured.map((region) => `<a href="${hrefForRoute(serviceRoute(category, region))}">${escapeHtml(region.name)} ${escapeHtml(category.name)}</a>`).join("")}</div></section>
      <section class="section section-muted"><div class="shell narrow"><p class="eyebrow">비교 전 확인하세요</p><h2>${escapeHtml(category.name)} 상담 체크리스트</h2><ol class="check-steps">${category.checklist.map((item, index) => `<li><span>${index + 1}</span><div><strong>${escapeHtml(item)}</strong><p>상담 전에 정리하면 더 정확한 안내를 받는 데 도움이 됩니다.</p></div></li>`).join("")}</ol></div></section>
    </main>`;
    return pageShell({ title, description, canonical, body, pageClass: "category-page", ogImage: `${baseUrl}${categoryImages[category.id]}` });
  }

  const title = `전국 ${category.name} 제휴업체 견적 비교 | ${config.siteName}`;
  const description = `${category.name} 제휴업체 4곳의 상담 특징과 조건을 비교하고 원하는 업체의 견적 페이지를 확인하세요.`;
  const body = `<main>
    <section class="category-hero"><div class="shell category-hero-grid"><div><p class="eyebrow">${escapeHtml(category.eyebrow)}</p><span class="hero-category-icon" aria-hidden="true">${icons[category.id]}</span><h1>${escapeHtml(category.name)} 제휴업체 견적 비교</h1><p>${escapeHtml(category.description)} 아래에서 업체별 특징을 확인하고 원하는 상담 페이지로 이동할 수 있습니다.</p><a class="primary-link" href="#partners">제휴업체 4곳 보기</a></div><figure class="category-hero-media"><img src="${categoryImages[category.id]}" alt="${escapeHtml(category.name)} 서비스" width="900" height="720"></figure></div></section>
    <section id="partners" class="section shell"><div class="section-heading"><div><p class="eyebrow">업체별 상담 조건 확인</p><h2>${escapeHtml(category.name)} 제휴업체 비교</h2></div><p>버튼을 누르면 해당 업체의 견적 신청 페이지가 새 창에서 열립니다.</p></div>${partnerCardsMarkup(category, "전국")}</section>
    ${detailedGuideMarkup(category, { name: "전국" })}
    ${servicePhotoGalleryMarkup(category, "전국")}
    <section class="section section-muted"><div class="shell narrow"><p class="eyebrow">비교 전 확인하세요</p><h2>${escapeHtml(category.name)} 상담 체크리스트</h2><ol class="check-steps">${category.checklist.map((item, index) => `<li><span>${index + 1}</span><div><strong>${escapeHtml(item)}</strong><p>상담 전에 정리하면 더 정확한 안내를 받는 데 도움이 됩니다.</p></div></li>`).join("")}</ol></div></section>
  </main>`;
  return pageShell({ title, description, canonical, body, pageClass: "category-page", ogImage: `${baseUrl}${categoryImages[category.id]}` });
}

function infoPage(type) {
  const isAffiliate = type === "affiliate";
  const title = `${isAffiliate ? "제휴 안내" : "개인정보처리방침"} | ${config.siteName}`;
  const bodyContent = isAffiliate
    ? `<h1>제휴 안내</h1><p>${escapeHtml(config.siteName)}는 생활 서비스 정보를 비교할 수 있도록 외부 업체의 상담 페이지를 안내합니다.</p><h2>제휴 링크 운영</h2><p>페이지의 견적 버튼에는 제휴 링크가 포함될 수 있습니다. 방문자가 링크를 통해 상담을 신청하거나 계약하면 사이트 운영자에게 수수료가 지급될 수 있으며, 방문자에게 별도의 추가 비용이 부과되지는 않습니다.</p><h2>서비스와 조건 확인</h2><p>상품 가격, 할인, 사은품, 서비스 범위와 제공 여부는 각 업체의 정책에 따라 변경될 수 있습니다. 계약 전 연결된 업체에서 최신 조건을 직접 확인하세요.</p>`
    : `<h1>개인정보처리방침</h1><p>${escapeHtml(config.siteName)} 정적 웹사이트는 자체 회원가입, 견적 신청서 또는 방문자 개인정보 저장 기능을 운영하지 않습니다.</p><h2>외부 사이트 이동</h2><p>견적 버튼을 누르면 제휴업체가 운영하는 외부 웹사이트로 이동합니다. 해당 사이트에서 입력하는 정보는 그 업체의 개인정보처리방침에 따라 처리됩니다.</p><h2>기술 정보</h2><p>호스팅 제공자는 보안과 서비스 운영을 위해 일반적인 접속 로그를 처리할 수 있습니다. 자세한 내용은 호스팅 제공자의 정책을 확인하세요.</p>`;
  const route = isAffiliate ? "affiliate-disclosure.html" : "privacy.html";
  return pageShell({ title, description: `${config.siteName}의 ${isAffiliate ? "제휴 링크 운영 원칙" : "개인정보 처리 안내"}입니다.`, canonical: canonicalForRoute(route), body: `<main class="section"><article class="shell prose">${bodyContent}<p class="updated">시행일: ${escapeHtml(config.publishedAt)}</p></article></main>` });
}

async function writeRoute(route, content) {
  const target = path.join(dist, ...route.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

async function countFiles(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    total += entry.isDirectory() ? await countFiles(path.join(directory, entry.name)) : 1;
  }
  return total;
}

function validateData() {
  if (catalog.length !== 6) throw new Error(`카테고리는 6개여야 합니다: ${catalog.length}`);
  if (regionalCategories.length !== 2 || !regionalCategories.every((category) => cleaningCategoryIds.has(category.id))) {
    throw new Error("지역별 생성 대상은 입주청소와 이사청소 2개여야 합니다.");
  }
  if (!regions.length) throw new Error("지역 데이터가 비어 있습니다.");
  if (cleaningTitleHooks.length !== 240 || new Set(cleaningTitleHooks).size !== 240 || cleaningTitleHooks.some((hook) => !hook.includes("입주청소"))) {
    throw new Error("입주청소 제목 후킹 문구 240개가 올바르게 구성되지 않았습니다.");
  }
  const regionNames = new Set();
  for (const region of regions) {
    if (!region.name || regionNames.has(region.name)) throw new Error(`중복 또는 잘못된 지역: ${region.name}`);
    regionNames.add(region.name);
  }
  for (const category of catalog) {
    const guide = detailedGuides[category.id];
    if (!guide || !guide.lead || guide.sections?.length !== 3) throw new Error(`${category.name} 상세 안내 데이터가 올바르지 않습니다.`);
    if (category.partners.length !== 4) throw new Error(`${category.name} 제휴업체가 4개가 아닙니다.`);
    for (const partner of category.partners) {
      if (partner.features.length !== 2) throw new Error(`${partner.name} 설명이 2줄이 아닙니다.`);
      new URL(partner.url);
    }
  }
  if (!Array.isArray(reviewEntries)) throw new Error("후기 데이터는 배열이어야 합니다.");
  const reviewIds = new Set();
  for (const review of reviewEntries) {
    if (!review.id || reviewIds.has(review.id)) throw new Error(`후기 ID가 없거나 중복됩니다: ${review.id || "없음"}`);
    reviewIds.add(review.id);
    if (review.verified !== true) continue;
    if (!regionNameSet.has(review.region)) throw new Error(`검증 후기의 지역이 지역 데이터에 없습니다: ${review.region}`);
    if (!regionalCategories.some((category) => category.id === review.serviceId)) throw new Error(`검증 후기의 서비스가 올바르지 않습니다: ${review.serviceId}`);
    if (!review.displayName || !review.text || !review.usedAt || !review.consentAt || !review.sourceNote) throw new Error(`검증 후기의 필수 정보가 빠졌습니다: ${review.id}`);
    if (String(review.text).length < 30) throw new Error(`검증 후기 문구가 너무 짧습니다: ${review.id}`);
  }
}

async function generateSitemaps(urls) {
  if (urls.length >= 50000) throw new Error(`네이버 사이트맵 URL 제한 초과: ${urls.length}`);
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeXml(url)}</loc><lastmod>${escapeXml(config.publishedAt)}</lastmod></url>`).join("\n")}\n</urlset>\n`;
  const sitemapSize = Buffer.byteLength(sitemapXml, "utf8");
  if (sitemapSize >= 10 * 1024 * 1024) throw new Error(`네이버 사이트맵 10MB 제한 초과: ${sitemapSize} bytes`);
  await writeRoute("sitemap.xml", sitemapXml);
  return 1;
}

function rssBodyForService(category, region) {
  const guide = generateUniqueGuide(category.id, region.name, contentVariants[`${category.id}:${region.name}`] || 0);
  const parts = [
    `${region.name} ${category.name}`,
    category.description,
    ...category.checklist,
    guide.lead,
    ...guide.keypoints,
    ...guide.sections.flatMap((section) => [section.title, section.subtitle || "", ...section.paragraphs]),
    guide.caseExample || "",
    ...category.faqs.flatMap((faq) => [faq.q, faq.a])
  ];
  return parts.filter(Boolean).join("\n\n").replaceAll("{지역}", region.name);
}

async function generateRss(serviceUrls) {
  const latestItems = [];
  const byCategory = regionalCategories.map((category) => serviceUrls.filter((item) => item.category.id === category.id));
  for (let index = 0; latestItems.length < 50; index += 1) {
    let added = false;
    for (const categoryItems of byCategory) {
      if (categoryItems[index]) {
        latestItems.push(categoryItems[index]);
        added = true;
      }
      if (latestItems.length === 50) break;
    }
    if (!added) break;
  }
  const publishedDate = new Date(`${config.publishedAt}T00:00:00+09:00`).toUTCString();
  const items = latestItems.map(({ url, region, category }) => `<item><title>${escapeXml(`${region.name} ${category.name} 견적 비교`)}</title><link>${escapeXml(url)}</link><guid isPermaLink="true">${escapeXml(url)}</guid><pubDate>${publishedDate}</pubDate><description>${escapeXml(rssBodyForService(category, region))}</description></item>`).join("\n");
  await writeRoute("rss.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${escapeXml(config.siteName)}</title><link>${escapeXml(`${baseUrl}/`)}</link><description>${escapeXml(config.tagline)}</description><language>ko</language><lastBuildDate>${publishedDate}</lastBuildDate>${items}</channel></rss>\n`);
}

async function main() {
  validateData();
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await cp(path.join(root, "public"), dist, { recursive: true });

  await writeRoute("index.html", homePage());
  await writeRoute("affiliate-disclosure.html", infoPage("affiliate"));
  await writeRoute("privacy.html", infoPage("privacy"));
  await writeRoute("404.html", pageShell({ title: `페이지를 찾을 수 없습니다 | ${config.siteName}`, description: "요청한 페이지를 찾을 수 없습니다.", canonical: `${baseUrl}/404.html`, body: `<main class="not-found"><div class="shell"><p class="eyebrow">404</p><h1>페이지를 찾을 수 없습니다</h1><p>주소가 바뀌었거나 존재하지 않는 지역·서비스 페이지입니다.</p><a class="primary-link" href="/">홈에서 다시 찾기</a></div></main>` }));

  const sitemapUrls = [`${baseUrl}/`, canonicalForRoute("affiliate-disclosure.html"), canonicalForRoute("privacy.html")];
  const serviceUrls = [];
  for (const category of catalog) {
    await writeRoute(categoryRoute(category), categoryPage(category));
    sitemapUrls.push(canonicalForRoute(categoryRoute(category)));

    if (!category.regional) continue;
    for (let offset = 0; offset < regions.length; offset += 48) {
      const batch = regions.slice(offset, offset + 48);
      await Promise.all(batch.map(async (region) => {
        const route = serviceRoute(category, region);
        await writeRoute(route, servicePage(category, region));
        const url = canonicalForRoute(route);
        sitemapUrls.push(url);
        serviceUrls.push({ url, region, category });
      }));
    }
  }

  await writeRoute("data/regions.json", JSON.stringify({ regions: regions.map((region) => ({ name: region.name, segments: regionSegments(region) })), categories: regionalCategories.map((category) => ({ name: category.name, slug: category.slug })) }));
  const sitemapCount = await generateSitemaps(sitemapUrls);
  await generateRss(serviceUrls);
  await writeRoute("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);

  const expectedServicePages = regions.length * regionalCategories.length;
  if (serviceUrls.length !== expectedServicePages) throw new Error(`서비스 페이지 수 불일치: ${serviceUrls.length} / ${expectedServicePages}`);

  const fileCountBeforeManifest = await countFiles(dist);
  const manifest = {
    siteName: config.siteName,
    baseUrl,
    builtAt,
    regionCount: regions.length,
    categoryCount: catalog.length,
    regionalCategoryCount: regionalCategories.length,
    commonCategoryCount: commonCategories.length,
    partnerCount: catalog.reduce((sum, item) => sum + item.partners.length, 0),
    servicePageCount: serviceUrls.length,
    sitemapUrlCount: sitemapUrls.length,
    sitemapFileCount: sitemapCount,
    outputFileCount: fileCountBeforeManifest + 1,
    warnings: baseUrl.includes("example.com") ? ["배포 전에 site.config.json의 baseUrl을 실제 도메인으로 변경하세요."] : []
  };
  await writeRoute("build-manifest.json", JSON.stringify(manifest, null, 2));

  const finalCount = await countFiles(dist);
  if (finalCount >= 20000) console.warn(`주의: 단일 Cloudflare Pages 프로젝트 파일 한도를 초과할 수 있습니다: ${finalCount}`);
  const stats = await stat(path.join(dist, "index.html"));
  if (!stats.isFile()) throw new Error("홈페이지 생성 실패");
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

await main();
