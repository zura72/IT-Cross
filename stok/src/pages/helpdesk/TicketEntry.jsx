// src/pages/helpdesk/TicketEntry.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useMsal } from "@azure/msal-react";

/* ===== ENV (CRA/Webpack) ===== */
const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");

/* ===== Fetch helpers ===== */
async function apiGet(path) {
  const url = `${API_BASE}${path}`;
  const r = await fetch(url, { credentials: "include" }).catch((e) => {
    throw new Error("Network error: " + e.message);
  });
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await r.text().catch(() => "");
    const head = text.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(`Server mengirim non-JSON (${r.status}): ${head}`);
  }
  const j = await r.json();
  if (!r.ok || j?.ok === false) {
    throw new Error(j?.error || `HTTP ${r.status}`);
  }
  return j;
}
async function apiPost(path, body) {
  const url = `${API_BASE}${path}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
    credentials: "include",
  }).catch((e) => {
    throw new Error("Network error: " + e.message);
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
  return j;
}
async function apiPostForm(path, formData) {
  const url = `${API_BASE}${path}`;
  const r = await fetch(url, { method: "POST", body: formData, credentials: "include" }).catch((e) => {
    throw new Error("Network error: " + e.message);
  });
  const ct = r.headers.get("content-type") || "";
  const j = ct.includes("application/json") ? await r.json() : { ok: r.ok };
  if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
  return j;
}
async function apiDelete(path) {
  const url = `${API_BASE}${path}`;
  const r = await fetch(url, { method: "DELETE", credentials: "include" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
  return j;
}

/**
 * Ticket Entry (Belum)
 */
export default function TicketEntry() {
  const { accounts } = useMsal();
  const me = accounts?.[0];
  const operatorName =
    me?.name ||
    me?.idTokenClaims?.name ||
    me?.idTokenClaims?.preferred_username ||
    me?.username ||
    "Admin";

  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [activeResolve, setActiveResolve] = useState(null);
  const [activeDecline, setActiveDecline] = useState(null);
  const [activeDelete, setActiveDelete] = useState(null);

  /* ---------- Fetch ---------- */
  const load = useCallback(async () => {
    setLoading(true);
    setErr(""); setOkMsg("");
    try {
      const j = await apiGet("/api/tickets?status=Belum");
      const items = (j.rows || []).map(normalizeRow);
      setRows(items);
      localStorage.setItem("helpdesk_demo_tickets", JSON.stringify(items));
    } catch (e) {
      setErr(e.message || String(e));
      const demo = localStorage.getItem("helpdesk_demo_tickets");
      setRows(demo ? JSON.parse(demo) : sampleRows());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  /* ---------- Filter ---------- */
  useEffect(() => {
    const s = (q || "").toLowerCase().trim();
    if (!s) return setFiltered(rows);
    setFiltered(
      rows.filter((r) =>
        [
          r.ticketNo, r.userRequestor, r.pelaksana, r.divisi, r.prioritas, r.deskripsi,
        ].join(" ").toLowerCase().includes(s)
      )
    );
  }, [q, rows]);

  /* ---------- Actions ---------- */
  async function handleResolve(id, file, notes) {
    try {
      const fd = new FormData();
      if (file)  fd.append("photo", file, file.name);
      if (notes) fd.append("notes", notes);
      fd.append("operator", operatorName);

      const res = await apiPostForm(`/api/tickets/${id}/resolve`, fd);
      setOkMsg(`Ticket ${res.ticketId ? `(${res.ticketId})` : `#${id}`} dikonfirmasi selesai.`);
      setActiveResolve(null);
      await load();
    } catch (e) { setErr(e.message || String(e)); }
  }

  async function handleDecline(id, notes) {
    try {
      const res = await apiPost(`/api/tickets/${id}/decline`, { notes, operator: operatorName });
      setOkMsg(`Ticket ${res.ticketId ? `(${res.ticketId})` : `#${id}`} ditolak & user diberi email.`);
      setActiveDecline(null);
      await load();
    } catch (e) { setErr(e.message || String(e)); }
  }

  async function handleDelete(id) {
    try {
      const res = await apiDelete(`/api/tickets/${id}`);
      setOkMsg(`Ticket ${res.ticketId ? `(${res.ticketId})` : `#${id}`} dihapus.`);
      setActiveDelete(null);
      await load();
    } catch (e) { setErr(e.message || String(e)); }
  }

  /* ---------- Print ---------- */
  function handlePrint() {
    const head = `
      <meta charset="utf-8"/>
      <title>Ticket Entry (Belum)</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font: 12px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#000; }
        h1 { margin:0 0 8px; font-size:18px; }
        table { width:100%; border-collapse:collapse; border:1.5pt solid #000; }
        th,td { border:0.9pt solid #000; padding:6px 8px; vertical-align:top; }
        thead th { background:#f3f4f6; text-align:left; }
      </style>`;
    const body = filtered.map(r => `
      <tr>
        <td>${esc(r.ticketNo || "-")}</td>
        <td>${r.waktu}</td>
        <td>${esc(r.userRequestor)}</td>
        <td>${esc(r.pelaksana || "-")}</td>
        <td>${esc(r.divisi)}</td>
        <td>${esc(r.prioritas)}</td>
        <td>${esc(r.deskripsi || "")}</td>
      </tr>`).join("");
    const html = `<!doctype html><html><head>${head}</head><body>
      <h1>Ticket Entry (Belum)</h1>
      <table>
        <thead><tr>
          <th>No. Ticket</th><th>Waktu</th><th>User Requestor</th><th>Pelaksana</th>
          <th>Divisi</th><th>Prioritas</th><th>Keluhan</th>
        </tr></thead>
        <tbody>${body}</tbody>
      </table>
      <script>onload=()=>{print();setTimeout(()=>close(),300)}</script>
    </body></html>`;
    const w = window.open("", "_blank", "noopener,noreferrer");
    w.document.open(); w.document.write(html); w.document.close();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-1 text-[#215ba6] dark:text-white">
            Ticket Entry <span className="text-gray-500">(Belum)</span>
          </h2>
          <p className="text-sm text-gray-500">
            <i>Sumber data:</i>{" "}
            <code className="bg-gray-100 px-1 rounded">
              {(API_BASE || "") + "/api/tickets?status=Belum"}
            </code>
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari: no tiket, user, divisi, keluhan…"
            className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white w-64"
          />
          <button onClick={load} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">
            {loading ? "Loading…" : "Reload"}
          </button>
          <button onClick={handlePrint} className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100">
            Print
          </button>
        </div>
      </div>

      {/* Notif */}
      {err   && <Banner type="error" onClose={() => setErr("")}><b>Error:</b> {err}</Banner>}
      {okMsg && <Banner type="ok"    onClose={() => setOkMsg("")}>{okMsg}</Banner>}

      {/* Counter */}
      <div className="text-sm text-gray-600">Total: {filtered.length}{q ? ` (dari ${rows.length})` : ""}</div>

      {/* Tabel */}
      <div className="bg-white/95 dark:bg-gray-800/90 rounded-2xl p-6 shadow-xl">
        <div className="overflow-x-auto rounded-xl shadow">
          <table className="min-w-full w-full text-base table-auto">
            <thead>
              <tr className="bg-blue-50 dark:bg-gray-800 text-[#215ba6] dark:text-white text-lg">
                <Th className="w-28">No. Ticket</Th>
                <Th className="w-44">Waktu</Th>
                <Th className="w-56">User Requestor</Th>
                <Th className="w-56">Pelaksana</Th>
                <Th className="w-40">Divisi</Th>
                <Th className="w-32">Prioritas</Th>
                <Th>Keluhan</Th>
                <Th className="w-28">Lampiran</Th>
                <Th className="w-[260px] text-right">Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-gray-400">Loading data…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-gray-400">Tidak ada tiket.</td></tr>
              ) : (
                filtered.map((r, i) => (
                  <Row
                    key={r.id}
                    r={{ ...r, pelaksana: r.pelaksana || operatorName }}
                    onOpenResolve={() => setActiveResolve(r)}
                    onOpenDecline={() => setActiveDecline(r)}
                    onOpenDelete={() => setActiveDelete(r)}
                    zebra={i % 2 === 1}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeResolve && <ResolveModal row={activeResolve} onClose={() => setActiveResolve(null)} onSubmit={handleResolve} />}
      {activeDecline && <DeclineModal row={activeDecline} onClose={() => setActiveDecline(null)} onSubmit={handleDecline} />}
      {activeDelete && <DeleteConfirm row={activeDelete} onClose={() => setActiveDelete(null)} onSubmit={handleDelete} />}
    </div>
  );
}

/* ===== Presentational ===== */
function Th({ children, className = "" }) {
  return <th className={`px-5 py-4 font-semibold text-xs uppercase tracking-wide ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-5 py-3 align-top ${className}`}>{children}</td>;
}

function Row({ r, onOpenResolve, onOpenDecline, onOpenDelete, zebra }) {
  return (
    <tr className={`${zebra ? "bg-blue-50/60 dark:bg-gray-800/60" : ""} hover:bg-gray-50`}>
      <Td className="text-gray-800 dark:text-gray-100 font-medium">{r.ticketNo || "-"}</Td>
      <Td className="text-gray-800 dark:text-gray-100">{r.waktu}</Td>

      <Td>
        <div className="flex items-center gap-3">
          <Avatar name={r.userRequestor} />
          <div className="leading-tight">
            <div className="font-medium text-gray-900 dark:text-gray-100">{r.userRequestor || "-"}</div>
            <div className="text-xs text-gray-500">{r.email || ""}</div>
          </div>
        </div>
      </Td>

      <Td><Chip>{r.pelaksana || "-"}</Chip></Td>
      <Td><Chip>{r.divisi || "-"}</Chip></Td>
      <Td><PriorityChip value={r.prioritas} /></Td>

      <Td>
        <div className="max-w-[560px] whitespace-pre-wrap text-gray-800 dark:text-gray-100">
          {r.deskripsi || "-"}
        </div>
      </Td>

      <Td>
        {r.photoUrl ? (
          <a href={r.photoUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
            Lihat
          </a>
        ) : <span className="text-gray-400">-</span>}
      </Td>

      <Td className="text-right">
        <div className="inline-flex gap-2">
          <button
            onClick={onOpenResolve}
            className="inline-flex items-center px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
            Konfirmasi
          </button>
          <button
            onClick={onOpenDecline}
            className="inline-flex items-center px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700 shadow-sm">
            Tolak
          </button>
          <button
            onClick={onOpenDelete}
            className="inline-flex items-center px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 shadow-sm">
            Hapus
          </button>
        </div>
      </Td>
    </tr>
  );
}

function Avatar({ name = "" }) {
  const init = useMemo(() => {
    const parts = String(name).trim().split(/\s+/);
    return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
  }, [name]);
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-sm font-semibold shadow">
      {init.toUpperCase()}
    </div>
  );
}
function Chip({ children }) {
  return <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 text-xs">{children}</span>;
}
function PriorityChip({ value = "" }) {
  const v = String(value || "").toLowerCase();
  const cls =
    v.includes("urgent") ? "bg-red-200 text-red-900 border-red-300" :
    v.includes("high")   ? "bg-red-100 text-red-800 border-red-200" :
    v.includes("low")    ? "bg-green-100 text-green-800 border-green-200" :
                           "bg-yellow-100 text-yellow-800 border-yellow-200";
  return <span className={`inline-flex px-2 py-0.5 rounded border text-xs ${cls}`}>{value || "-"}</span>;
}

function Banner({ type = "ok", children, onClose }) {
  const style = type === "error"
    ? "bg-red-50 text-red-800 border-red-200"
    : "bg-emerald-50 text-emerald-800 border-emerald-200";
  return (
    <div className={`px-3 py-2 rounded-lg border ${style} flex items-start gap-2`}>
      <span className="mt-0.5">🔔</span>
      <div className="text-sm">{children}</div>
      <button onClick={onClose} className="ml-auto text-xs underline">tutup</button>
    </div>
  );
}

/* ===== Modals ===== */
function ResolveModal({ row, onClose, onSubmit }) {
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  async function submit() { setBusy(true); await onSubmit(row.id, file, notes); setBusy(false); }
  return (
    <Modal title={`Konfirmasi ${row.ticketNo || `#${row.id}`}`} onClose={onClose}>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
        Tandai tiket sebagai <b>selesai</b>. Tambahkan foto/catatan (opsional).
      </p>
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium">Lampirkan foto (opsional)</label>
          <input type="file" accept="image/*" onChange={(e)=>setFile(e.target.files?.[0]||null)} className="block w-full text-sm"/>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium">Catatan (opsional)</label>
          <input type="text" value={notes} onChange={(e)=>setNotes(e.target.value)}
                 className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">Batal</button>
        <button onClick={submit} disabled={busy}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow disabled:opacity-60">
          {busy ? "Menyimpan…" : "Konfirmasi Selesai"}
        </button>
      </div>
    </Modal>
  );
}

function DeclineModal({ row, onClose, onSubmit }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const canSubmit = notes.trim().length >= 5; // wajib ada alasan minimal 5 huruf
  async function submit() { setBusy(true); await onSubmit(row.id, notes); setBusy(false); }
  return (
    <Modal title={`Tolak ${row.ticketNo || `#${row.id}`}`} onClose={onClose}>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
        Tuliskan <b>alasan penolakan</b>. Alasan ini akan dikirim ke email user yang membuat tiket.
      </p>
      <div className="space-y-1">
        <label className="block text-sm font-medium">Catatan penolakan</label>
        <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={4}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        {!canSubmit && <div className="text-xs text-amber-700">Minimal 5 karakter.</div>}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">Batal</button>
        <button onClick={submit} disabled={!canSubmit || busy}
          className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow disabled:opacity-60">
          {busy ? "Mengirim…" : "Tolak & Kirim Email"}
        </button>
      </div>
    </Modal>
  );
}

function DeleteConfirm({ row, onClose, onSubmit }) {
  const [busy, setBusy] = useState(false);
  async function submit() { setBusy(true); await onSubmit(row.id); setBusy(false); }
  return (
    <Modal title="Hapus Tiket" onClose={onClose}>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Yakin ingin <b>menghapus</b> tiket <b>{row.ticketNo || `#${row.id}`}</b>? Tindakan ini tidak dapat dibatalkan.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">Batal</button>
        <button onClick={submit} disabled={busy}
          className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow disabled:opacity-60">
          {busy ? "Menghapus…" : "Hapus"}
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-[560px] max-w-[92vw] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:underline">tutup</button>
        </div>
        <div className="px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ===== Helpers ===== */
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");}
function fmtWaktu(s){try{return new Date(s).toLocaleString("id-ID",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"});}catch{return s||"-";}}

function normalizeRow(v){
  const f = v.fields || v;
  const divisi  = f["Divisi/ Departemen"] || f.Division || f.Divisi || "Umum";
  let prior     = f.Prioritas || f.Priority || "Normal";
  if (String(divisi).trim().toLowerCase() === "direksi") prior = "Urgent";

  return {
    id: v.id ?? f.id ?? f.ID,
    ticketNo: f.TicketNumber || f["Ticket Number"] || v.TicketNumber || "",
    waktu: fmtWaktu(f.Created || v.createdDateTime || new Date().toISOString()),
    userRequestor: f["User Requestor"]?.displayName || f.RequesterName || f.Nama || f.Title || "—",
    email:         f["User Requestor"]?.email || f.email || "",
    pelaksana:     f.Pelaksana || v.Pelaksana || "",
    divisi,
    prioritas: prior,
    deskripsi: f["Insiden/ Keluhan saat ini"] || f.Description || f.Deskripsi || v.Description || "",
    photoUrl: f["Screenshot Bukti Insiden/ Keluhan"] || f.PhotoUrl || v.PhotoUrl || "",
    status:  f.Status || v.Status || "Belum",
  };
}

function sampleRows(){
  const now = new Date().toISOString();
  return [normalizeRow({
    id: 1,
    TicketNumber: "TKT-001",
    fields: {
      Created: now,
      Title: "Contoh User",
      Division: "Umum",
      Priority: "Normal",
      Description: "Keyboard tidak berfungsi.",
      Status: "Belum"
    }
  })];
}
