import { createHash } from "node:crypto";

const url = "https://expert.ok-clean.co.kr/%EC%B2%AD%EC%86%8C/%ED%99%94%EC%84%B1%EC%8B%9C/%EB%8F%99%ED%83%84%EB%8F%99/%EC%9E%85%EC%A3%BC%EC%B2%AD%EC%86%8C.html";
const agents = {
  yeti: "Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)",
  chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
  curl: "curl/8.14.1"
};

function clean(value = "") {
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
}

function extract(html, regex) {
  return clean(html.match(regex)?.[1] ?? "");
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

const results = [];
for (const [agentName, userAgent] of Object.entries(agents)) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, { headers: { "user-agent": userAgent } });
    const html = await response.text();
    const text = clean(html);
    results.push({
      agentName,
      attempt,
      status: response.status,
      htmlChars: html.length,
      textChars: text.length,
      htmlHash: digest(html),
      textHash: digest(text),
      title: extract(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
      h1: extract(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i),
      description: html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? "",
      cache: response.headers.get("x-vercel-cache"),
      age: response.headers.get("age")
    });
  }
}

console.log(JSON.stringify(results, null, 2));
