module.exports = {
  apps: [{
    name: 'cloud-agents-backend',
    script: 'npx',
    args: 'tsx src/index.ts',
    cwd: '/root/cloud-agents',
    env: {
      PORT: 4000,
      NODE_ENV: 'production',
      SENTRY_DSN: 'https://66a26f4df181c1c92a9b4178fd8e4913@o4510621142024192.ingest.de.sentry.io/4510627168649296'
    }
  }]
};
