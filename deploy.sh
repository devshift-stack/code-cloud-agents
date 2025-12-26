#!/bin/bash
# 🚀 Deployment Script für Hetzner Server
# Verwendung: ./deploy.sh

set -e  # Exit bei Fehler

echo "🚀 Starting deployment..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Config
SERVER="root@178.156.178.70"
SSH_KEY="$HOME/.ssh/activi_cloud_agent"
REMOTE_PATH="/root/cloud-agents"
PM2_APP="cloud-agents-backend"

# 1. Local Checks
echo -e "${YELLOW}[1/5]${NC} Running local checks..."
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}Error: You have uncommitted changes!${NC}"
    echo "Please commit or stash them first."
    exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}Warning: You're on branch '$CURRENT_BRANCH', not 'main'${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 2. Push to GitHub
echo -e "${YELLOW}[2/6]${NC} Pushing to GitHub..."
git push origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: git push failed!${NC}"
    exit 1
fi

# 3. Pull on Server
echo -e "${YELLOW}[3/6]${NC} Pulling latest code on server..."
ssh -i $SSH_KEY $SERVER << EOF
    cd $REMOTE_PATH
    git fetch origin main
    git reset --hard origin/main
    git clean -fd
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: git pull failed!${NC}"
    exit 1
fi

# 4. Install Dependencies
echo -e "${YELLOW}[4/6]${NC} Installing dependencies..."
ssh -i $SSH_KEY $SERVER << EOF
    cd $REMOTE_PATH
    npm ci --legacy-peer-deps --quiet
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: npm install failed!${NC}"
    exit 1
fi

# 5. Restart PM2
echo -e "${YELLOW}[5/6]${NC} Restarting PM2..."
ssh -i $SSH_KEY $SERVER << EOF
    pm2 restart $PM2_APP
    sleep 3
EOF

# 6. Health Check
echo -e "${YELLOW}[6/6]${NC} Running health check..."
HEALTH_CHECK=$(ssh -i $SSH_KEY $SERVER "curl -sf http://localhost:3000/health")

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "Health Check Response:"
    echo "$HEALTH_CHECK" | jq . 2>/dev/null || echo "$HEALTH_CHECK"
    echo ""
    echo "PM2 Status:"
    ssh -i $SSH_KEY $SERVER "pm2 list | grep $PM2_APP"
    echo ""
    echo -e "${GREEN}🎉 Server is up and running!${NC}"
else
    echo -e "${RED}❌ Health check failed!${NC}"
    echo "Checking logs..."
    ssh -i $SSH_KEY $SERVER "pm2 logs $PM2_APP --lines 20 --nostream"
    exit 1
fi
