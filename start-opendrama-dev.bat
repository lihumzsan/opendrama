@echo off
setlocal EnableExtensions

set "PROJECT_DIR=%~dp0"
set "CHECK_ONLY=0"

if /i "%~1"=="--check" set "CHECK_ONLY=1"
if /i "%~1"=="--help" goto :usage

rem Codex, Windows Terminal, or Explorer may have started before the user PATH changed.
rem Add the persisted user PATH for this launch only, so Winget-installed FFmpeg is visible.
for /f "tokens=2,*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul ^| findstr /i /c:"Path"') do set "USER_PATH=%%B"
if defined USER_PATH set "PATH=%PATH%;%USER_PATH%"

if not exist "%PROJECT_DIR%package.json" (
    echo [ERROR] Project not found: "%PROJECT_DIR%"
    goto :failure
)

if not exist "%PROJECT_DIR%.env" (
    echo [ERROR] Missing "%PROJECT_DIR%.env".
    echo Copy .env.example to .env and configure the development services first.
    goto :failure
)

if not exist "%PROJECT_DIR%node_modules\" (
    echo [ERROR] Dependencies are not installed.
    echo Run npm.cmd ci in "%PROJECT_DIR%" first.
    goto :failure
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm.cmd was not found. Please install Node.js first.
    goto :failure
)

cd /d "%PROJECT_DIR%"

where ffmpeg >nul 2>&1
if errorlevel 1 (
    echo [ERROR] ffmpeg.exe was not found for this launch.
    echo Check your user PATH or restart Codex/Windows Terminal after changing it.
    goto :failure
)

where ffprobe >nul 2>&1
if errorlevel 1 (
    echo [ERROR] ffprobe.exe was not found for this launch.
    echo Check your user PATH or restart Codex/Windows Terminal after changing it.
    goto :failure
)

if "%CHECK_ONLY%"=="1" (
    echo [OK] OpenDrama development prerequisites are available.
    exit /b 0
)

echo Starting OpenDrama in development mode...
echo Press Ctrl+C to stop the project.
echo.

call npm.cmd run dev
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
    echo.
    echo [ERROR] Project exited with code %EXIT_CODE%.
    pause
)

exit /b %EXIT_CODE%

:usage
echo Usage: %~nx0 [--check]
echo   --check  Verify local development prerequisites without starting the project.
exit /b 0

:failure
pause
exit /b 1
