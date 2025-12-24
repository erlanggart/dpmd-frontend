@echo off
REM SCP Deployment Script for Hostinger (Windows)
REM IP: 72.61.143.224

echo ==========================================
echo HOSTINGER DEPLOYMENT VIA SCP (Windows)
echo ==========================================
echo.

REM Configuration
set HOSTINGER_IP=72.61.143.224
set HOSTINGER_USER=u782560913
set REMOTE_PATH=/home/%HOSTINGER_USER%/public_html
set LOCAL_DIST=dist

echo Target: %HOSTINGER_USER%@%HOSTINGER_IP%:%REMOTE_PATH%
echo.
echo REQUIREMENTS:
echo - OpenSSH installed (Windows 10/11 built-in)
echo - SSH key configured OR password ready
echo.
pause

REM Check if dist exists
if not exist "%LOCAL_DIST%" (
    echo [ERROR] dist/ folder not found!
    echo Run 'npm run build' first
    exit /b 1
)

echo [1/4] Creating backup on remote...
ssh %HOSTINGER_USER%@%HOSTINGER_IP% "cd %REMOTE_PATH% && tar -czf backup-%date:~-4%%date:~-7,2%%date:~-10,2%-%time:~0,2%%time:~3,2%%time:~6,2%.tar.gz * 2>/dev/null || true"
if %errorlevel% neq 0 (
    echo [WARNING] Backup creation failed or skipped
)

echo.
echo [2/4] Cleaning remote directory...
ssh %HOSTINGER_USER%@%HOSTINGER_IP% "cd %REMOTE_PATH% && find . -maxdepth 1 -type f ! -name 'backup-*.tar.gz' -delete"

echo.
echo [3/4] Uploading files via SCP...
scp -r %LOCAL_DIST%\* %HOSTINGER_USER%@%HOSTINGER_IP%:%REMOTE_PATH%/
if %errorlevel% neq 0 (
    echo [ERROR] Upload failed!
    exit /b 1
)

echo.
echo [4/4] Verifying critical files...
ssh %HOSTINGER_USER%@%HOSTINGER_IP% "cd %REMOTE_PATH% && ls -lh sw.js sw-custom.js logo-bogor.png manifest.json index.html"

echo.
echo ==========================================
echo DEPLOYMENT COMPLETED!
echo ==========================================
echo.
echo Verify deployment:
echo 1. https://dpmd.bogorkab.go.id
echo 2. https://dpmd.bogorkab.go.id/sw.js
echo 3. https://dpmd.bogorkab.go.id/sw-custom.js
echo.
pause
