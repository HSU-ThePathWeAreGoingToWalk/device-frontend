#!/bin/sh

# 루트 디렉토리 설정
ROOT_DIR=/usr/share/nginx/html

# JavaScript 파일 찾기
JS_FILES=$(find $ROOT_DIR -type f -name "*.js")

# JavaScript 파일의 환경변수 치환
for file in $JS_FILES
do
  # .env.production 파일에서 값 읽기
  ENV_VALUE=$(grep REACT_APP_OPENAI_API_KEY /app/.env.production | cut -d '=' -f2-)
  
  # 환경변수 치환
  sed -i "s|\"REACT_APP_OPENAI_API_KEY\"|\"${ENV_VALUE}\"|g" $file
  rm -f "${file}-e"
done