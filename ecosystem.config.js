module.exports = {
  apps: [{
    name: 'device-checker',
    script: 'frontend/scripts/check-devices.js',
    cron_restart: '*/2 * * * *',
    autorestart: false,
    watch: false,
    instances: 1,
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/device-checker-error.log',
    out_file: './logs/device-checker-out.log'
  }]
}; 