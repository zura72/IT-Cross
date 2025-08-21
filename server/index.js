// server/index.js
import 'dotenv/config';
import express, { Router } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = Number(process.env.PORT || 4000);

// ───────────────────────── Middlewares ─────────────────────────
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5174'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploads (public)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({ dest: uploadsDir });
app.use('/uploads', express.static(uploadsDir));

// ───────────────────────── API (/api) ─────────────────────────
const api = Router();

// Health
api.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Config admin (whitelist admin dari env, koma-separated)
api.get('/config', (req, res) => {
  const raw = process.env.ADMIN_EMAILS || 'adminapp@waskitainfrastruktur.co.id';
  const adminEmails = String(raw)
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  res.json({ ok: true, adminEmails });
});

// In-memory tickets (demo)
let TICKETS = [
  {
    id: 1001,
    Created: new Date().toISOString(),
    RequesterName: 'Contoh User',
    Division: 'IT',
    Prioritas: 'Normal',
    Description: 'Keyboard tidak berfungsi.',
    PhotoUrl: '',
    Status: 'Belum',
  },
];

// List tickets (opsional filter by status)
api.get('/tickets', (req, res) => {
  const { status } = req.query;
  const rows = status
    ? TICKETS.filter(t => String(t.Status).toLowerCase() === String(status).toLowerCase())
    : TICKETS;
  res.json({ ok: true, rows });
});

// Buat ticket
api.post('/tickets', upload.single('photo'), (req, res) => {
  // Terima 'description' (utama) atau fallback 'desc' biar kompatibel
  const {
    name,
    email,
    division,
    priority,
    description,
    desc, // fallback lama
  } = req.body || {};

  const row = {
    id: Date.now(),
    Created: new Date().toISOString(),
    RequesterName: name || email || 'User',
    Division: division || '-',
    Prioritas: priority || 'Normal',
    Description: description || desc || '',
    PhotoUrl: req.file ? `/uploads/${req.file.filename}` : '',
    Status: 'Belum',
  };

  TICKETS.unshift(row);
  res.json({ ok: true, row });
});

// Selesaikan ticket
api.post('/tickets/:id/resolve', upload.single('photo'), (req, res) => {
  const id = Number(req.params.id);
  const notes = req.body?.notes || '';
  const idx = TICKETS.findIndex(t => Number(t.id) === id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Ticket not found' });

  const fileUrl = req.file ? `/uploads/${req.file.filename}` : '';
  TICKETS[idx] = {
    ...TICKETS[idx],
    Status: 'Selesai',
    ResolveNotes: notes,
    ResolvedAt: new Date().toISOString(),
    PhotoUrl: fileUrl || TICKETS[idx].PhotoUrl,
  };
  res.json({ ok: true, row: TICKETS[idx] });
});

// Chat endpoint (sederhana; opsional)
api.post('/chat', (req, res) => {
  const text = String(req.body?.message || '').trim();
  if (!text) {
    return res.json({ ok: true, reply: "Halo! Tulis keluhanmu, atau ketik 'buat tiket'." });
  }
  if (text.toLowerCase().includes('buat tiket')) {
    return res.json({ ok: true, reply: "Klik tombol 'Buat Tiket' di layar chat ya." });
  }
  return res.json({ ok: true, reply: `Saya menerima: “${text}”.` });
});

// Mount semua endpoint di /api
app.use('/api', api);

// ─────────────────────── (Optional) Serve Chatbot Build ───────────────────────
// Jika kamu build Vite (web) → /web/dist, bisa diserve di /chatbot
const chatbotDist = path.join(__dirname, '..', 'web', 'dist');
if (fs.existsSync(chatbotDist)) {
  app.use('/chatbot', express.static(chatbotDist));
  app.get('/chatbot/*', (_req, res) => {
    res.sendFile(path.join(chatbotDist, 'index.html'));
  });
}

// ───────────────────────── Start ─────────────────────────
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
