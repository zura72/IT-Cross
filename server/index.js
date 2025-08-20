// server/index.js
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paksa load .env dari folder server/
dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import ticketsRouter from './routes/tickets.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());

// Health + verifikasi env terbaca (tanpa bocorin secret)
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    env: {
      GRAPH_TENANT_ID: !!process.env.GRAPH_TENANT_ID,
      GRAPH_CLIENT_ID:  !!process.env.GRAPH_CLIENT_ID,
      GRAPH_CLIENT_SECRET: !!process.env.GRAPH_CLIENT_SECRET,
      SP_HOSTNAME: process.env.SP_HOSTNAME || null,
      SP_SITE_PATH: process.env.SP_SITE_PATH || null,
      SP_LIST_NAME: process.env.SP_LIST_NAME || null,
      DEFAULT_PERSON_UPN: !!process.env.DEFAULT_PERSON_UPN,
    },
  });
});

app.use('/api/tickets', ticketsRouter);

app.listen(PORT, () => {
  const mask = v => (v ? v.slice(0,4) + '…' + v.slice(-4) : null);
  console.log('API listening on', PORT);
  console.log('ENV check:', {
    TENANT: process.env.GRAPH_TENANT_ID,
    CLIENT: process.env.GRAPH_CLIENT_ID,
    SECRET: mask(process.env.GRAPH_CLIENT_SECRET),
  });
});
