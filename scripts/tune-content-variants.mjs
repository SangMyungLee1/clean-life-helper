import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { generateUniqueGuide, guidePlainText, jaccardSimilarity, wordShingles } from "./unique-content.mjs";

const root = process.cwd();
const regionPayload = JSON.parse(await readFile(path.join(root, "src", "data", "regions.json"), "utf8"));
const regions = Array.isArray(regionPayload) ? regionPayload : regionPayload.regions;
const serviceIds = ["move-in-cleaning", "move-out-cleaning"];
const shingleSize = 5;
const target = 0.145;
const maxVariant = 500;
const variants = {};
const previous = new Map();
let changedPages = 0;
let attemptedCandidates = 0;
let acceptedComparisons = 0;
let similaritySum = 0;
let maximumAccepted = 0;

function makeCandidate(serviceId, regionName, variant) {
  const guide = generateUniqueGuide(serviceId, regionName, variant);
  return wordShingles(guidePlainText(guide), shingleSize);
}

for (const region of regions) {
  const current = new Map();
  for (const serviceId of serviceIds) {
    let selected = null;
    for (let variant = 0; variant <= maxVariant; variant += 1) {
      attemptedCandidates += 1;
      const shingles = makeCandidate(serviceId, region.name, variant);
      const comparisons = [];
      const prior = previous.get(serviceId);
      if (prior) comparisons.push(jaccardSimilarity(prior.shingles, shingles));
      if (serviceId === "move-out-cleaning") comparisons.push(jaccardSimilarity(current.get("move-in-cleaning"), shingles));
      if (comparisons.every((score) => score <= target)) {
        selected = { variant, shingles, comparisons };
        break;
      }
    }
    if (!selected) throw new Error(`${serviceId}:${region.name}에서 ${maxVariant}개 조합 안에 기준을 만족하지 못했습니다.`);
    if (selected.variant > 0) {
      variants[`${serviceId}:${region.name}`] = selected.variant;
      changedPages += 1;
    }
    for (const score of selected.comparisons) {
      acceptedComparisons += 1;
      similaritySum += score;
      maximumAccepted = Math.max(maximumAccepted, score);
    }
    current.set(serviceId, selected.shingles);
    previous.set(serviceId, { region: region.name, shingles: selected.shingles });
  }
}

await writeFile(path.join(root, "src", "data", "content-variants.json"), `${JSON.stringify(variants, null, 2)}\n`, "utf8");

process.stdout.write(`${JSON.stringify({
  ok: true,
  metric: `${shingleSize}어절 연속 묶음 Jaccard`,
  targetPercent: Number((target * 100).toFixed(2)),
  regionCount: regions.length,
  pageCount: regions.length * serviceIds.length,
  changedPages,
  attemptedCandidates,
  acceptedComparisons,
  averageAcceptedPercent: Number((similaritySum / acceptedComparisons * 100).toFixed(2)),
  maximumAcceptedPercent: Number((maximumAccepted * 100).toFixed(2))
}, null, 2)}\n`);
