$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Git check"
if (-not (Test-Path "$root\.git")) {
  Set-Location $root
  git init
}

Write-Host "Tooling"
dotnet --version
node -v
npm -v

Write-Host "Backend build"
Set-Location "$root\backend"
dotnet restore
dotnet build

Write-Host "Frontend build"
Set-Location "$root\frontend"
npm install
npm run build

Write-Host "Done"
