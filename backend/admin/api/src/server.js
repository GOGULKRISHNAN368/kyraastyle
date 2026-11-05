import app from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

if (env.nodeEnv === 'production') {
  console.error('Refusing to start admin API: unauthenticated admin access is local development only.');
  process.exit(1);
}

console.warn('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\nADMIN AUTH IS DISABLED. Local development only.\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');

app.listen(env.port, '127.0.0.1', () => {
  console.log(`Admin API listening on port ${env.port}`);
});

connectDatabase().catch(() => {
  console.error('Admin API database connection failed; health will report disconnected.');
});
