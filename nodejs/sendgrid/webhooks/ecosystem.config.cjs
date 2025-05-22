module.exports = {
    apps : [{
      name: 'Webhook Server',
      script: './index.js',
      env_production: {
        NODE_ENV: "production",
        API_PORT: 3443,
        PROD_DB_PASS: "",
        PROD_DB_USER: "",
        PROD_DB_NAME: "",
        PROD_DB_HOST: ""
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
      error_file: "./logs/stderr.log",
      out_file: "./logs/stdout.log",
      instances: 1,
      min_uptime: "100s",
      // max_restarts: 10,
      max_memory_restart: "256M"
    }]
  };