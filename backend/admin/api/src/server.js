import app from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

const host = env.nodeEnv === 'production' ? '0.0.0.0' : '127.0.0.1';

if (process.env.AUTH_DISABLED === 'true' && process.env.NODE_ENV === 'production') {
  console.error('Refusing to start admin API: AUTH_DISABLED cannot be used in production.');
  process.exit(1);
}

if (process.env.AUTH_DISABLED === 'true') {
  console.warn('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\nADMIN AUTH IS DISABLED. Local development only.\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
}

app.listen(env.port, process.env.AUTH_DISABLED === 'true' ? '127.0.0.1' : host, () => {
  console.log(`Admin API listening on port ${env.port}`);
});

connectDatabase().catch(() => {
  console.error('Admin API database connection failed; health will report disconnected.');
});
