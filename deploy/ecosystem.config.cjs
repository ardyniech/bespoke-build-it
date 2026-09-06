// PM2 configuration fine-tuned for low-resource hardware (Sony Vaio Ubuntu Server)
module.exports = {
  apps: [
    {
      name: 'drg-app',
      script: '.output/server/index.mjs',
      cwd: '/var/www/drg-app',
      instances: 1, // Single instance to prevent RAM duplication on dual-core CPU
      exec_mode: 'fork', // Fork mode uses significantly less RAM than cluster mode
      autorestart: true,
      watch: false, // Never watch files in production to save CPU cycles
      max_memory_restart: '320M', // Auto-restart if Node leaks memory over 320MB
      node_args: '--max-old-space-size=384',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '127.0.0.1',
      },
    },
  ],
};
