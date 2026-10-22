import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { generateUniqueGuide, guidePlainText, jaccardSimilarity, wordShingles } from "./unique-content.mjs";

const root = process.cwd();
const regionPayload = JSON.parse(await readFile(path.join(root, "src", "data", "regions.json"), "utf8"));
const regions = Array.isArray(regionPayload) ? regionPayload : regionPayload.regions;
const contentVariants = JSON.parse(await readFile(path.join(root, "src", "data", "content-variants.json"), "utf8"));
const serviceIds = ["move-in-cleaning", "move-out-cleaning"];
const shingleSize = Number(process.env.SIMILARITY_SHINGLE_SIZE) || 5;
const limit = 0.15;
const previous = new Map();
let comparisonCount = 0;
let similaritySum = 0;
let maximum = { score: 0, left: "", right: "" };
let minimumLength = Number.POSITIVE_INFINITY;
const failures = [];

function compare(leftLabel, leftSet, rightLabel, rightSet) {
  const score = jaccardSimilarity(leftSet, rightSet);
  comparisonCount += 1;
  similaritySum += score;
  if (score > maximum.score) maximum = { score, left: leftLabel, right: rightLabel };
  if (score > limit) failures.push(`${leftLabel} <> ${rightLabel}: ${(score * 100).toFixed(2)}%`);
}

for (const region of regions) {
  const current = new Map();
  for (const serviceId of serviceIds) {
    const guide = generateUniqueGuide(serviceId, region.name, contentVariants[`${serviceId}:${region.name}`] || 0);
    const text = guidePlainText(guide);
    minimumLength = Math.min(minimumLength, text.length);
    const shingles = wordShingles(text, shingleSize);
    current.set(serviceId, shingles);
    const prior = previous.get(serviceId);
    if (prior) compare(`${serviceId}:${prior.region}`, prior.shingles, `${serviceId}:${region.name}`, shingles);
    previous.set(serviceId, { region: region.name, shingles });
  }
  compare(`move-in-cleaning:${region.name}`, current.get("move-in-cleaning"), `move-out-cleaning:${region.name}`, current.get("move-out-cleaning"));
}

if (minimumLength < 4500) failures.push(`장문 최소 글자 수 부족: ${minimumLength}`);

const report = {
  ok: failures.length === 0,
  metric: `${shingleSize}어절 연속 묶음 Jaccard`,
  limitPercent: limit * 100,
  regionCount: regions.length,
  comparisonCount,
  averagePercent: Number((similaritySum / comparisonCount * 100).toFixed(2)),
  maximumPercent: Number((maximum.score * 100).toFixed(2)),
  maximumPair: [maximum.left, maximum.right],
  minimumGuideCharacters: minimumLength,
  failureCount: failures.length,
  failures: failures.slice(0, 30)
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
