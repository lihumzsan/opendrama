$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot '..\..\start-opendrama-dev.bat'

if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw "Expected development launcher at $scriptPath"
}

$content = Get-Content -LiteralPath $scriptPath -Raw
$requiredPatterns = @(
    '^@echo off',
    'setlocal EnableExtensions',
    'set "PROJECT_DIR=%~dp0"',
    'HKCU\\Environment',
    'package\.json',
    '\.env',
    'node_modules',
    'where npm\.cmd',
    'where ffmpeg',
    'where ffprobe',
    '"--check"',
    'call npm\.cmd run dev',
    'set "EXIT_CODE=%ERRORLEVEL%"',
    'exit /b %EXIT_CODE%'
)

foreach ($pattern in $requiredPatterns) {
    if ($content -notmatch $pattern) {
        throw "Launcher is missing required behavior: $pattern"
    }
}

cmd.exe /d /c "call `"$scriptPath`" --check >nul"
if ($LASTEXITCODE -ne 0) {
    throw "Launcher failed cmd.exe syntax validation with exit code $LASTEXITCODE"
}

Write-Output 'start-opendrama-dev.bat checks passed'
