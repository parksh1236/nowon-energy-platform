# 노원구 에너지정보플랫폼 — Claude 작업 가이드

## 프로젝트 개요

건축물대장(총괄표제부·표제부) × 월별 전기·가스 사용량을 지번주소로 매칭해
카카오지도에 시각화하는 정적 웹 플랫폼.

- **배포**: GitHub Pages → https://parksh1236.github.io/nowon-energy-platform/
- **저장소**: https://github.com/parksh1236/nowon-energy-platform
- **데이터 기간**: 2024.01 ~ 2026.03 (27개월), 5개 법정동(공릉·상계·월계·중계·하계)

## 파일 구조

```
nowon1/
├── 01.전기에너지_*.json       ← 원본: 월별 전기 사용량 (kWh)
├── 02. 가스에너지_*.json      ← 원본: 월별 가스 사용량 (MJ)
├── 02. 총괄표제부_*.json      ← 원본: 총괄표제부 (용도·면적, 다동 건물)
├── 03. 표제부_*.json          ← 원본: 일반건축물대장 표제부 (주용도·건물명)
├── index.html                 ← 루트 → platform/ 리다이렉트
└── platform/
    ├── index.html             ← 단일 파일 웹앱 (지도+필터+통계+검색, 전체 로직)
    ├── build_data.py          ← 원본 JSON → data.json 통합 스크립트
    ├── data.json              ← 빌드 결과 (건물별 용도·면적·월별 사용량)
    ├── coords.json            ← 지오코딩 캐시 (주소→위경도)
    └── nowon_boundary.json    ← 노원구 경계 폴리곤
```

## 핵심 규칙

- **주소 매칭 키**: 지번주소 정규화(`'번지' 제거, 공백 정리`) — build_data.py의 `norm_addr()`
- **중복 방지**: 에너지 레코드는 (주소, 년월, SN) 키로 파일 간 중복 제거 → 같은 자료를 여러 번 넣어도 안전
- **용도 우선순위**: 총괄표제부 > 일반표제부(주건축물 행 우선). 표제부는 기존 주소에만 보강(새 주소 생성 안 함)
- **카카오 JS 키**: index.html 상단 `KAKAO_KEY`. 도메인 등록 필요:
  `http://localhost:8000`, `https://parksh1236.github.io` (developers.kakao.com → 앱 → 플랫폼 키 → JavaScript 키)

## 데이터 업데이트 절차

1. 새 원본 JSON을 저장소 루트에 넣는다 (파일명 패턴 유지)
2. `python3 platform/build_data.py` 실행 → data.json 재생성, 매칭 통계 출력 확인
3. 로컬 서버 실행: `python3 -m http.server 8000 --directory platform`
4. 브라우저에서 열면 **새 주소만** 자동 지오코딩됨 (진행률 표시, localStorage 캐시)
5. 완료 후 사이드바 하단 **"📥 좌표 캐시 내보내기"** 버튼 → 내려받은 coords.json으로 `platform/coords.json` 교체
6. `git add -A && git commit && git push` → GitHub Pages 자동 배포 (약 1분)

## 개발 시 주의

- index.html 수정 후 브라우저 확인 시 **캐시 주의** — `?v=타임스탬프` 쿼리로 강제 새로고침
- 지도 마커: 반지름 11m 고정 원, 사용량은 5분위 색상(파랑→빨강), 사용량 없는 표제부 건물은 회색
- 사용 년월 선택: 연도+월 드롭다운, 월에 "전체(연간 합계)" 옵션 있음 (`state.month`가 4자리면 연간)
- 용도 필터: 체크박스 다중 선택 (`state.usages` Set)
- 검색: 데이터 내 검색 + 카카오 장소검색(Places) 병행, 장소 주소를 데이터와 자동 매칭
