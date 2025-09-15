import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import multer from "multer";
import fs from "fs";
import path from "path";
import axios from "axios";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

// __dirname fix utk ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
const IS_VERCEL = process.env.VERCEL === '1';

// Function helper absolute URL
function toAbs(u = "") {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `${PUBLIC_BASE_URL}${u.startsWith("/") ? u : `/${u}`}`;
}

// Upload dir (Vercel → /tmp)
const UPLOAD_DIR = IS_VERCEL ? '/tmp/uploads' : path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer config
const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, UPLOAD_DIR),
    filename: (_, file, cb) => {
      const ts = Date.now();
      const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
      cb(null, `${ts}-${safe}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:8080'
    ].filter(Boolean);

    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(morgan("dev"));

// Serve uploads
app.use("/uploads", express.static(UPLOAD_DIR, {
  setHeaders(res) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
  },
}));

// === DB JSON Setup ===
const DB_FILE = path.join(UPLOAD_DIR, "tickets.json");
let DB = { seq: 1, items: [] };

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      DB = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      if (typeof DB.seq !== "number" || !isFinite(DB.seq)) DB.seq = 1;
      if (!Array.isArray(DB.items)) DB.items = [];
    }
  } catch {
    DB = { seq: 1, items: [] };
  }
}
function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2), "utf8");
  } catch (e) {
    console.error('Error saving DB:', e);
  }
}
loadDB();

function nextTicketNo() {
  const n = DB.seq++;
  saveDB();
  return "TKT-" + String(n).padStart(3, "0");
}
function autoPriority(division = "") {
  return String(division).trim().toLowerCase() === "direksi" ? "Urgent" : "Normal";
}

// === Email helper ===
async function sendEmail({ to, subject, html }) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.FROM_EMAIL || user;

  if (!host || !user || !pass || !from) {
    console.log("[mail] skipped (no SMTP). Subject:", subject, "to:", to);
    return { ok: true, skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user, pass },
  });
  await transporter.sendMail({ from, to: Array.isArray(to) ? to : [to], subject, html });
  return { ok: true };
}

// === ROUTES ===
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, port: PORT, ts: Date.now(), vercel: IS_VERCEL, env: process.env.NODE_ENV })
);

app.get("/api/config", (_req, res) => {
  const envAdmins = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  res.json({ ok: true, adminEmails: envAdmins, uploadDir: UPLOAD_DIR });
});

// GET tickets
app.get("/api/tickets", (req, res) => {
  const status = (req.query.status || "").toLowerCase();
  let rows = DB.items.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (status) rows = rows.filter(r => (r.status || "").toLowerCase() === status);

  res.json({
    ok: true,
    rows: rows.map(r => ({
      id: r.id,
      fields: {
        ID: r.id,
        Created: new Date(r.createdAt).toISOString(),
        RequesterName: r.name,
        Division: r.division,
        Prioritas: r.priority,
        Description: r.description,
        Status: r.status,
        TicketNumber: r.ticketNo,
        Notes: r.notes,
        PhotoUrl: toAbs(r.photoUrl),
        DonePhotoUrl: toAbs(r.donePhotoUrl),
        "User Requestor": { displayName: r.name, email: r.email || "" },
        "Divisi/ Departemen": r.division,
        Pelaksana: r.operator,
      },
    })),
  });
});

// POST new ticket
app.post("/api/tickets", upload.single("photo"), (req, res) => {
  const { name = "User", division = "Umum", email = "" } = req.body;
  const description = req.body.description || "";
  const priority = req.body.priority || autoPriority(division);
  const file = req.file;

  const id = Date.now();
  const ticketNo = nextTicketNo();
  const relPhoto = file ? `/uploads/${file.filename}` : "";

  const row = {
    id, ticketNo, name, email, division, description,
    status: "Belum", priority, createdAt: Date.now(),
    photoUrl: relPhoto, donePhotoUrl: "", notes: "", operator: ""
  };
  DB.items.push(row);
  saveDB();

  res.json({ ok: true, itemId: id, ticketId: ticketNo, photoUrl: toAbs(relPhoto) });
});

// POST resolve ticket
app.post("/api/tickets/:id/resolve", upload.single("photo"), (req, res) => {
  const id = Number(req.params.id);
  const t = DB.items.find(x => x.id === id);
  if (!t) return res.status(404).json({ ok: false, error: "Ticket tidak ditemukan" });

  if (req.file) t.donePhotoUrl = `/uploads/${req.file.filename}`;
  if (req.body.notes) t.notes = req.body.notes;
  if (req.body.operator) t.operator = req.body.operator;
  t.status = "Selesai";
  t.finishedAt = Date.now();
  saveDB();

  res.json({ ok: true, id: t.id, ticketId: t.ticketNo, donePhotoUrl: toAbs(t.donePhotoUrl) });
});

// POST decline ticket
app.post("/api/tickets/:id/decline", async (req, res) => {
  const id = Number(req.params.id);
  const t = DB.items.find(x => x.id === id);
  if (!t) return res.status(404).json({ ok: false, error: "Ticket tidak ditemukan" });

  t.status = "Ditolak";
  t.notes = req.body.notes || "";
  t.operator = req.body.operator || "";
  t.finishedAt = Date.now();
  saveDB();

  if (t.email) {
    const subject = `[HELPDESK] Ticket ${t.ticketNo} Ditolak`;
    const html = `<p>Halo ${t.name}, permintaan helpdesk Anda dengan nomor ${t.ticketNo} telah DITOLAK.</p>`;
    await sendEmail({ to: t.email, subject, html }).catch(console.error);
  }

  res.json({ ok: true, id: t.id, ticketId: t.ticketNo });
});

// DELETE ticket
app.delete("/api/tickets/:id", (req, res) => {
  const id = Number(req.params.id);
  const idx = DB.items.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ ok: false, error: "Ticket tidak ditemukan" });

  const removed = DB.items.splice(idx, 1);
  saveDB();
  res.json({ ok: true, id, ticketId: removed?.ticketNo || "" });
});

// Proxy uploads
app.get("/api/uploads/proxy", async (req, res) => {
  const src = req.query.src || "";
  if (!src) return res.status(400).send("src required");

  if (src.startsWith("/uploads/")) {
    const p = path.join(UPLOAD_DIR, src.replace(/^\/+uploads\/?/, ""));
    if (!fs.existsSync(p)) return res.status(404).send("Not found");
    return fs.createReadStream(p).pipe(res);
  }

  const r = await axios.get(src, { responseType: "stream" });
  if (r.headers["content-type"]) res.setHeader("Content-Type", r.headers["content-type"]);
  r.data.pipe(res);
});

// Send email manually
const mailLimiter = rateLimit({ windowMs: 10_000, max: 5 });
app.post("/api/notify/email", mailLimiter, async (req, res) => {
  try {
    const { to = [], subject = "Ticket", html = "" } = req.body;
    const out = await sendEmail({ to, subject, html });
    res.json({ ok: true, ...out });
  } catch {
    res.status(500).json({ ok: false, error: "mail failed" });
  }
});

// Export for Vercel
export default app;

// Run local
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`WKI server running on ${PUBLIC_BASE_URL}`);
    console.log(`Upload directory: ${UPLOAD_DIR}`);
  });
}
