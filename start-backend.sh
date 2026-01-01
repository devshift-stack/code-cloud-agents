#!/bin/bash
cd /root/cloud-agents
source .env
export PORT=3001
export BRAIN_SERVER_URL=http://49.13.158.176:5001
exec npx tsx src/index.ts
