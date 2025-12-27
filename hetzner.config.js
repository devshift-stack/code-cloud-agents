/**
 * Hetzner Deployment Configuration
 * Server: 178.156.178.70
 */

module.exports = {
  apps: [
    {
      name: 'code-cloud-agents',
      script: 'dist/index.js',
      cwd: '/root/cloud-agents',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/root/cloud-agents/logs/error.log',
      out_file: '/root/cloud-agents/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
