# Maple Projects

`Maple Character Translation` 실험 기록과 `Maple Chat` 시스템 설명을 하나로 묶은 정적 프로젝트 포트폴리오입니다.

## 페이지

- `/` — 두 프로젝트를 연결하는 포트폴리오 허브
- `/character-translation/` — 이미지 변환 실험 프로토콜, 결과, 샘플 기록
- `/chat/` — 하이브리드 RAG, 지식 그래프, 운영 snapshot, 품질 개선 기록

모든 페이지는 외부 런타임 요청이 없는 순수 HTML/CSS/JavaScript로 구성했습니다. 모델 endpoint,
credential, 원문 corpus와 private runtime은 포함하지 않습니다.

## 로컬 확인

```bash
node scripts/check-site.mjs
python3 -m http.server 4173
```

브라우저에서 <http://localhost:4173>을 엽니다.

## 배포

`main` 브랜치에 push하면 `.github/workflows/pages.yml`이 정적 검사 후 GitHub Pages artifact를 배포합니다.

예상 주소: <https://hyun-s.github.io/Maple_projects_site/>
