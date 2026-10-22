import { readFileSync } from "node:fs";

const samples = [
  ["서울 관악구 신림동", "dist/입주이사청소/서울/관악구/신림동.html"],
  ["수원 영통구 매탄동", "dist/입주이사청소/수원/영통구/매탄동.html"],
  ["세종 고운동", "dist/입주이사청소/세종/고운동.html"]
];

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/giu, " ")
    .replace(/<style[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&[^;]+;/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

const pages = samples.map(([name, file]) => {
  const html = readFileSync(file, "utf8");
  const text = visibleText(html);
  const guide = visibleText(html.match(/<details class="detail-guide">([\s\S]*?)<\/details>/u)?.[1] ?? "");
  return {
    name,
    title: html.match(/<title>(.*?)<\/title>/u)?.[1],
    text,
    normalized: text.split(name).join("{지역}"),
    guide,
    normalizedGuide: guide.split(name).join("{지역}")
  };
});

console.log(pages.map(({ name, title, text }) => ({ name, title, visibleCharacters: text.length })));
for (const page of pages.slice(1)) {
  let same = 0;
  const length = Math.min(pages[0].normalized.length, page.normalized.length);
  for (let index = 0; index < length; index += 1) {
    if (pages[0].normalized[index] === page.normalized[index]) same += 1;
  }
  console.log({
    comparison: `${pages[0].name} ↔ ${page.name}`,
    positionalSimilarity: `${(same / Math.max(pages[0].normalized.length, page.normalized.length) * 100).toFixed(2)}%`,
    exactlyEqualAfterRegionReplacement: pages[0].normalized === page.normalized,
    guideCharacters: [pages[0].guide.length, page.guide.length],
    guideExactlyEqualAfterRegionReplacement: pages[0].normalizedGuide === page.normalizedGuide
  });
}
