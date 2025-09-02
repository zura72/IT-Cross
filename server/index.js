// server/index.js
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

/* ====== setup dasar ====== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 4000;

// BASE publik untuk bikin URL absolut
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
function toAbs(u = "") {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `${PUBLIC_BASE_URL}${u.startsWith("/") ? u : `/${u}`}`;
}

/* ====== folder uploads ====== */
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ====== multer (upload single "photo") ====== */
const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, UPLOAD_DIR),
    filename: (_, file, cb) => {
      const ts = Date.now();
      const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
      cb(null, `${ts}-${safe}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/* ====== middlewares ====== */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(morgan("dev"));

/* ====== static uploads ====== */
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    setHeaders(res) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  })
);

/* ====== in-memory DB + persist ke file ====== */
const DB_FILE = path.join(UPLOAD_DIR, "tickets.json");
let DB = { seq: 1, items: [] };

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf8");
      const parsed = JSON.parse(raw);
      DB = parsed && typeof parsed === "object" ? parsed : { seq: 1, items: [] };
      if (typeof DB.seq !== "number" || !isFinite(DB.seq)) DB.seq = 1;
      if (!Array.isArray(DB.items)) DB.items = [];
    } else {
      DB = { seq: 1, items: [] };
    }
  } catch {
    DB = { seq: 1, items: [] };
  }
}
function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}
loadDB();
if (typeof DB.seq !== "number" || !Array.isArray(DB.items)) {
  DB = { seq: 1, items: [] };
  saveDB();
}

function nextTicketNo() {
  const n = DB.seq++;
  saveDB();
  return "TKT-" + String(n).padStart(3, "0");
}
function autoPriority(division = "") {
  return String(division).trim().toLowerCase() === "direksi" ? "Urgent" : "Normal";
}

/* ===== helper email ===== */
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

/* ===== health & config ===== */
app.get("/api/health", (_req, res) => res.json({ ok: true, port: PORT, ts: Date.now() }));
app.get("/api/config", (_req, res) => {
  const envAdmins = (process.env.ADMIN_EMAILS || "adminapp@waskitainfrastruktur.co.id")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.json({ ok: true, adminEmails: envAdmins });
});

/* ===== Tickets ===== */
app.get("/api/tickets", (req, res) => {
  const status = (req.query.status || "").toLowerCase(); // "" | "belum" | "selesai" | "ditolak"
  const srcItems = Array.isArray(DB.items) ? DB.items : [];
  let rows = srcItems.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (status) rows = rows.filter((r) => (r.status || "").toLowerCase() === status);

  const payload = rows.map((r) => ({
    id: r.id,
    fields: {
      ID: r.id,
      Created: new Date(r.createdAt || Date.now()).toISOString(),
      RequesterName: r.name,
      Division: r.division,
      Prioritas: r.priority || "Normal",
      Description: r.description || "",
      Status: r.status || "Belum",
      TicketNumber: r.ticketNo || "",
      Notes: r.notes || "",
      "Screenshot Bukti Insiden/ Keluhan": toAbs(r.photoUrl || ""),
      PhotoUrl: toAbs(r.photoUrl || ""),
      DonePhotoUrl: toAbs(r.donePhotoUrl || ""),
      "User Requestor": { displayName: r.name, email: r.email || "" },
      "Divisi/ Departemen": r.division || "",
      Pelaksana: r.operator || "",
    },
  }));

  res.json({ ok: true, rows: payload });
});

// Buat tiket (dipanggil ChatHost)
app.post("/api/tickets", upload.single("photo"), (req, res) => {
  try {
    const { name = "User", division = "Umum" } = req.body;
    const description = req.body.description || req.body.desc || "";
    const priority = req.body.priority || autoPriority(division);
    const file = req.file;

    const id = Date.now();
    const ticketNo = nextTicketNo();
    const relPhoto = file ? `/uploads/${file.filename}` : "";

    const row = {
      id,
      ticketNo,
      name,
      email: req.body.email || "",
      division,
      description,
      status: "Belum",        // Belum | Selesai | Ditolak
      priority,
      createdAt: Date.now(),
      photoUrl: relPhoto,     // relatif
      donePhotoUrl: "",
      notes: "",
      operator: "",
    };

    if (!Array.isArray(DB.items)) DB.items = [];
    DB.items.push(row);
    saveDB();

    res.json({ ok: true, itemId: id, ticketId: ticketNo, photoUrl: toAbs(relPhoto) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

// Konfirmasi tiket selesai
app.post("/api/tickets/:id/resolve", upload.single("photo"), (req, res) => {
  try {
    const id = Number(req.params.id);
    const t = Array.isArray(DB.items) ? DB.items.find((x) => x.id === id) : null;
    if (!t) return res.status(404).json({ ok: false, error: "Ticket tidak ditemukan" });

    if (req.file) t.donePhotoUrl = `/uploads/${req.file.filename}`;
    if (typeof req.body.notes === "string") t.notes = req.body.notes;
    if (typeof req.body.operator === "string") t.operator = req.body.operator;
    t.status = "Selesai";
    t.finishedAt = Date.now();
    saveDB();

    res.json({ ok: true, id: t.id, ticketId: t.ticketNo, donePhotoUrl: toAbs(t.donePhotoUrl) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

// >>> Tolak tiket (Decline)
app.post("/api/tickets/:id/decline", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const t = Array.isArray(DB.items) ? DB.items.find((x) => x.id === id) : null;
    if (!t) return res.status(404).json({ ok: false, error: "Ticket tidak ditemukan" });

    const notes = String(req.body.notes || "").trim();
    const operator = String(req.body.operator || "").trim();

    t.status = "Ditolak";
    t.notes = notes;
    t.operator = operator || t.operator || "";
    t.finishedAt = Date.now();
    saveDB();

    // Kirim email ke user (jika ada email & SMTP di-set)
    const to = t.email || "";
    if (to) {
      const subject = `[HELPDESK] Ticket ${t.ticketNo} Ditolak`;
      const html = `
        <div style="font-family:system-ui,Segoe UI,Arial,sans-serif">
          <p>Halo <b>${t.name || "User"}</b>,</p>
          <p>Permintaan helpdesk Anda dengan nomor <b>${t.ticketNo}</b> telah <b>DITOLAK</b>.</p>
          <p><b>Alasan/ Catatan:</b><br/>${(notes || "-").replace(/\n/g,"<br/>")}</p>
          <hr/>
          <p><b>Ringkasan:</b></p>
          <ul>
            <li>Divisi: ${t.division || "-"}</li>
            <li>Prioritas: ${t.priority || "-"}</li>
            <li>Deskripsi: ${t.description || "-"}</li>
            <li>Pelaksana/Operator: ${t.operator || "-"}</li>
          </ul>
          <p>Terima kasih.</p>
        </div>`;
      await sendEmail({ to, subject, html }).catch((e) =>
        console.log("[mail decline] error:", e.message)
      );
    }

    res.json({ ok: true, id: t.id, ticketId: t.ticketNo });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

// >>> Hapus tiket (Delete)
app.delete("/api/tickets/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Array.isArray(DB.items)) DB.items = [];
    const idx = DB.items.findIndex((x) => x.id === id);
    if (idx === -1) return res.status(404).json({ ok: false, error: "Ticket tidak ditemukan" });

    const [removed] = DB.items.splice(idx, 1);
    saveDB();

    res.json({ ok: true, id, ticketId: removed?.ticketNo || "" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

/* ====== Proxy gambar (opsional) ====== */
app.get("/api/uploads/proxy", async (req, res) => {
  try {
    const src = req.query.src || "";
    if (!src) return res.status(400).send("src required");

    if (src.startsWith("/uploads/")) {
      const p = path.join(__dirname, src.replace(/^\/+/, ""));
      if (!fs.existsSync(p)) return res.status(404).send("Not found");
      return fs.createReadStream(p).pipe(res);
    }

    const r = await axios.get(src, { responseType: "stream" });
    if (r.headers["content-type"]) res.setHeader("Content-Type", r.headers["content-type"]);
    r.data.pipe(res);
  } catch {
    res.status(500).send("proxy failed");
  }
});

/* ====== Email notifikasi manual endpoint (tetap ada) ====== */
const mailLimiter = rateLimit({ windowMs: 10_000, max: 5 });
app.post("/api/notify/email", mailLimiter, async (req, res) => {
  const { to = [], subject = "Ticket", html = "" } = req.body || {};
  try {
    const out = await sendEmail({ to, subject, html });
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(500).json({ ok: false, error: "mail failed" });
  }
});

/* ====== start ====== */
app.listen(PORT, () => {
  console.log(`WKI server running on ${PUBLIC_BASE_URL}`);
});
