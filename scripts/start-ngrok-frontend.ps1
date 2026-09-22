param(
  [string]$UserConfigPath = (Join-Path $env:LOCALAPPDATA "ngrok\ngrok.yml"),
  [string]$ProjectConfigPath = (Join-Path $PSScriptRoot "..\ngrok-frontend.yml")
)

$resolvedUserConfig = [System.IO.Path]::GetFullPath($UserConfigPath)
$resolvedProjectConfig = [System.IO.Path]::GetFullPath($ProjectConfigPath)

if (-not (Test-Path -LiteralPath $resolvedUserConfig)) {
  throw "ngrok user config not found at: $resolvedUserConfig. Run: ngrok config add-authtoken <TOKEN>"
}

if (-not (Test-Path -LiteralPath $resolvedProjectConfig)) {
  throw "ngrok frontend config not found at: $resolvedProjectConfig"
}

ngrok config check --config $resolvedUserConfig --config $resolvedProjectConfig
ngrok start frontend --config $resolvedUserConfig --config $resolvedProjectConfig
