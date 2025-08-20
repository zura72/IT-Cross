// server/routes/tickets.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import {
  graphAppToken,
  getSiteId,
  getListId,
  getFieldMap,
  getListColumnsMeta,
  getNextNumber,
  createListItem,
  patchListItemFields,
  // uploadItemPhoto, // ❌ jangan pakai ini untuk custom list
  uploadImageToLibrary, // ✅ pakai library dokumen
  getUserLookupId,
  graphSendMail,
} from '../services/sharepoint.js'; // :contentReference[oaicite:8]{index=8}

const router = express.Router();
const GRAPH = 'https://graph.microsoft.com/v1.0';

/* ---------- upload temp dir ---------- */
const uploadDir = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

/* ---------- env config ---------- */
const cfg = {
  tenantId: process.env.GRAPH_TENANT_ID,
  clientId: process.env.GRAPH_CLIENT_ID,
  clientSecret: process.env.GRAPH_CLIENT_SECRET,

  host: process.env.SP_HOSTNAME,   // contoso.sharepoint.com
  sitePath: process.env.SP_SITE_PATH, // /sites/Helpdesk
  listName: process.env.SP_LIST_NAME, // Tickets

  senderUpn: process.env.SENDER_UPN || '',
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),

  defaultPersonUpn: process.env.DEFAULT_PERSON_UPN || '',
};

/* ---------- cached ctx ---------- */
let cached = { token: null, tokenAt: 0, siteId: null, listId: null, fieldMap: null };

async function ensureCtx() {
  const now = Date.now();
  if (!cached.token || now - cached.tokenAt > 45 * 60 * 1000) {
    cached.token = await graphAppToken({
      tenantId: cfg.tenantId,
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
    });
    cached.tokenAt = now;
    cached.siteId = await getSiteId(cached.token, cfg.host, cfg.sitePath);
    cached.listId = await getListId(cached.token, cached.siteId, cfg.listName);
    cached.fieldMap = await getFieldMap(cached.token, cached.siteId, cached.listId);
  }
  return cached;
}

const isSystemOrReadonly = (col) => {
  const sys =
    /^LinkTitle/i.test(col.internalName) ||
    ['Attachments', 'ContentType', 'Edit', 'DocIcon', 'ID', 'UniqueId', 'FileRef'].includes(col.internalName);
  return sys || col.readOnly || col.hidden || col.type === 'calculated';
};

/* =========================================================
 * LIST tickets — dipakai Admin.jsx (GET /api/tickets)
 * =======================================================*/
router.get('/', async (_req, res) => {
  try {
    const { token, siteId, listId } = await ensureCtx();
    const url =
      `${GRAPH}/sites/${siteId}/lists/${listId}/items` +
      `?$expand=fields($select=Title,RequesterName,Division,Description,Status,Created,Modified)` +
      `&$orderby=createdDateTime desc`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`list items: ${r.status} ${await r.text()}`);
    const j = await r.json();
    res.json({ ok: true, items: j.value || [] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}); // cocok dengan web/Admin.jsx & web/api.js :contentReference[oaicite:9]{index=9} :contentReference[oaicite:10]{index=10}

/* =========================================================
 * CREATE ticket — dipanggil oleh web/App.jsx → api.createTicket()
 * =======================================================*/
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    // Web mengirim "desc", bukan "description" → terima dua-duanya
    const { name, division, description, desc } = req.body; // :contentReference[oaicite:11]{index=11}
    const descriptionText = description ?? desc ?? '';

    const { token, siteId, listId } = await ensureCtx();
    const { cols, byLabel } = await getListColumnsMeta(token, siteId, listId);

    const setChoice = (obj, m, value) => {
      if (!m || isSystemOrReadonly(m)) return;
      const v = value && Array.isArray(m.choices) && m.choices.includes(value)
        ? value
        : (m.choices && m.choices[0]) || value;
      if (v !== undefined) obj[m.internalName] = v;
    };
    const setGeneric = (obj, m, value) => {
      if (!m || isSystemOrReadonly(m)) return;
      if (value !== undefined) obj[m.internalName] = value;
    };

    const f = {};
    // Isi kedua versi label agar kompatibel dengan tampilan Admin
    setGeneric(f, byLabel.get('Title'), `[${new Date().toISOString().slice(0,10)}] ${name || 'Guest'}`);
    setGeneric(f, byLabel.get('RequesterName'), name || '');              // untuk Admin.jsx :contentReference[oaicite:12]{index=12}
    setGeneric(f, byLabel.get('Division'), division || '');               // untuk Admin.jsx
    setGeneric(f, byLabel.get('Description'), descriptionText);           // untuk Admin.jsx
    setGeneric(f, byLabel.get('Insiden/ Keluhan saat ini'), descriptionText); // label Indonesia (jika ada)
    const statusMeta = byLabel.get('Status');
    if (statusMeta?.type === 'choice') {
      const pref = ['Belum', 'Open', 'New', 'Submitted'];
      setChoice(f, statusMeta, pref.find(p => statusMeta.choices?.includes(p)));
    }
    setGeneric(f, byLabel.get('Waktu Pelaporan'), new Date().toISOString());
    const numMeta = byLabel.get('TicketNumber');
    if (numMeta?.type === 'number') {
      setGeneric(f, numMeta, await getNextNumber(token, siteId, listId, numMeta.internalName));
    }

    // Default untuk kolom required lain
    for (const c of cols) {
      if (!c.required) continue;
      if (f[c.internalName] !== undefined) continue;
      if (isSystemOrReadonly(c)) continue;
      if (c.type === 'choice' && c.choices?.length) f[c.internalName] = c.choices[0];
      else if (c.type === 'dateTime') f[c.internalName] = new Date().toISOString();
      else if (c.type === 'number') f[c.internalName] = 0;
      else f[c.internalName] = '-';
    }

    // CREATE item
    const item = await createListItem(token, siteId, listId, f);

    // Foto: simpan ke Document Library (mis. Site Assets) di folder Tickets/{itemId}
    if (req.file) {
      const buffer = fs.readFileSync(req.file.path);
      await uploadImageToLibrary(token, siteId, {
        libraryName: 'Site Assets',
        itemId: item.id,
        fileName: req.file.originalname || `upload-${Date.now()}.jpg`,
        buffer,
        host: cfg.host,
        sitePath: cfg.sitePath,
      });
      fs.unlink(req.file.path, () => {});
    }

    // Email opsional ke admin
    try {
      if (cfg.senderUpn && cfg.adminEmails.length) {
        const subject = `Ticket Baru #${item.id} - ${name || 'Guest'}`;
        const html = `
          <p><b>Ticket ID:</b> ${item.id}</p>
          <p><b>Nama:</b> ${name || '-'}</p>
          <p><b>Divisi:</b> ${division || '-'}</p>
          <p><b>Keluhan:</b><br/>${(descriptionText || '').replace(/\n/g, '<br/>')}</p>
          <p>List: https://${cfg.host}${cfg.sitePath}/Lists/${encodeURIComponent(cfg.listName)}/AllItems.aspx</p>
        `;
        await graphSendMail(token, cfg.senderUpn, cfg.adminEmails, subject, html);
      }
    } catch (mailErr) {
      console.warn('sendMail warning:', mailErr?.message || mailErr);
    }

    // Kompatibel dengan web/App.jsx yang baca "ticketId"
    res.json({ ok: true, itemId: item.id, ticketId: item.id }); // :contentReference[oaicite:13]{index=13}
  } catch (e) {
    console.error('CREATE_TICKET_ERROR:', e?.message || e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}); // basis asli: server/routes/tickets.js :contentReference[oaicite:14]{index=14}

/* =========================================================
 * RESOLVE ticket — dipakai Admin.jsx → api.resolveTicket()
 * =======================================================*/
router.post('/:itemId/resolve', upload.single('photo'), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { notes } = req.body;

    const { token, siteId, listId } = await ensureCtx();
    const { byLabel } = await getListColumnsMeta(token, siteId, listId);
    const patch = {};

    // Status → Completed / Selesai / Closed (ambil yang tersedia)
    const mStatus = byLabel.get('Status');
    if (mStatus && !isSystemOrReadonly(mStatus)) {
      const done =
        ['Selesai', 'Completed', 'Done', 'Closed'].find(v => mStatus.choices?.includes(v)) ||
        mStatus.choices?.[0] ||
        'Completed';
      patch[mStatus.internalName] = done;
    }
    // Waktu Selesai
    const mSelesai = byLabel.get('Waktu Selesai');
    if (mSelesai && !isSystemOrReadonly(mSelesai)) patch[mSelesai.internalName] = new Date().toISOString();
    // Catatan penyelesaian
    if (notes) {
      const mNotes = byLabel.get('Description') || byLabel.get('Insiden/ Keluhan saat ini');
      if (mNotes && !isSystemOrReadonly(mNotes)) patch[mNotes.internalName] = notes;
    }

    await patchListItemFields(token, siteId, listId, itemId, patch);

    if (req.file) {
      const buffer = fs.readFileSync(req.file.path);
      await uploadImageToLibrary(token, siteId, {
        libraryName: 'Site Assets',
        itemId,
        fileName: req.file.originalname || `resolved-${Date.now()}.jpg`,
        buffer,
        host: cfg.host,
        sitePath: cfg.sitePath,
      });
      fs.unlink(req.file.path, () => {});
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('RESOLVE_TICKET_ERROR:', e?.message || e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export default router;
