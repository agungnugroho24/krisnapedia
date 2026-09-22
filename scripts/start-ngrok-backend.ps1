param(
  [string]$UserConfigPath = (Join-Path $env:LOCALAPPDATA "ngrok\ngrok.yml"),
  [string]$ProjectConfigPath = (Join-Path $PSScriptRoot "..\ngrok-backend.yml")
)

$resolvedUserConfig = [System.IO.Path]::GetFullPath($UserConfigPath)
$resolvedProjectConfig = [System.IO.Path]::GetFullPath($ProjectConfigPath)

if (-not (Test-Path -LiteralPath $resolvedUserConfig)) {
  throw "ngrok user config not found at: $resolvedUserConfig. Run: ngrok config add-authtoken <TOKEN>"
}

if (-not (Test-Path -LiteralPath $resolvedProjectConfig)) {
  throw "ngrok backend config not found at: $resolvedProjectConfig"
}

ngrok config check --config $resolvedUserConfig --config $resolvedProjectConfig
ngrok start backend --config $resolvedUserConfig --config $resolvedProjectConfig
