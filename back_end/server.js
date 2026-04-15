const app = require("./src/app");
const env = require("./src/config/env");

app.listen(env.port, env.host, () => {
  console.log(`Server listening on http://${env.host}:${env.port}`);
});
