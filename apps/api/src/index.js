import './lib/dnsIpv4First.js';
import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { loadEnv } from './config/env.js';
import { createApp } from './app.js';
import { warmPool, getPool } from './db/pool.js';
import { verifyAccessToken } from './lib/jwt.js';
import { registerChatHandlers } from './socket/chat.js';

const env = loadEnv();
const app = createApp();

await warmPool();

const httpServer = http.createServer(app);

const origins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: origins.length ? origins : true,
    methods: ['GET', 'POST'],
  },
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    const payload = verifyAccessToken(token);
    const pool = getPool();
    const r = await pool.query('SELECT 1 FROM revoked_tokens WHERE jti = $1', [payload.jti]);
    if (r.rowCount) return next(new Error('Token revoked'));

    socket.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

registerChatHandlers(io);

const host = process.env.HOST || '0.0.0.0';
httpServer.listen(env.PORT, host, () => {
  console.log(
    `AutoHub API bound to ${host}:${env.PORT} — open in browser: http://localhost:${env.PORT}/v1/health`
  );
});
httpServer.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(
      `Port ${env.PORT} is already in use (another Node/Cursor terminal may still be running the API).\n` +
        `  • Stop that process, or\n` +
        `  • Set a different port in apps/api/.env, e.g. PORT=3002\n` +
        `Windows: netstat -ano | findstr ":${env.PORT}"  then  taskkill /PID <pid> /F`
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
