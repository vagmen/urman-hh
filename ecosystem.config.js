module.exports = {
  apps: [
    {
      name: "hh",
      script: "./dist/index.js",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
    },
  ],
};
