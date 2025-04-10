# Build stage
FROM node:18-alpine as build

WORKDIR /app

# 패키지 파일 복사 및 설치
COPY package*.json ./
RUN npm install --legacy-peer-deps

# .env 파일과 소스 코드 복사
COPY .env .env
COPY . .

# 빌드 실행
RUN npm run build

# Production stage
FROM nginx:alpine

# nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY env.sh /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/env.sh

# 빌드 결과물과 .env 파일 복사
COPY --from=build /app/build /usr/share/nginx/html
COPY --from=build /app/.env /app/.env

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]