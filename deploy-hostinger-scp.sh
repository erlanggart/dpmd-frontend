#!/bin/bash
# SCP Deployment Script for Hostinger
# IP: 72.61.143.224

echo "=========================================="
echo "HOSTINGER DEPLOYMENT VIA SCP"
echo "=========================================="
echo ""

# Configuration
HOSTINGER_IP="72.61.143.224"
HOSTINGER_USER="${1:-u782560913}"  # Default username, bisa override dengan parameter
REMOTE_PATH="/home/${HOSTINGER_USER}/public_html"
LOCAL_DIST="dist"

echo "Target: ${HOSTINGER_USER}@${HOSTINGER_IP}:${REMOTE_PATH}"
echo ""

# Check if dist folder exists
if [ ! -d "$LOCAL_DIST" ]; then
    echo "ERROR: dist/ folder not found!"
    echo "Run 'npm run build' first"
    exit 1
fi

echo "[1/4] Creating backup of remote files..."
ssh ${HOSTINGER_USER}@${HOSTINGER_IP} "cd ${REMOTE_PATH} && tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz * 2>/dev/null || true"

echo ""
echo "[2/4] Cleaning remote directory (keeping backups)..."
ssh ${HOSTINGER_USER}@${HOSTINGER_IP} "cd ${REMOTE_PATH} && find . -maxdepth 1 -type f ! -name 'backup-*.tar.gz' -delete && find . -maxdepth 1 -type d ! -name '.' ! -name '..' -exec rm -rf {} + 2>/dev/null || true"

echo ""
echo "[3/4] Uploading files via SCP..."
scp -r ${LOCAL_DIST}/* ${HOSTINGER_USER}@${HOSTINGER_IP}:${REMOTE_PATH}/

echo ""
echo "[4/4] Verifying critical files..."
ssh ${HOSTINGER_USER}@${HOSTINGER_IP} "cd ${REMOTE_PATH} && ls -lh sw.js sw-custom.js logo-bogor.png manifest.json index.html 2>/dev/null"

echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETED!"
echo "=========================================="
echo ""
echo "Verify deployment:"
echo "1. https://dpmd.bogorkab.go.id"
echo "2. https://dpmd.bogorkab.go.id/sw.js"
echo "3. https://dpmd.bogorkab.go.id/sw-custom.js"
echo ""
