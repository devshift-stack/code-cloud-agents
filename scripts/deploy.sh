#!/bin/bash
# ===========================================
# Code Cloud Agents - Production Deployment
# ===========================================
# Usage: ./scripts/deploy.sh [server]
# Example: ./scripts/deploy.sh 178.156.178.70

set -e

# Configuration
SSH_KEY="${SSH_KEY:-~/.ssh/id_ed25519_cloudagents}"
SSH_USER="${SSH_USER:-root}"
SERVER="${1:-178.156.178.70}"
REMOTE_PATH="/root/cloud-agents"
PM2_PROCESS="cloud-agents-backend"

echo "=========================================="
echo "  Code Cloud Agents - Deploy"
echo "=========================================="
echo "Server: $SSH_USER@$SERVER"
echo "Path:   $REMOTE_PATH"
echo ""

# SSH command helper
ssh_cmd() {
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER@$SERVER" "$1"
}

# Step 1: Check server git status
echo "[1/5] Checking server git status..."
STATUS=$(ssh_cmd "cd $REMOTE_PATH && git status --porcelain")
if [ -n "$STATUS" ]; then
  echo "ERROR: Server has uncommitted changes!"
  echo "$STATUS"
  echo ""
  echo "Fix with: ssh -i $SSH_KEY $SSH_USER@$SERVER 'cd $REMOTE_PATH && git checkout -- . && git clean -fd'"
  exit 1
fi
echo "  ✓ Server is clean"

# Step 2: Pull latest code
echo "[2/5] Pulling latest code..."
ssh_cmd "cd $REMOTE_PATH && git pull origin main"
echo "  ✓ Code updated"

# Step 3: Install dependencies with npm ci
echo "[3/5] Installing dependencies (npm ci)..."
ssh_cmd "cd $REMOTE_PATH && npm ci --omit=dev"
echo "  ✓ Dependencies installed"

# Step 4: Restart PM2 process
echo "[4/5] Restarting PM2 process..."
ssh_cmd "pm2 restart $PM2_PROCESS"
echo "  ✓ Process restarted"

# Step 5: Health check
echo "[5/5] Running health check..."
sleep 3
HEALTH=$(curl -s "http://$SERVER:3001/health" || echo '{"status":"error"}')
if echo "$HEALTH" | grep -q '"status":"healthy"'; then
  echo "  ✓ Health check passed"
else
  echo "  ✗ Health check failed!"
  echo "$HEALTH"
  echo ""
  echo "Check logs: ssh -i $SSH_KEY $SSH_USER@$SERVER 'pm2 logs $PM2_PROCESS --lines 50'"
  exit 1
fi

echo ""
echo "=========================================="
echo "  ✓ Deployment complete!"
echo "=========================================="
