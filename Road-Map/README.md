# 🚌 고흥시 버스정류장 길찾기 서비스

고흥시 버스정류장에서 원하는 목적지까지의 경로를 찾아주는 웹 서비스입니다.

## 🌟 주요 기능

### 1. 음성으로 목적지 검색
- 음성 인식을 통한 자연스러운 목적지 검색
- OpenAI를 활용한 자연어 처리로 정확한 의도 파악

### 2. 지도 기반 경로 안내
- Kakao Maps API를 활용한 실시간 지도 표시
- 현재 위치에서 목적지까지의 최적 경로 제공
- 주요 경유지 정보 표시

### 3. 사용자 친화적 인터페이스
- 반응형 디자인으로 모바일/데스크톱 모두 지원
- 직관적인 UI로 누구나 쉽게 사용 가능

## 🛠 기술 스택

### 프론트엔드
- React.js
- TypeScript
- Kakao Maps API
- OpenAI API

### 배포
- Docker
- Nginx

## 📋 요구사항
- Docker 및 Docker Compose
- OpenAI API Key
- Kakao Maps API Key

## 🚀 실행 방법

1. 저장소 클론
```bash
git clone https://github.com/your-username/Road-Map.git
```

2. 환경 변수 설정
```bash
# .env.production 파일 생성
REACT_APP_OPENAI_API_KEY=your_openai_api_key
```

3. Docker Compose로 실행
```bash
docker-compose up --build
```

4. 브라우저에서 접속
`
