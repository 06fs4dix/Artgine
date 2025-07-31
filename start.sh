#!/bin/bash

# Node.js 설치 확인
if ! command -v node &> /dev/null; then
    echo "Node.js가 설치되어 있지 않습니다. 다운로드 페이지를 여는 중..."
    
    # OS별 다운로드 페이지 열기
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open https://nodejs.org/
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v xdg-open &> /dev/null; then
            xdg-open https://nodejs.org/
        elif command -v gnome-open &> /dev/null; then
            gnome-open https://nodejs.org/
        else
            echo "브라우저를 열 수 없습니다. 수동으로 https://nodejs.org/ 에 접속해주세요."
        fi
    fi
    
    echo "Node.js 설치 후 다시 실행해주세요."
    read -p "계속하려면 Enter를 누르세요..."
    exit 1
fi

echo "Start... App/Start.js"
node App/Start.js 