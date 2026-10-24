import express from 'express';
import { createServer } from 'node:http';
import { createHotelRouter } from './hospitality/router.js';
import { createApp } from './app.js';
import { resolve } from 'node:path';
const app = createApp({
  dbPath: process.env.DATABASE_PATH || resolve('.data/brainadz.sqlite'),
  demo: process.env.DEMO_MODE !== 'false',
  secureCookies: process.env.SECURE_COOKIES === 'true',
});
const hotel = createHotelRouter({
  dbPath:
    process.env.HOSPITALITY_DATABASE_PATH ||
    (process.env.DATABASE_PATH === ':memory:' ? ':memory:' : resolve('.data/hospitality.sqlite')),
  demo: process.env.DEMO_MODE !== 'false',
  secureCookies: process.env.SECURE_COOKIES === 'true',
});
app.use('/hospitality-api/v1', hotel);
if (process.env.NODE_ENV === 'production' || process.argv.includes('--production')) {
  app.use(express.static(resolve('dist'), { index: false }));
  app.get('/', (_, res) => res.sendFile(resolve('dist/hospitality.html')));
  app.get('/hr', (_, res) => res.sendFile(resolve('dist/index.html')));
  app.get('/{*path}', (_, res) => res.sendFile(resolve('dist/index.html')));
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { port: Number(process.env.PORT || 3000) + 1 } },
    appType: 'spa',
  });
  app.use((req, res, next) => {
    if (req.path === '/') req.url = '/hospitality.html';
    else if (req.path === '/hr') req.url = '/index.html';
    next();
  });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
const server = createServer(app);
server.listen(port, process.env.HOST || '0.0.0.0', () =>
  console.log(`BrainADZ Hospitality OS and People listening on port ${port}`),
);
process.on('SIGTERM', () =>
  server.close(() => {
    app.locals.db.close();
    hotel.db.close();
    process.exit(0);
  }),
);
