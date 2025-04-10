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
- `.env` 파일 (개발 환경)
- `.env.production` 파일 (배포 환경)

## 🚀 실행 방법

1. 저장소 클론
```bash
git clone https://github.com/HSU-ThePathWeAreGoingToWalk/device-frontend/tree/geonu
```

2. 환경 변수 설정
```bash
# .env.production 파일 생성
REACT_APP_OPENAI_API_KEY=[openai_api_key]
```

3. Docker Compose로 실행
```bash
docker-compose up --build
```

4. 브라우저에서 접속
http://localhost:80
`
