# PowerShell SCP Deployment to Hostinger
# IP: 72.61.143.224

param(
    [string]$Username = "",
    [string]$RemotePath = ""
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  HOSTINGER DEPLOYMENT VIA SCP" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

$HOSTINGER_IP = "72.61.143.224"
$LOCAL_DIST = "dist"

# Get username if not provided
if ([string]::IsNullOrEmpty($Username)) {
    Write-Host "Masukkan username Hostinger Anda (format: u123456789):" -ForegroundColor Yellow
    $Username = Read-Host "Username"
}

# Set remote path
if ([string]::IsNullOrEmpty($RemotePath)) {
    $RemotePath = "/home/$Username/public_html"
}

Write-Host "`nConfiguration:" -ForegroundColor Cyan
Write-Host "  IP: $HOSTINGER_IP" -ForegroundColor White
Write-Host "  User: $Username" -ForegroundColor White
Write-Host "  Remote Path: $RemotePath" -ForegroundColor White
Write-Host "  Local: $LOCAL_DIST" -ForegroundColor White
Write-Host ""

# Check if dist exists
if (!(Test-Path $LOCAL_DIST)) {
    Write-Host "[ERROR] dist/ folder not found!" -ForegroundColor Red
    Write-Host "Run 'npm run build' first" -ForegroundColor Yellow
    exit 1
}

Write-Host "Files to upload:" -ForegroundColor Cyan
Get-ChildItem $LOCAL_DIST -Recurse | Measure-Object | Select-Object -ExpandProperty Count | ForEach-Object {
    Write-Host "  Total files: $_" -ForegroundColor White
}

Write-Host "`nPress ENTER to continue or Ctrl+C to cancel..." -ForegroundColor Yellow
Read-Host

# Test SSH connection
Write-Host "`n[1/5] Testing SSH connection..." -ForegroundColor Yellow
try {
    ssh -o ConnectTimeout=10 "${Username}@${HOSTINGER_IP}" "pwd"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] SSH connection failed!" -ForegroundColor Red
        Write-Host "Please check:" -ForegroundColor Yellow
        Write-Host "  1. Username is correct" -ForegroundColor White
        Write-Host "  2. SSH key is configured OR password is correct" -ForegroundColor White
        Write-Host "  3. Hostinger allows SSH access" -ForegroundColor White
        exit 1
    }
    Write-Host "[OK] SSH connection successful" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] SSH connection failed: $_" -ForegroundColor Red
    exit 1
}

# Create backup
Write-Host "`n[2/5] Creating backup on remote..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
ssh "${Username}@${HOSTINGER_IP}" "cd ${RemotePath} && tar -czf backup-${timestamp}.tar.gz * 2>/dev/null || true"
Write-Host "[OK] Backup created: backup-${timestamp}.tar.gz" -ForegroundColor Green

# Clean remote directory
Write-Host "`n[3/5] Cleaning remote directory..." -ForegroundColor Yellow
Write-Host "Keeping backups only..." -ForegroundColor Gray
ssh "${Username}@${HOSTINGER_IP}" "cd ${RemotePath} && find . -maxdepth 1 -type f ! -name 'backup-*.tar.gz' -delete 2>/dev/null || true"
ssh "${Username}@${HOSTINGER_IP}" "cd ${RemotePath} && find . -maxdepth 1 -type d ! -name '.' ! -name '..' -exec rm -rf {} + 2>/dev/null || true"
Write-Host "[OK] Remote directory cleaned" -ForegroundColor Green

# Upload files
Write-Host "`n[4/5] Uploading files via SCP..." -ForegroundColor Yellow
Write-Host "This may take a few minutes depending on connection speed..." -ForegroundColor Gray

try {
    # Use scp to upload all files
    scp -r "${LOCAL_DIST}\*" "${Username}@${HOSTINGER_IP}:${RemotePath}/"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Upload failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Files uploaded successfully" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Upload failed: $_" -ForegroundColor Red
    exit 1
}

# Verify critical files
Write-Host "`n[5/5] Verifying critical files..." -ForegroundColor Yellow
$criticalFiles = @("sw.js", "sw-custom.js", "logo-bogor.png", "manifest.json", "index.html")

foreach ($file in $criticalFiles) {
    $result = ssh "${Username}@${HOSTINGER_IP}" "ls -lh ${RemotePath}/${file} 2>/dev/null"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] $file not found!" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETED!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Verify deployment:" -ForegroundColor Yellow
Write-Host "  1. https://dpmd.bogorkab.go.id" -ForegroundColor White
Write-Host "  2. https://dpmd.bogorkab.go.id/sw.js" -ForegroundColor White
Write-Host "  3. https://dpmd.bogorkab.go.id/sw-custom.js" -ForegroundColor White
Write-Host "  4. https://dpmd.bogorkab.go.id/logo-bogor.png" -ForegroundColor White

Write-Host "`nNext step: Deploy backend to VPS" -ForegroundColor Yellow
Write-Host "  ssh root@api.dpmdbogorkab.id" -ForegroundColor Gray
Write-Host "  cd /var/www/dpmd-backend && git pull && pm2 restart dpmd-api" -ForegroundColor Gray

Write-Host ""
