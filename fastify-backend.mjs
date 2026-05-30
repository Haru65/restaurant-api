import buildApp from './src/app.js';

const PORT = process.env.PORT || 5000;

async function start() {
  const app = await buildApp();
  app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    app.log.info(`Server listening at ${address}`);
  });
}

start();
