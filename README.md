# 사용자 페이지
고흥군 버스 정류장을 이용하는 사람들이 직면하게 되는 화면입니다.

## 주요 기능
- 대화 시작을 누르거나 정류장에 감지되는 인원이 0 -> n명이 되는 경우 챗봇이 대화를 시작
- 음소거 버튼을 누르면 챗봇의 음성이 음소거 처리가 됨
- 가운데 박스에 챗봇과 사용자의 대화가 텍스트로 나타남
- 버스 정류장에서 도움이 필요한 경우, 관리자 호출 버튼을 눌러 관리자와 연락을 할 수 있음
- 버스 도착 정보를 통해 정류장에 도착하는 버스가 몇 정거장 남았는지, 몇 분 후 도착하는지 알 수 있음
- 오른쪽 상단 화면에서 고흥군의 대기질과 온도를 확인할 수 있음
</br>

![스크린샷 2025-04-17 174703](https://github.com/user-attachments/assets/2df31e80-b67b-4bab-af6c-0f73d9bcc9a1)


## 기술 스택

### 프론트엔드
- React.js
- TypeScript
- Kakao Maps API
- OpenAI API
 
### 배포
- Docker
- Nginx

## 요구사항
- Docker 및 Docker Compose
- OpenAI API Key
- Kakao Maps API Key
- `.env` 파일 (개발 환경)
- `.env.production` 파일 (배포 환경)

## 실행 방법

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
