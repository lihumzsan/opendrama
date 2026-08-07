$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$scriptPath = Join-Path $repoRoot 'scripts\dev.mjs'

if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw "Expected development coordinator at $scriptPath"
}

$node = (Get-Command node.exe -ErrorAction Stop).Source
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('opendrama-dev-stdio-' + [System.Guid]::NewGuid().ToString('N'))
$binDir = Join-Path $tempRoot 'bin'
$brokenBinDir = Join-Path $tempRoot 'broken-bin'
$concurrentlyDir = Join-Path $tempRoot 'node_modules\.bin'
$tracePath = Join-Path $tempRoot 'trace.log'
$stdoutPath = Join-Path $tempRoot 'stdout.log'
$stderrPath = Join-Path $tempRoot 'stderr.log'
$originalPath = $env:Path
$originalTrace = $env:DEV_TEST_TRACE
$originalNpmCommand = $env:OPENDRAMA_NPM_CMD

try {
    New-Item -ItemType Directory -Force -Path $binDir, $brokenBinDir, $concurrentlyDir | Out-Null

    $brokenNpmStub = @'
@echo off
echo wrong npm shim was used>>"%DEV_TEST_TRACE%"
exit /b 88
'@
    Set-Content -LiteralPath (Join-Path $brokenBinDir 'npm.cmd') -Value $brokenNpmStub -Encoding ASCII

    $npmStub = @'
@echo off
echo npm %*>>"%DEV_TEST_TRACE%"
exit /b 0
'@
    Set-Content -LiteralPath (Join-Path $binDir 'npm.cmd') -Value $npmStub -Encoding ASCII

    $concurrentlyStub = @'
@echo off
echo concurrently %*>>"%DEV_TEST_TRACE%"
exit /b 0
'@
    Set-Content -LiteralPath (Join-Path $concurrentlyDir 'concurrently.cmd') -Value $concurrentlyStub -Encoding ASCII

    $env:Path = "$brokenBinDir;$binDir;$originalPath"
    $env:DEV_TEST_TRACE = $tracePath
    $env:OPENDRAMA_NPM_CMD = Join-Path $binDir 'npm.cmd'

    $process = Start-Process `
        -FilePath $node `
        -ArgumentList "`"$scriptPath`"" `
        -WorkingDirectory $tempRoot `
        -RedirectStandardOutput $stdoutPath `
        -RedirectStandardError $stderrPath `
        -WindowStyle Hidden `
        -Wait `
        -PassThru

    if ($process.ExitCode -ne 0) {
        $stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -Raw -LiteralPath $stderrPath } else { '' }
        throw "scripts/dev.mjs failed under redirected stdio with exit code $($process.ExitCode): $stderr"
    }

    $trace = Get-Content -LiteralPath $tracePath
    if ($trace[0] -notmatch '^npm "?run"? "?dev:prepare"?$') {
        throw "Expected development preparation first, got: $($trace[0])"
    }
    if ($trace[1] -notmatch '^npm "?run"? "?storage:init"?$') {
        throw "Expected storage initialization second, got: $($trace[1])"
    }
    if ($trace[2] -notmatch '^concurrently "?npm run dev:next"? "?npm run dev:worker"? "?npm run dev:watchdog"? "?npm run dev:board"?$') {
        throw "Expected concurrently dev services, got: $($trace[2])"
    }

    Write-Output 'scripts/dev.mjs redirected stdio check passed'
} finally {
    $env:Path = $originalPath
    if ($null -eq $originalTrace) {
        Remove-Item Env:\DEV_TEST_TRACE -ErrorAction SilentlyContinue
    } else {
        $env:DEV_TEST_TRACE = $originalTrace
    }
    if ($null -eq $originalNpmCommand) {
        Remove-Item Env:\OPENDRAMA_NPM_CMD -ErrorAction SilentlyContinue
    } else {
        $env:OPENDRAMA_NPM_CMD = $originalNpmCommand
    }
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
