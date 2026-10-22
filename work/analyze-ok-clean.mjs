const base = "https://expert.ok-clean.co.kr";
const ua = "Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)";

async function get(url) {
  const response = await fetch(url, { headers: { "user-agent": ua } });
  return { status: response.status, headers: Object.fromEntries(response.headers), text: await response.text() };
}

function decodeHtml(value = "") {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function stripTags(value = "") {
  return decodeHtml(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function visibleText(html) {
  return stripTags(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--([\s\S]*?)-->/g, " ")
  );
}

function firstMatch(html, regex) {
  const match = html.match(regex);
  return match ? stripTags(match[1] ?? match[0]) : "";
}

function allMatches(html, regex) {
  return [...html.matchAll(regex)].map((match) => stripTags(match[1] ?? match[0]));
}

function tokens(text) {
  return text.toLowerCase().match(/[가-힣a-z0-9]+/g) ?? [];
}

function jaccard(a, b) {
  const left = new Set(tokens(a));
  const right = new Set(tokens(b));
  const intersection = [...left].filter((token) => right.has(token)).length;
  return intersection / (left.size + right.size - intersection || 1);
}

function positionalSimilarity(a, b) {
  const left = tokens(a);
  const right = tokens(b);
  const length = Math.max(left.length, right.length, 1);
  let same = 0;
  for (let i = 0; i < Math.min(left.length, right.length); i += 1) if (left[i] === right[i]) same += 1;
  return same / length;
}

function normalizePageText(text, url) {
  const decoded = decodeURIComponent(new URL(url).pathname);
  const parts = decoded.split("/").filter(Boolean).map((part) => part.replace(/\.html$/, ""));
  let normalized = text;
  const replacements = [...new Set([...parts, "사무실청소", "이사청소", "입주청소", "집청소", "청소업체"])].sort((a, b) => b.length - a.length);
  for (const value of replacements) normalized = normalized.split(value).join("{키워드}");
  return normalized;
}

function pageFacts(url, response) {
  const { text: html, status, headers } = response;
  const text = visibleText(html);
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
  const internal = links.filter((href) => href.startsWith("/") || href.startsWith(base));
  const external = links.filter((href) => /^https?:\/\//.test(href) && !href.startsWith(base));
  const hiddenPatterns = [...html.matchAll(/(?:display\s*:\s*none|visibility\s*:\s*hidden|hidden(?:\s|=|>))/gi)].length;
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = decodeHtml(html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1] ?? html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i)?.[1] ?? "");
  const canonical = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] ?? "";
  return {
    url,
    status,
    contentType: headers["content-type"],
    title,
    description,
    canonical,
    h1: allMatches(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi),
    h2: allMatches(html, /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi),
    textChars: text.length,
    textWords: tokens(text).length,
    htmlChars: html.length,
    internalLinks: internal.length,
    uniqueInternalLinks: new Set(internal).size,
    externalLinks: [...new Set(external)],
    jsonLdBlocks: (html.match(/application\/ld\+json/gi) ?? []).length,
    hiddenPatterns,
    text,
    normalizedText: normalizePageText(text, url)
  };
}

const sitemapUrls = [];
for (let i = 1; i <= 13; i += 1) {
  const sitemap = await get(`${base}/sitemap-${i}.xml`);
  sitemapUrls.push(...[...sitemap.text.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => decodeHtml(match[1])));
}

const countsByService = {};
const countsByDepth = {};
for (const url of sitemapUrls) {
  const decoded = decodeURIComponent(new URL(url).pathname);
  const service = decoded.split("/").at(-1)?.replace(".html", "") || "home";
  countsByService[service] = (countsByService[service] ?? 0) + 1;
  const depth = decoded.split("/").filter(Boolean).length;
  countsByDepth[depth] = (countsByDepth[depth] ?? 0) + 1;
}

const requested = [
  `${base}/%EC%B2%AD%EC%86%8C/%ED%99%94%EC%84%B1%EC%8B%9C/%EB%8F%99%ED%83%84%EB%8F%99/%EC%9E%85%EC%A3%BC%EC%B2%AD%EC%86%8C.html`,
  `${base}/%EC%B2%AD%EC%86%8C/%EA%B2%BD%EC%A3%BC%EC%8B%9C/%EA%B0%90%ED%8F%AC%EC%9D%8D/%EC%82%AC%EB%AC%B4%EC%8B%A4%EC%B2%AD%EC%86%8C.html`,
  `${base}/%EC%B2%AD%EC%86%8C/%EA%B5%AC%EB%A1%9C%EA%B5%AC/%ED%95%AD%EB%8F%99/%EC%9D%B4%EC%82%AC%EC%B2%AD%EC%86%8C.html`,
  `${base}/%EC%B2%AD%EC%86%8C/%EC%A4%91%EB%B6%80%EB%8F%99/%EC%9E%85%EC%A3%BC%EC%B2%AD%EC%86%8C.html`
];

const sameRegion = sitemapUrls.filter((url) => decodeURIComponent(url).includes("/가경동/")).slice(0, 5);
const sameService = sitemapUrls.filter((url) => decodeURIComponent(url).endsWith("/입주청소.html")).filter((_, i) => i % 100 === 0).slice(0, 15);
const sampleUrls = [...new Set([...requested, ...sameRegion, ...sameService])];
const pages = [];
for (const url of sampleUrls) pages.push(pageFacts(url, await get(url)));

const baseline = pages.find((page) => page.url === requested[0]);
const comparisons = pages.map((page) => ({
  url: decodeURIComponent(page.url),
  rawJaccard: Number(jaccard(baseline.text, page.text).toFixed(4)),
  normalizedJaccard: Number(jaccard(baseline.normalizedText, page.normalizedText).toFixed(4)),
  rawPositional: Number(positionalSimilarity(baseline.text, page.text).toFixed(4)),
  normalizedPositional: Number(positionalSimilarity(baseline.normalizedText, page.normalizedText).toFixed(4))
}));

const compactPages = pages.map(({ text, normalizedText, ...page }) => ({ ...page, url: decodeURIComponent(page.url) }));
console.log(JSON.stringify({
  sitemapUrlCount: sitemapUrls.length,
  countsByService,
  countsByDepth,
  pages: compactPages,
  comparisons
}, null, 2));
