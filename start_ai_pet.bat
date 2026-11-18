@echo off
chcp 65001 > nul
title AIペット クロちゃん🐾 スマホ連携サーバー

cd /d "%~dp0"

echo ====================================================
echo  🐾 VOICEVOXエンジンとWebサーバーを起動中ニャ！
echo ====================================================

:: 1. VOICEVOXエンジンを外部許可＋CORS全許可で起動
tasklist /fi "imagename eq run.exe" | find /i "run.exe" > nul
if errorlevel 1 (
    echo [1/2] VOICEVOXエンジンを起動中...
    start "VOICEVOX Engine" /min C:\voicevox\run.exe --host 0.0.0.0 --cors_policy_mode all
    timeout /t 3 > nul
) else (
    echo [1/2] VOICEVOXエンジンはすでに起動しています。
)

:: 2. クロちゃん配信用のWebサーバーを起動（ポート8080）
echo [2/2] クロちゃんWebサーバーを起動中 (ポート:8080)...
start "Kuro Web Server" /min python -m http.server 8080

echo ====================================================
echo  ✅ 準備完了ニャ！
echo  この黒い画面は閉じずに最小化しておいてニャ🐾
echo ====================================================
pause