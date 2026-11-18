# 길이음

출발지와 도착지를 검색해 자동차 이동 거리와 예상 시간을 확인하는 정적 웹앱입니다.

## 실행 및 배포

정적 웹 서버에서 실행할 수 있습니다. GitHub에 저장소를 만든 뒤 Vercel에서 저장소를 Import하면 별도의 빌드 명령, Redis, API 키 또는 환경 변수를 설정하지 않고 배포할 수 있습니다.

## 데이터 제공처

- 장소 검색: [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/)
- 자동차 경로: [OSRM demo server](https://router.project-osrm.org/)
- 지도 타일: [OpenStreetMap](https://www.openstreetmap.org/) · 지도 표시: [Leaflet](https://leafletjs.com/)

장소 검색은 입력할 때마다 자동 요청하지 않고 사용자가 검색 버튼을 눌렀을 때만 실행됩니다. 브라우저 내 요청을 순차화해 검색 요청 간격을 둡니다. 무료 공개 서비스이므로 이용 정책, 사용량 제한 및 가용성에 따라 응답이 달라질 수 있습니다.

경로가 계산되면 결과 아래에 지도가 표시됩니다. 지도 위의 `크게 보기` 버튼으로 확대할 수 있으며, 경로 지도 타일은 OpenStreetMap 공개 서버에서 불러옵니다.
