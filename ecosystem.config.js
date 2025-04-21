module.exports = {
  apps: [{
    name: 'device-checker',
    script: 'frontend/scripts/check-devices.ts',
    interpreter: 'ts-node',
    cron_restart: '*/2 * * * *',
    autorestart: false,
    watch: false,
    instances: 1,
    env: {
      NODE_ENV: 'production'
    }
  }]
}; 