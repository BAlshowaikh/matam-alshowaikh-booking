<#
  start-app.ps1
  Starts the PostgreSQL container, Fastify API, and Vite frontend for local development.
  Entry point for running the complete Matam Al-Showaikh application.
#>

$ErrorActionPreference = "Stop"

# Resolve the repository from this script so it works regardless of the caller's directory.
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot

# Fail with actionable messages before attempting to start any services.
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker was not found. Install or start Docker Desktop, then run this script again."
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  throw "pnpm was not found. Install pnpm, then run this script again."
}

# Start PostgreSQL in the background and keep its persisted development data intact.
Write-Host "Starting PostgreSQL..." -ForegroundColor Cyan
docker compose up -d
if ($LASTEXITCODE -ne 0) {
  throw "PostgreSQL could not be started. Make sure Docker Desktop is running."
}

# Wait for PostgreSQL readiness so migrations never race the container startup sequence.
$databaseReady = $false
for ($attempt = 1; $attempt -le 20; $attempt++) {
  docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' *> $null
  if ($LASTEXITCODE -eq 0) {
    $databaseReady = $true
    break
  }
  Start-Sleep -Seconds 1
}

if (-not $databaseReady) {
  throw "PostgreSQL did not become ready within 20 seconds. Review the Docker container logs."
}

# Apply pending schema changes before the API begins handling requests.
Write-Host "Applying database migrations..." -ForegroundColor Cyan
pnpm --filter @matam/db migrate
if ($LASTEXITCODE -ne 0) {
  throw "Database migrations failed. Review the messages above."
}

# Run both long-lived development servers in the foreground for shared logs and Ctrl+C shutdown.
Write-Host "Starting the API and web application..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the development servers." -ForegroundColor DarkGray
pnpm dev
if ($LASTEXITCODE -ne 0) {
  throw "The development servers stopped with an error. Review the messages above."
}
