# 생활견적365

전국 4,983개 지역에 입주청소와 이사청소를 각각 분리해 9,966개의 정적 비교 페이지를 생성하는 프로젝트입니다. 이사·인터넷 가입·정수기 렌탈·렌터카는 각각 하나의 공통 제휴 비교 페이지로 제공합니다.

## 구조

- `src/data/catalog.json`: 6개 서비스와 제휴업체 데이터
- `src/data/guides.json`: 서비스별 상세 안내
- `src/data/content-variants.json`: 유사도 기준을 넘은 문서의 대체 조합 시드
- `src/data/reviews.json`: 게시 동의까지 확인된 실제 후기
- `src/data/review-entry.example.json`: 실제 후기 입력 형식 예시
- `src/data/regions.json`: 중복 제거된 4,983개 지역
- `scripts/sync-regions.mjs`: 공식 행정동·법정동 데이터와 생활권 시드 통합
- `scripts/build.mjs`: HTML, 사이트맵, RSS 생성
- `scripts/tune-content-variants.mjs`: 5어절 유사도 15% 미만이 되도록 문장 조합 시드 자동 조정
- `scripts/verify.mjs`: 페이지 수, 내부 링크, 제휴 버튼과 필수 자산 검증
- `scripts/verify-similarity.mjs`: 장문 원고 길이와 5어절 연속 묶음 유사도 검증
- `public/`: 공통 CSS·검색 코드·이미지·Cloudflare 헤더
- `dist/`: 배포 결과물
- `PROJECT_STATUS.md`: 작업 현황과 다음 단계

## 지역 페이지

```text
/입주청소/서울/관악구/신림동.html
/이사청소/서울/관악구/신림동.html
```

입주청소와 이사청소는 제목, 소개문, 체크리스트, FAQ와 장문 상세 안내가 서로 다릅니다.

## 빌드

Node.js 20 이상에서 실행합니다.

```bash
npm run tune:similarity
npm run build
npm run verify
npm run verify:similarity
npm run serve
```

PowerShell 실행 정책으로 `npm.ps1`이 차단되면 다음 명령을 사용할 수 있습니다.

```powershell
node scripts/tune-content-variants.mjs
node scripts/build.mjs
node scripts/verify.mjs
node scripts/verify-similarity.mjs
node scripts/serve.mjs
```

## 배포 전 필수 설정

1. `site.config.json`의 `baseUrl`을 실제 서브도메인 주소로 변경합니다.
2. 전체 빌드와 검증을 다시 실행합니다.
3. GitHub 저장소에 올립니다.
4. Cloudflare Pages에서 빌드 명령을 `npm run build`, 출력 디렉터리를 `dist`로 지정합니다.
5. 배포 후 `sitemap.xml`, `rss.xml`, 대표 지역 페이지를 확인합니다.

최신 결과물은 10,030개 파일이며 자동 검증을 통과했습니다. 견적 버튼은 내부 추적 주소를 거치지 않고 외부 제휴 링크로 직접 연결됩니다.

장문은 페이지별 약 5,000자이며 14,947개 비교쌍에서 5어절 Jaccard 평균 12.23%, 최대 14.50%로 검사되었습니다. 이는 프로젝트 내부 문자열 검사값이며 네이버의 중복문서 판정을 보장하는 수치는 아닙니다.

실제 후기는 `reviews.json`에 원문·이용일·동의일·확인 기록을 입력하고 `verified`를 `true`로 바꾼 경우에만 노출됩니다. 확인 전 문구는 실제 후기로 게시하지 않습니다.
