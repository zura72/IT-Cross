// server/helpdesk-extra.js (contoh Express middleware)
import express from "express";
import fetch from "node-fetch";
import nodemailer from "nodemailer"; // pakai SMTP; atau gunakan Graph SDK

const router = express.Router();

/** Proxy lampiran supaya tidak redirect ke login SharePoint/Blob */
router.get("/uploads/proxy", async (req, res) => {
  try {
    const src = req.query.src;
    if (!src) return res.status(400).send("src required");
    const r = await fetch(src); // jika perlu, tambahkan header auth di sini
    if (!r.ok) return res.status(r.status).send(await r.text());
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=300");
    r.body.pipe(res);
  } catch (e) {
    res.status(500).send(String(e));
  }
});

/** Kirim email notifikasi ke admin */
router.post("/notify/email", express.json(), async (req, res) => {
  try {
    const { to = [], subject = "Ticket Baru", html = "" } = req.body || {};
    // === PILIH SALAH SATU CARA ===
    // (A) SMTP perusahaan
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: 587, secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: '"IT Ticket Helper" <no-reply@waskitainfrastruktur.co.id>',
      to: Array.isArray(to) ? to.join(",") : to,
      subject, html,
    });
    // (B) atau Microsoft Graph sendMail (butuh aplikasi + Mail.Send)
    // await graphClient.api("/me/sendMail").post({ message: { subject, body: { contentType: "HTML", content: html }, toRecipients: to.map(x=>({emailAddress:{address:x}})) } });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

export default router;
