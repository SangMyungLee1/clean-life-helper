const serviceProfiles = {
  "move-in-cleaning": {
    service: "입주청소",
    label: "입주 전 공간 점검과 청소 안내",
    issues: ["공사 미세분진", "창틀 홈의 톱밥", "보양 비닐과 테이프 흔적", "수납장 안쪽 가루", "몰딩 위 잔여 먼지", "타일 표면의 백시멘트 흔적", "실리콘 주변 잔여물", "문틀 상단의 분진", "바닥 모서리의 공사 가루", "환기구 주변 먼지", "붙박이장 경첩 주변 분진", "베란다 배수구의 공사 잔여물"],
    timings: ["하자 보수가 끝난 뒤", "가구가 들어오기 전", "입주일보다 하루 이상 여유를 두고", "도배·필름 작업이 마무리된 다음", "새 가전 설치 일정을 피해서", "환기 시간을 확보할 수 있는 날", "인테리어 최종 검수 이후", "열쇠를 인수한 다음 빈집 상태에서"],
    cautions: ["새 자재 표면은 강한 약품에 민감할 수 있습니다", "분진은 마른 상태에서 흩날릴 수 있습니다", "보양재 제거 흔적은 재질마다 처리 방법이 다릅니다", "하자 보수 전 청소하면 같은 구역을 다시 닦을 수 있습니다", "외창은 안전 문제로 기본 범위에서 빠질 수 있습니다", "새 가구 내부도 설치 과정에서 먼지가 다시 생길 수 있습니다", "실리콘과 코팅 표면은 도구 선택을 확인해야 합니다", "공용부 분진이 실내로 다시 들어올 수 있습니다"]
  },
  "move-out-cleaning": {
    service: "이사청소",
    label: "이사 전후 생활 오염 청소 안내",
    issues: ["주방 후드 주변의 기름때", "욕실 타일과 수전의 물때", "창틀에 쌓인 생활 먼지", "결로가 있었던 모서리의 곰팡이", "수납장 안쪽의 사용 흔적", "싱크대 하부의 눌어붙은 오염", "배수구 주변의 찌든 때", "바닥 가장자리의 묵은 먼지", "문손잡이와 스위치 주변 손때", "베란다 바닥의 생활 오염", "가전 뒤편에 쌓인 먼지", "반려동물 생활 공간의 털과 냄새"],
    timings: ["기존 짐을 모두 뺀 뒤", "새 입주자가 들어오기 전", "이삿짐 반출과 같은 날이라면 시간을 나눠서", "폐기물 정리가 끝난 다음", "가전 철거가 완료된 뒤", "바닥이 마를 시간을 남겨두고", "열쇠 인계 시각을 고려해서", "관리실 작업 가능 시간을 확인한 뒤"],
    cautions: ["오래된 표면은 강한 약품에 변색될 수 있습니다", "곰팡이 착색은 일반 세척만으로 남을 수 있습니다", "짐이 남아 있으면 가려진 구역은 작업하기 어렵습니다", "후드와 가전 내부는 기본 범위에서 빠질 수 있습니다", "폐기물 처리는 청소와 별도 항목일 수 있습니다", "심한 기름때는 현장 상태에 따라 시간이 늘어날 수 있습니다", "결로 원인이 남아 있으면 곰팡이가 다시 생길 수 있습니다", "노후 실리콘의 변색은 청소로 복원되지 않을 수 있습니다"]
  }
};

const spaces = ["창틀과 창호 레일", "주방 상·하부장", "욕실과 배수구", "현관과 신발장", "베란다와 다용도실", "붙박이장과 수납 선반", "문과 몰딩", "바닥과 걸레받이", "환기구와 조명 주변", "싱크대와 후드 외부", "세탁실과 배관 주변", "방문 손잡이와 스위치"];
const actions = ["먼지를 위에서 아래 순서로 제거하는 작업", "재질에 맞는 도구로 표면을 닦는 과정", "모서리와 틈새를 나누어 점검하는 작업", "탈거 가능한 부품의 범위를 확인하는 과정", "마른 먼지를 먼저 회수하고 물청소를 진행하는 순서", "눈에 잘 띄지 않는 선반 위쪽까지 확인하는 작업", "오염이 번지지 않도록 도구를 구역별로 나누는 방식", "세정제 잔여물이 남지 않도록 다시 닦는 과정", "작업 전후 사진으로 상태를 비교하는 절차", "환기와 건조 시간을 포함한 마무리 작업", "오염 유형에 따라 세척 강도를 조절하는 과정", "작업자와 고객이 함께 최종 상태를 확인하는 절차"];
const questions = ["기본 견적에 포함되는 구역", "별도 비용이 생기는 오염 기준", "예상 작업 인원과 소요 시간", "외창과 방충망 탈거 가능 여부", "수납장 내부 작업 포함 여부", "주차비와 장비 사용료 부담 주체", "보완 작업 접수 가능 기간", "사용하는 세제와 환기 방법", "사진 상담과 현장 확인의 차이", "평수 산정이 공급면적인지 전용면적인지", "폐기물과 스티커 제거의 포함 여부", "작업 완료 후 검수 방식"];
const evidence = ["전체가 보이는 사진과 가까이 찍은 사진", "방·욕실 개수와 공급면적", "오염이 심한 구역의 위치", "주차와 엘리베이터 이용 조건", "희망 작업일과 입주 또는 퇴거 시각", "베란다·다용도실의 유무", "남아 있는 짐과 설치된 가전 목록", "인테리어 또는 하자 보수 일정", "특히 원하는 작업 구역의 목록", "관리실 출입과 작업 가능 시간", "반려동물·영유아가 사용하는 공간", "추가 작업이 필요해 보이는 표면 재질"];
const outcomes = ["업체별 안내를 같은 기준으로 비교하기 쉬워집니다", "현장에서 범위가 달라지는 일을 줄이는 데 도움이 됩니다", "작업 당일의 시간 배분을 더 정확하게 잡을 수 있습니다", "포함 작업과 제외 작업을 구분하기 수월합니다", "예상하지 못한 추가비용을 확인하는 데 유리합니다", "검수할 위치를 미리 정리할 수 있습니다", "상담 내용이 서로 다를 때 차이를 찾기 쉬워집니다", "입주나 이사 일정과 충돌할 가능성을 낮출 수 있습니다", "필요한 작업만 요청하는 데 도움이 됩니다", "사진 상담의 정확도를 높일 수 있습니다", "작업 후 보완 요청 기준을 분명하게 만들 수 있습니다", "가족 구성에 맞는 관리 방법을 선택하기 좋습니다"];
const transitions = ["먼저", "상담을 시작할 때", "범위를 정하기 전에", "일정을 잡는 과정에서는", "업체별 조건을 비교할 때", "작업 당일을 준비하면서", "최종 신청 전에는", "현장 사진을 전달할 때", "비용을 확인하는 단계에서", "검수 기준을 정할 때", "작업 순서를 논의하면서", "마지막 확인 과정에서는"];
const actionBeginnings = ["표면을 구역별로 나누어", "먼지를 위쪽부터 차례로", "재질에 맞는 도구로", "틈과 넓은 면을 구분해", "마른 오염을 먼저 회수한 뒤", "오염이 번지지 않도록", "손이 닿기 어려운 곳부터", "밝은 조명으로 상태를 보며", "사진에 표시한 위치를 따라", "세정 강도를 조금씩 조절해", "환기 시간을 중간에 두고", "완료 상태를 함께 보면서"];
const actionEndings = ["닦는 순서", "점검하는 작업", "마무리하는 방식", "세척하는 과정", "도구를 바꾸는 기준", "범위를 확인하는 절차", "오염을 회수하는 방법", "표면을 보호하는 과정", "작업 전후를 대조하는 절차", "잔여물을 살피는 순서", "건조 상태를 보는 방법", "보완 지점을 찾는 과정"];
const questionBeginnings = ["기본 견적에 적힌", "신청 전에 정할", "사진 상담으로 확인할", "현장에서 달라질", "작업자와 맞춰볼", "업체마다 구분하는", "별도 비용과 연결된", "완료 뒤 적용되는", "안전 때문에 제한될", "시간 계산에 반영될", "고객이 직접 검수할", "상담 기록에 남길"];
const questionEndings = ["포함 구역", "제외 조건", "추가 항목", "작업 기준", "보완 범위", "예상 시간", "비용 조건", "확인 순서", "도구 사용법", "담당자 설명", "접수 방법", "완료 기준"];
const factBeginnings = ["공간 전체가 보이는", "오염 부분을 가까이 찍은", "방과 욕실 수를 적은", "희망 날짜를 표시한", "남은 짐을 구분한", "주차 조건을 정리한", "작업 희망 구역을 표시한", "보수 일정을 함께 적은", "표면 재질을 알아볼 수 있는", "관리실 시간을 기록한", "반려동물 공간을 구분한", "추가 요청을 목록으로 만든"];
const factEndings = ["현장 사진", "상담 메모", "간단한 목록", "일정 정보", "공간 자료", "확인 내용", "작업 요청서", "위치 표시", "조건 정리", "비교 항목", "사전 기록", "검수 목록"];
const outcomeBeginnings = ["업체 설명 사이의", "현장 추가 안내의", "작업 당일 생길", "포함 범위에 관한", "일정 조정 과정의", "검수 단계에서의", "사진 상담 내용의", "비용 안내 사이의", "보완 요청에 관한", "공간별 작업의", "신청 조건 사이의", "가족이 확인할"];
const outcomeEndings = ["차이가 선명해집니다", "혼선을 줄일 수 있습니다", "누락을 찾기 쉬워집니다", "기준을 맞출 수 있습니다", "순서를 정하기 편해집니다", "질문이 구체적으로 바뀝니다", "비교가 간단해집니다", "예상 범위가 또렷해집니다", "기록을 남기기 쉬워집니다", "확인 시간이 줄어듭니다", "선택 근거가 분명해집니다", "마무리가 수월해집니다"];
const cautionBeginnings = ["표면이 오래되었다면", "오염이 굳어 있다면", "공사가 아직 남았다면", "외부 창을 요청한다면", "짐이 일부 남았다면", "약품 냄새에 민감하다면", "실리콘이 낡았다면", "코팅면을 다룬다면", "폐기물이 함께 있다면", "작업 시간이 촉박하다면", "곰팡이 착색이 심하다면", "공용부 먼지가 많다면"];
const cautionEndings = ["도구 선택이 중요합니다", "작업 범위가 달라질 수 있습니다", "재작업 가능성을 살펴야 합니다", "안전 조건부터 물어야 합니다", "가려진 구역을 구분해야 합니다", "환기 시간을 확보해야 합니다", "복원 한계를 확인해야 합니다", "세정 강도를 조절해야 합니다", "처리 비용을 따로 봐야 합니다", "우선순위를 먼저 정해야 합니다", "제거와 변색을 구분해야 합니다", "실내 유입을 막아야 합니다"];

const topics = [
  ["현장 상태 설명", "오염 위치 전달"],
  ["공간별 작업 범위", "구역 나누기"],
  ["견적 조건 비교", "포함 범위 읽기"],
  ["청소 일정과 순서", "시간 배치"],
  ["주방·수납공간 점검", "선반 확인"],
  ["욕실·배수구 확인", "물 사용 구역"],
  ["창틀·베란다 범위", "안전과 탈거"],
  ["추가비용 조건", "별도 항목 찾기"],
  ["작업 후 검수", "모서리 확인"],
  ["보완 요청 기록", "합의 내용 남기기"]
];

function hash(value) {
  let result = 2166136261;
  for (const character of String(value)) {
    result ^= character.codePointAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function choice(items, seed, salt) {
  return items[hash(`${seed}:${salt}`) % items.length];
}

function pairedChoice(left, right, seed, salt) {
  const index = hash(`${seed}:${salt}`) % Math.min(left.length, right.length);
  return `${left[index]} ${right[index]}`;
}

function hasBatchim(value) {
  const characters = [...String(value).trim()];
  const code = characters.at(-1)?.codePointAt(0) || 0;
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

function withParticle(value, consonantForm, vowelForm) {
  return `${value}${hasBatchim(value) ? consonantForm : vowelForm}`;
}

function withDirectionalParticle(value) {
  const characters = [...String(value).trim()];
  const code = characters.at(-1)?.codePointAt(0) || 0;
  const finalIndex = code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 : 0;
  return `${value}${finalIndex === 0 || finalIndex === 8 ? "로" : "으로"}`;
}

function locationPhrase(regionName, seed, salt) {
  const parts = regionName.split(/\s+/);
  const local = parts.at(-1);
  const parent = parts.length > 1 ? parts.slice(0, -1).join(" ") : regionName;
  return choice([regionName, `${local} 일대`, `${parent} 안의 ${local} 주택`, `${local} 현장`, `${local}의 이 공간`, `${regionName} 상담 대상 주택`, `${local} 작업 예정 공간`, `${parent} ${local}에서 확인 중인 집`], seed, salt);
}

function sentence(profile, regionName, seed, index) {
  const location = locationPhrase(regionName, seed, `location-${index}`);
  const space = choice(spaces, seed, `space-${index}`);
  const issue = choice(profile.issues, seed, `issue-${index}`);
  const action = `${choice(actionBeginnings, seed, `action-a-${index}`)} ${choice(actionEndings, seed, `action-b-${index}`)}`;
  const question = `${choice(questionBeginnings, seed, `question-a-${index}`)} ${choice(questionEndings, seed, `question-b-${index}`)}`;
  const fact = `${choice(factBeginnings, seed, `fact-a-${index}`)} ${choice(factEndings, seed, `fact-b-${index}`)}`;
  const outcome = pairedChoice(outcomeBeginnings, outcomeEndings, seed, `outcome-${index}`);
  const transition = choice(transitions, seed, `transition-${index}`);
  const timing = choice(profile.timings, seed, `timing-${index}`);
  const caution = pairedChoice(cautionBeginnings, cautionEndings, seed, `caution-${index}`);
  const spaceTopic = withParticle(space, "은", "는");
  const issueObject = withParticle(issue, "을", "를");
  const issueSubject = withParticle(issue, "이", "가");
  const issueAnd = withParticle(issue, "과", "와");
  const factObject = withParticle(fact, "을", "를");
  const questionObject = withParticle(question, "을", "를");
  const actionSubject = withParticle(action, "이", "가");
  const actionObject = withParticle(action, "을", "를");
  const actionAnd = withParticle(action, "과", "와");
  const questionAnd = withParticle(question, "과", "와");
  const templates = [
    `${transition}, ${location}의 ${spaceTopic} ${issue}부터 봅니다. ${actionAnd} ${questionObject} 이어 확인하면 ${outcome}.`,
    `${location} ${profile.service} 일정은 ${timing} 잡아보세요. ${space}에서 ${issueObject} 찾았다면 ${factObject} 남기고 ${action}도 물어야 합니다.`,
    `${caution}. 그래서 ${location}의 ${space}에서는 ${actionAnd} ${questionObject} 나란히 비교하는 편이 좋습니다.`,
    `${factObject} 정리하고 ${questionObject} 업체마다 물어보세요. ${location} ${space}에 맞는 ${actionSubject} 드러나 ${outcome}.`,
    `${location}에서 총액만 보면 ${space}에서 확인한 ${issueObject} 놓치기 쉽습니다. ${questionAnd} ${actionObject} 적어 두면 ${outcome}.`,
    `${timing} 진행하려면 ${space} 주변을 비워 두세요. ${factObject} 전달하고 “${caution}”라는 점도 고려해야 합니다.`,
    `${space} 검수는 ${issueSubject} 남기 쉬운 모서리부터 살펴보세요. ${location} 기록에 ${withParticle(question, "이", "가")} 있으면 ${outcome}.`,
    `${transition}, ${action}의 구역을 표시하고 ${withDirectionalParticle(fact)} 범위를 맞춰보세요. ${location} 조건을 설명하면 ${question}의 답도 비교하기 편합니다.`,
    `${caution}. 이런 경우 ${spaceTopic} ${actionObject} 구분해야 합니다. ${location}에서는 ${issue} 사진과 ${questionObject} 함께 보내세요.`,
    `${location} ${profile.service}를 확정하기 전에 ${timing} 가능한지 보세요. ${space}에서 본 ${issueAnd} ${questionObject} 정리하면 ${outcome}.`,
    `${fact}만 준비해도 기준이 분명해집니다. ${space} 관련 ${issue}, ${action}, ${question} 항목을 차례로 확인하면 ${outcome}.`,
    `${transition}, ${space}에서 ${issue} 제거 범위를 물어보세요. “${caution}”라는 답을 들었다면 ${question}도 기록하는 것이 좋습니다.`
  ];
  return choice(templates, seed, `template-${index}`);
}

export function generateUniqueGuide(categoryId, regionName, variant = 0) {
  const profile = serviceProfiles[categoryId];
  if (!profile) return null;
  const baseSeed = `${categoryId}:${regionName}:longform-v2`;
  const seed = variant ? `${baseSeed}:variant-${variant}` : baseSeed;
  const orderedTopics = [...topics]
    .map((topic, index) => ({ topic, order: hash(`${seed}:topic:${index}`) }))
    .sort((a, b) => a.order - b.order)
    .map(({ topic }) => topic)
    .slice(0, 6);
  let sentenceIndex = 0;
  const sections = orderedTopics.map(([title, subtitle], sectionIndex) => {
    const paragraphs = Array.from({ length: 2 }, () => {
      const paragraph = Array.from({ length: 3 }, () => sentence(profile, regionName, `${seed}:${sectionIndex}`, sentenceIndex++)).join(" ");
      return paragraph;
    });
    return { title, subtitle, paragraphs };
  });
  const lead = `${sentence(profile, regionName, `${seed}:lead-a`, 701)} ${sentence(profile, regionName, `${seed}:lead-b`, 702)}`;
  const keypoints = [
    `${choice(factBeginnings, seed, "key-1a")} ${choice(factEndings, seed, "key-1b")}`,
    `${choice(questionBeginnings, seed, "key-2a")} ${choice(questionEndings, seed, "key-2b")}`,
    `${choice(actionBeginnings, seed, "key-3a")} ${choice(actionEndings, seed, "key-3b")}`
  ];
  const caseExample = `상담 사례 예시입니다. ${sentence(profile, regionName, `${seed}:case`, 801)} 이 문단은 실제 이용 후기가 아닌 가정형 안내이며, 실제 조건과 결과는 연결된 업체에서 확인해야 합니다.`;
  return { label: profile.label, lead, keypoints, sections, caseExample };
}

export function guidePlainText(guide) {
  if (!guide) return "";
  return [guide.lead, ...guide.keypoints, ...guide.sections.flatMap((section) => [section.title, section.subtitle, ...section.paragraphs]), guide.caseExample].join(" ");
}

export function wordShingles(text, size = 5) {
  const words = String(text).replace(/[^0-9A-Za-z가-힣\s]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const shingles = new Set();
  for (let index = 0; index <= words.length - size; index += 1) shingles.add(words.slice(index, index + size).join(" "));
  return shingles;
}

export function jaccardSimilarity(left, right) {
  if (!left.size && !right.size) return 1;
  let intersection = 0;
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  for (const value of small) if (large.has(value)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}
