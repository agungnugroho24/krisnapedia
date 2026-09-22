param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "..\ngrok.yml")
)

$resolvedConfig = [System.IO.Path]::GetFullPath($ConfigPath)

if (-not (Test-Path -LiteralPath $resolvedConfig)) {
  throw "ngrok config not found at: $resolvedConfig"
}

Write-Host "Checking ngrok config: $resolvedConfig"
ngrok config check --config $resolvedConfig

Write-Host "Starting all tunnels from config..."
ngrok start --all --config $resolvedConfig
