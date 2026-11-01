import app from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

const host = env.nodeEnv === 'production' ? '0.0.0.0' : '127.0.0.1';

app.listen(env.port, host, () => {
  console.log(`Admin API listening on port ${env.port}`);
});

connectDatabase().catch(() => {
  console.error('Admin API database connection failed; health will report disconnected.');
});
