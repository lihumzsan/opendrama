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

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm.cmd was not found. Please install Node.js first.
    goto :failure
)

where powershell.exe >nul 2>&1
if errorlevel 1 (
    echo [ERROR] powershell.exe was not found.
    goto :failure
)

cd /d "%PROJECT_DIR%"

if not exist "%PROJECT_DIR%.env" (
    if not exist "%PROJECT_DIR%.env.example" (
        echo [ERROR] Missing both "%PROJECT_DIR%.env" and "%PROJECT_DIR%.env.example".
        goto :failure
    )

    echo Creating .env from .env.example...
    copy /y "%PROJECT_DIR%.env.example" "%PROJECT_DIR%.env" >nul
    if errorlevel 1 (
        echo [ERROR] Failed to create "%PROJECT_DIR%.env".
        goto :failure
    )
)

if not exist "%PROJECT_DIR%node_modules\" (
    echo Installing dependencies with npm.cmd ci...
    call npm.cmd ci
    if errorlevel 1 (
        echo [ERROR] Dependency installation failed.
        goto :failure
    )
)

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

call :stop_port 3000
if errorlevel 1 goto :failure

call :stop_port 3010
if errorlevel 1 goto :failure

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

:stop_port
set "TARGET_PORT=%~1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$port = %TARGET_PORT%; $owners = @{}; foreach ($connection in @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)) { $owners[[int]$connection.OwningProcess] = $true }; foreach ($processId in $owners.Keys) { Write-Host ('Port {0} is occupied by PID {1}. Stopping its process tree...' -f $port, $processId); $taskkillOutput = & taskkill.exe /PID $processId /T /F 2>&1; if ($LASTEXITCODE -ne 0) { Write-Host ('[WARN] taskkill reported a failure for PID {0}; verifying the port state.' -f $processId) } }; if ($owners.Count -gt 0) { Start-Sleep -Seconds 1 }; if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) { Write-Host ('[ERROR] Port {0} is still occupied.' -f $port); exit 1 }; if ($owners.Count -gt 0) { Write-Host ('Port {0} is now available.' -f $port) }"
if errorlevel 1 (
    exit /b 1
)

exit /b 0
