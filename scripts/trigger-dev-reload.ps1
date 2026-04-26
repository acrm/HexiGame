$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$markerPath = Join-Path $repoRoot 'src\appLogic\devReloadMarker.ts'

if (-not (Test-Path $markerPath)) {
  throw "Reload marker not found: $markerPath"
}

$timestamp = Get-Date
[System.IO.File]::SetLastWriteTime($markerPath, $timestamp)
Write-Host "Touched dev reload marker at $($timestamp.ToString('o'))"