@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

set ENV_FILE=.env
set KEY_FOUND=0

if exist "%ENV_FILE%" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%ENV_FILE%") do (
        set "KEY_NAME=%%A"
        set "KEY_VAL=%%B"
        :: Strip spaces
        for /f "tokens=*" %%x in ("!KEY_NAME!") do set "KEY_NAME=%%x"
        if "!KEY_NAME!"=="GEMINI_API_KEY" (
            if not "!KEY_VAL!"=="" (
                set KEY_FOUND=1
            )
        )
    )
)

if "%KEY_FOUND%"=="0" (
    echo ====================================================
    echo  LingoTutor - Gemini API Key Setup
    echo ====================================================
    echo.
    echo Gemini API 키가 설정되어 있지 않습니다.
    echo API 키를 입력하시면 %ENV_FILE% 파일에 저장되고 자동으로 사용됩니다.
    echo (그냥 엔터를 누르시면 나중에 웹화면에서 직접 등록하실 수 있습니다.)
    echo.
    set /p USER_KEY="Gemini API Key: "
    
    if not "!USER_KEY!"=="" (
        :: Strip spaces from user input
        for /f "tokens=*" %%x in ("!USER_KEY!") do set "USER_KEY=%%x"
        
        if exist "%ENV_FILE%" (
            echo.>> "%ENV_FILE%"
            echo GEMINI_API_KEY=!USER_KEY!>> "%ENV_FILE%"
        ) else (
            echo GEMINI_API_KEY=!USER_KEY!> "%ENV_FILE%"
        )
        echo.
        echo API 키가 %ENV_FILE% 에 성공적으로 저장되었습니다.
    ) else (
        echo.
        echo API 키 입력을 건너뛰었습니다.
    )
    echo ====================================================
    echo.
)

echo 프로젝트를 시작합니다...
echo 크롬 브라우저에서 http://localhost:5000 으로 접속을 시도합니다.
echo.

:: Open local address in Chrome (fallback to default browser if Chrome is not found)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "http://localhost:5000"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "http://localhost:5000"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "http://localhost:5000"
) else (
    start "" "http://localhost:5000"
)

:: Start the express server
npm start
