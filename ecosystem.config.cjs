require('dotenv').config();

module.exports = {
  apps: [{
    name: 'cloud-agents-backend',
    script: 'npx',
    args: 'tsx src/index.ts',
    cwd: '/root/cloud-agents',
    env: {
      PORT: 3001,
      NODE_ENV: 'production',
      BRAIN_SERVER_URL: 'http://49.13.158.176:5001',
      ...process.env
    }
  }]
};
