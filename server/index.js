import express from 'express';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { resolve } from 'node:path';
const app = createApp({
  dbPath: process.env.DATABASE_PATH || resolve('.data/brainadz.sqlite'),
  demo: process.env.DEMO_MODE !== 'false',
  secureCookies: process.env.SECURE_COOKIES === 'true',
});
if (process.env.NODE_ENV === 'production' || process.argv.includes('--production')) {
  app.use(express.static(resolve('dist')));
  app.get('/{*path}', (_, res) => res.sendFile(resolve('dist/index.html')));
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { port: Number(process.env.PORT || 3000) + 1 } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
const server = createServer(app);
server.listen(port, process.env.HOST || '0.0.0.0', () =>
  console.log(`BrainADZ People listening on port ${port}`),
);
process.on('SIGTERM', () =>
  server.close(() => {
    app.locals.db.close();
    process.exit(0);
  }),
);
