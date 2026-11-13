@echo off
setlocal EnableExtensions
title PlacementPortal - setup and run
rem =====================================================================
rem  One-click setup + run for Windows.
rem  First run : extracts the project, installs packages, creates .env,
rem              starts PostgreSQL+pgvector in Docker, builds the schema,
rem              loads demo data, then starts the app.
rem  Later runs: just starts the database and the app.
rem  Progress is also written to placement-portal-setup.log
rem =====================================================================
set "HERE=%~dp0"
set "LOG=%HERE%placement-portal-setup.log"
>"%LOG%" echo ==== PlacementPortal setup started %date% %time% ====

if exist "%HERE%package.json" (
  set "APP=%HERE%"
) else (
  set "APP=%HERE%placement-portal\"
)

call :say "[1/8] Checking Node.js"
where node >nul 2>&1
if errorlevel 1 ( call :fail "Node.js is not installed. Install Node.js 22 LTS from https://nodejs.org , then double-click this file again." & goto :end )
for /f "delims=" %%v in ('node -v') do call :say "      Node %%v found"

call :say "[2/8] Checking Docker Desktop"
where docker >nul 2>&1
if errorlevel 1 ( call :fail "Docker Desktop is not installed. Install it from https://www.docker.com/products/docker-desktop , open it, then double-click this file again." & goto :end )
docker info >nul 2>&1
if errorlevel 1 ( call :fail "Docker Desktop is not running. Open Docker Desktop, wait until it shows Engine running, then double-click this file again." & goto :end )
call :say "      Docker is running"

call :say "[3/8] Preparing project files"
if not exist "%APP%package.json" (
  if not exist "%HERE%placement-portal.zip" ( call :fail "placement-portal.zip was not found next to this file." & goto :end )
  pushd "%HERE%"
  tar -xf "placement-portal.zip" >>"%LOG%" 2>&1
  if errorlevel 1 powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath 'placement-portal.zip' -DestinationPath '.' -Force" >>"%LOG%" 2>&1
  popd
)
if not exist "%APP%package.json" ( call :fail "Could not extract placement-portal.zip." & goto :end )
cd /d "%APP%"
call :say "      Project folder: %CD%"

call :say "[4/8] Checking the .env file"
if not exist ".env" (
  node -e "const fs=require('fs'),c=require('crypto');let s=fs.readFileSync('.env.example','utf8');s=s.replace(/^SESSION_SECRET=.*$/m,'SESSION_SECRET='+c.randomBytes(48).toString('base64url'));fs.writeFileSync('.env',s);" >>"%LOG%" 2>&1
  if errorlevel 1 ( call :fail "Could not create the .env file." & goto :end )
  call :say "      Created .env with a new random SESSION_SECRET"
)
docker ps --format "{{.Names}}" | findstr /i /x "placement-portal-db" >nul
if errorlevel 1 (
  netstat -ano | findstr /r /c:":5432 .*LISTENING" >nul
  if not errorlevel 1 (
    findstr /c:"localhost:5432" ".env" >nul
    if not errorlevel 1 (
      node -e "const fs=require('fs');let s=fs.readFileSync('.env','utf8');s=s.replace('localhost:5432','localhost:5433');s=/^DB_PORT=/m.test(s)?s.replace(/^DB_PORT=.*$/m,'DB_PORT=5433'):s+'\nDB_PORT=5433\n';fs.writeFileSync('.env',s);" >>"%LOG%" 2>&1
      call :say "      Port 5432 is busy - using port 5433 for the database instead"
    )
  )
)

call :say "[5/8] Installing npm packages - the first time takes 2 to 5 minutes"
if exist "node_modules\next\package.json" (
  call :say "      Already installed"
) else (
  call npm install >>"%LOG%" 2>&1
  if errorlevel 1 ( call :fail "npm install failed. See placement-portal-setup.log for details." & goto :end )
  call :say "      Packages installed"
)

call :say "[6/8] Starting PostgreSQL with pgvector in Docker - the first time downloads the image"
docker compose up -d >>"%LOG%" 2>&1
if errorlevel 1 ( call :fail "docker compose up failed. See placement-portal-setup.log for details." & goto :end )
set /a TRIES=0
:waitdb
docker exec placement-portal-db pg_isready -h 127.0.0.1 -U placement -d placement_portal >nul 2>&1
if not errorlevel 1 goto :dbready
set /a TRIES+=1
if %TRIES% GEQ 90 ( call :fail "The database did not become ready within 3 minutes." & goto :end )
timeout /t 2 /nobreak >nul
goto :waitdb
:dbready
call :say "      Database is ready"
call :say "      pgAdmin database viewer: http://localhost:5050"

if exist ".setup-complete" (
  call :say "[7/8] Database already set up - keeping your data"
  goto :startapp
)
call :say "[7/8] Creating tables, triggers and procedures, then loading demo data"
call npm run db:setup >>"%LOG%" 2>&1
if errorlevel 1 (
  timeout /t 5 /nobreak >nul
  call npm run db:setup >>"%LOG%" 2>&1
)
if errorlevel 1 ( call :fail "Database setup failed. See placement-portal-setup.log for details." & goto :end )
call :say "      Schema created. Loading demo data - the first time downloads the AI model"
call npm run db:seed >>"%LOG%" 2>&1
if errorlevel 1 ( call :fail "Loading demo data failed. See placement-portal-setup.log for details." & goto :end )
>".setup-complete" echo done
call :say "      Demo data loaded"

:startapp
rem Use port 3000 unless another program (for example Grafana) already uses it
set "APP_PORT=3000"
netstat -ano | findstr /r /c:":3000 .*LISTENING" >nul
if not errorlevel 1 set "APP_PORT=3001"
call :say "[8/8] Starting the app at http://localhost:%APP_PORT% - keep this window open"
>>"%LOG%" echo SETUP_COMPLETE
start "" cmd /c "timeout /t 15 /nobreak >nul & start http://localhost:%APP_PORT%"
call npm run dev -- -p %APP_PORT%
goto :end

:end
echo.
echo Press any key to close this window.
pause >nul
exit /b

:say
echo(%~1
>>"%LOG%" echo(%~1
exit /b 0

:fail
echo.
echo ERROR: %~1
>>"%LOG%" echo ERROR: %~1
>>"%LOG%" echo SETUP_FAILED
exit /b 0
