// src/pages/helpdesk/TicketEntry.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { useTheme } from "../../context/ThemeContext";

/* ===== ENV (aman untuk Vite & CRA, tanpa literal import.meta) ===== */
function readEnvSafe(viteKey, craKey) {
  let viteEnv = {};
  try {
    // Hindari parser error: akses import.meta.env via eval
    viteEnv = eval("import.meta && import.meta.env") || {};
  } catch (_) {
    viteEnv = {};
  }
  const craEnv = (typeof process !== "undefined" && process.env) || {};
  return viteEnv[viteKey] ?? craEnv[craKey] ?? "";
}

const API_BASE_RAW = (readEnvSafe("VITE_API_BASE", "REACT_APP_API_BASE") || "/api").trim();
/** Hilangkan trailing slash agar konsisten */
const API_BASE = API_BASE_RAW.replace(/\/+$/, "");

/* Credentials mode:
   - Relatif (/api) → same-origin (via proxy Vite/CRA, aman dari CORS)
   - Absolut (http://...) → include (butuh CORS server: Allow-Credentials true + Origin spesifik) */
const USE_INCLUDE = /^https?:\/\//i.test(API_BASE);
const CREDENTIALS_MODE = USE_INCLUDE ? "include" : "same-origin";

/* ===== Fetch helpers ===== */
function fullUrl(path) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function apiGet(path) {
  const url = fullUrl(path);
  const r = await fetch(url, { credentials: CREDENTIALS_MODE }).catch((e) => {
    throw new Error("Network error: " + e.message);
  });

  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await r.text().catch(() => "");
    const head = text.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(`Server mengirim non-JSON (${r.status}): ${head}`);
  }
  const j = await r.json();
  if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
  return j;
}

async function apiPost(path, body) {
  const url = fullUrl(path);
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: CREDENTIALS_MODE,
    body: JSON.stringify(body || {}),
  }).catch((e) => {
    throw new Error("Network error: " + e.message);
  });
  const ct = r.headers.get("content-type") || "";
  const j = ct.includes("application/json") ? await r.json() : {};
  if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
  return j;
}

async function apiPostForm(path, formData) {
  const url = fullUrl(path);
  const r = await fetch(url, {
    method: "POST",
    body: formData,
    credentials: CREDENTIALS_MODE,
  }).catch((e) => {
    throw new Error("Network error: " + e.message);
  });
  const ct = r.headers.get("content-type") || "";
  const j = ct.includes("application/json") ? await r.json() : { ok: r.ok };
  if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
  return j;
}

async function apiDelete(path) {
  const url = fullUrl(path);
  const r = await fetch(url, { method: "DELETE", credentials: CREDENTIALS_MODE }).catch((e) => {
    throw new Error("Network error: " + e.message);
  });
  const ct = r.headers.get("content-type") || "";
  const j = ct.includes("application/json") ? await r.json() : { ok: r.ok };
  if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
  return j;
}

/**
 * Ticket Entry (Belum)
 */
export default function TicketEntry() {
  const { dark: darkMode } = useTheme();
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
  const [stats, setStats] = useState({ total: 0, urgent: 0, high: 0 });

  /* ---------- Fetch ---------- */
  const load = useCallback(async () => {
    setLoading(true);
    setErr(""); setOkMsg("");
    try {
      const j = await apiGet("/api/tickets?status=Belum");
      const items = (j.rows || []).map(normalizeRow);
      setRows(items);
      
      // Hitung statistik
      const urgent = items.filter(r => r.prioritas?.toLowerCase().includes('urgent')).length;
      const high = items.filter(r => r.prioritas?.toLowerCase().includes('high')).length;
      
      setStats({
        total: items.length,
        urgent,
        high,
        normal: items.length - urgent - high
      });
      
      localStorage.setItem("helpdesk_demo_tickets", JSON.stringify(items));
    } catch (e) {
      setErr(e.message || String(e));
      const demo = localStorage.getItem("helpdesk_demo_tickets");
      const items = demo ? JSON.parse(demo) : sampleRows();
      setRows(items);
      
      const urgent = items.filter(r => r.prioritas?.toLowerCase().includes('urgent')).length;
      const high = items.filter(r => r.prioritas?.toLowerCase().includes('high')).length;
      
      setStats({
        total: items.length,
        urgent,
        high,
        normal: items.length - urgent - high
      });
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
    <div className={`min-h-screen p-6 ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Header */}
      <div className={`rounded-xl p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#215ba6] dark:text-blue-400 mb-2">
              Ticket Entry <span className="text-gray-500 dark:text-gray-300">(Belum)</span>
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <i>Sumber data:</i>{" "}
              <code className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {fullUrl("/api/tickets?status=Belum")}
              </code>
            </p>
          </div>
          
          {/* Stats Cards */}
          <div className="flex gap-3 mt-4 md:mt-0">
            <StatCard 
              title="Total" 
              value={stats.total} 
              color="blue" 
              darkMode={darkMode} 
            />
            <StatCard 
              title="Urgent" 
              value={stats.urgent} 
              color="red" 
              darkMode={darkMode} 
            />
            <StatCard 
              title="High" 
              value={stats.high} 
              color="orange" 
              darkMode={darkMode} 
            />
          </div>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari: no tiket, user, divisi, keluhan…"
                className={`w-full px-4 py-3 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'border-gray-300 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <span className="absolute right-3 top-3 text-gray-400">🔍</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={load} 
              className={`px-4 py-3 rounded-lg font-medium flex items-center ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } text-white`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Loading…
                </>
              ) : (
                <>
                  <span className="mr-2">🔄</span>
                  Reload
                </>
              )}
            </button>
            <button 
              onClick={handlePrint} 
              className={`px-4 py-3 rounded-lg border font-medium flex items-center ${
                darkMode 
                  ? 'border-gray-600 hover:bg-gray-700' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="mr-2">🖨️</span>
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Notif */}
      {err && (
        <Banner type="error" onClose={() => setErr("")} darkMode={darkMode}>
          <b>Error:</b> {err}
        </Banner>
      )}
      {okMsg && (
        <Banner type="ok" onClose={() => setOkMsg("")} darkMode={darkMode}>
          {okMsg}
        </Banner>
      )}

      {/* Counter */}
      <div className={`text-sm mb-4 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Menampilkan: <b>{filtered.length}</b> dari <b>{rows.length}</b> tiket
        {q && ` untuk pencarian "${q}"`}
      </div>

      {/* Tabel */}
      <div className={`rounded-2xl p-6 shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="overflow-x-auto rounded-xl">
          <table className="min-w-full w-full text-base">
            <thead>
              <tr className={`text-lg ${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-blue-50 text-blue-900'}`}>
                <Th className="w-28">No. Ticket</Th>
                <Th className="w-44">Waktu</Th>
                <Th className="w-56">User Requestor</Th>
                <Th className="w-56">Pelaksana</Th>
                <Th className="w-40">Divisi</Th>
                <Th className="w-32">Prioritas</Th>
                <Th>Keluhan</Th>
                <Th className="w-28">Lampiran</Th>
                <Th className="w-64 text-right">Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                      Loading data…
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-gray-400">
                    {rows.length === 0 ? "Tidak ada tiket." : `Tidak ditemukan tiket untuk "${q}"`}
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => (
                  <Row
                    key={r.id}
                    r={{ ...r, pelaksana: r.pelaksana || operatorName }}
                    onOpenResolve={() => setActiveResolve(r)}
                    onOpenDecline={() => setActiveDecline(r)}
                    onOpenDelete={() => setActiveDelete(r)}
                    zebra={i % 2 === 1}
                    darkMode={darkMode}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeResolve && <ResolveModal row={activeResolve} onClose={() => setActiveResolve(null)} onSubmit={handleResolve} darkMode={darkMode} />}
      {activeDecline && <DeclineModal row={activeDecline} onClose={() => setActiveDecline(null)} onSubmit={handleDecline} darkMode={darkMode} />}
      {activeDelete && <DeleteConfirm row={activeDelete} onClose={() => setActiveDelete(null)} onSubmit={handleDelete} darkMode={darkMode} />}
    </div>
  );
}

/* ===== Presentational Components ===== */
function Th({ children, className = "" }) {
  return <th className={`px-5 py-4 font-semibold text-xs uppercase tracking-wide ${className}`}>{children}</th>;
}

function Td({ children, className = "" }) {
  return <td className={`px-5 py-3 align-top ${className}`}>{children}</td>;
}

function StatCard({ title, value, color, darkMode }) {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', darkBg: 'bg-blue-900/20', darkText: 'text-blue-400' },
    red: { bg: 'bg-red-100', text: 'text-red-600', darkBg: 'bg-red-900/20', darkText: 'text-red-400' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', darkBg: 'bg-orange-900/20', darkText: 'text-orange-400' },
    green: { bg: 'bg-green-100', text: 'text-green-600', darkBg: 'bg-green-900/20', darkText: 'text-green-400' }
  };

  return (
    <div className={`p-3 rounded-lg text-center min-w-[80px] ${
      darkMode ? colorClasses[color].darkBg : colorClasses[color].bg
    }`}>
      <div className={`text-2xl font-bold ${
        darkMode ? colorClasses[color].darkText : colorClasses[color].text
      }`}>
        {value}
      </div>
      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {title}
      </div>
    </div>
  );
}

function Row({ r, onOpenResolve, onOpenDecline, onOpenDelete, zebra, darkMode }) {
  return (
    <tr className={`${zebra ? (darkMode ? "bg-gray-700/50" : "bg-blue-50/60") : ""} hover:${darkMode ? "bg-gray-700" : "bg-gray-50"} transition-colors`}>
      <Td className="font-medium">
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          darkMode ? 'bg-gray-700 text-blue-300' : 'bg-blue-100 text-blue-700'
        }`}>
          {r.ticketNo || "-"}
        </div>
      </Td>
      
      <Td>
        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {r.waktu}
        </div>
      </Td>

      <Td>
        <div className="flex items-center gap-3">
          <Avatar name={r.userRequestor} />
          <div className="leading-tight">
            <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {r.userRequestor || "-"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {r.email || ""}
            </div>
          </div>
        </div>
      </Td>

      <Td>
        <Chip darkMode={darkMode} className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
          {r.pelaksana || "-"}
        </Chip>
      </Td>
      
      <Td>
        <Chip darkMode={darkMode}>{r.divisi || "-"}</Chip>
      </Td>
      
      <Td>
        <PriorityChip value={r.prioritas} darkMode={darkMode} />
      </Td>

      <Td>
        <div className={`max-w-[400px] whitespace-pre-wrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {r.deskripsi || "-"}
        </div>
      </Td>

      <Td>
        {r.photoUrl ? (
          <a 
            href={r.photoUrl} 
            target="_blank" 
            rel="noreferrer" 
            className="inline-flex items-center px-2 py-1 rounded text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:underline"
          >
            📎 Lihat
          </a>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )}
      </Td>

      <Td className="text-right">
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <ActionButton 
            onClick={onOpenResolve} 
            color="green" 
            icon="✅"
            label="Selesai"
            darkMode={darkMode}
          />
          <ActionButton 
            onClick={onOpenDecline} 
            color="yellow" 
            icon="❌"
            label="Tolak"
            darkMode={darkMode}
          />
          <ActionButton 
            onClick={onOpenDelete} 
            color="red" 
            icon="🗑️"
            label="Hapus"
            darkMode={darkMode}
          />
        </div>
      </Td>
    </tr>
  );
}

function ActionButton({ onClick, color, icon, label, darkMode }) {
  const colorClasses = {
    green: { light: 'bg-green-500 hover:bg-green-600', dark: 'bg-green-600 hover:bg-green-700' },
    yellow: { light: 'bg-yellow-500 hover:bg-yellow-600', dark: 'bg-yellow-600 hover:bg-yellow-700' },
    red: { light: 'bg-red-500 hover:bg-red-600', dark: 'bg-red-600 hover:bg-red-700' }
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded text-white text-sm font-medium flex items-center ${
        darkMode ? colorClasses[color].dark : colorClasses[color].light
      } transition-colors`}
    >
      <span className="mr-1">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Avatar({ name = "" }) {
  const init = useMemo(() => {
    const parts = String(name).trim().split(/\s+/);
    return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
  }, [name]);
  
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-xs font-bold shadow">
      {init.toUpperCase()}
    </div>
  );
}

function Chip({ children, darkMode = false, className = "" }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${className} ${
      darkMode 
        ? "bg-gray-700 text-gray-300" 
        : "bg-gray-100 text-gray-700"
    }`}>
      {children}
    </span>
  );
}

function PriorityChip({ value = "", darkMode = false }) {
  const v = String(value || "").toLowerCase();
  const cls =
    v.includes("urgent") 
      ? darkMode 
        ? "bg-red-800 text-red-100" 
        : "bg-red-200 text-red-900"
      : v.includes("high")   
        ? darkMode 
          ? "bg-orange-800 text-orange-100" 
          : "bg-orange-200 text-orange-900"
        : v.includes("low")    
          ? darkMode 
            ? "bg-green-800 text-green-100" 
            : "bg-green-200 text-green-900"
          : darkMode 
            ? "bg-yellow-800 text-yellow-100" 
            : "bg-yellow-200 text-yellow-900";
  
  return (
    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${cls}`}>
      {value || "-"}
    </span>
  );
}

function Banner({ type = "ok", children, onClose, darkMode = false }) {
  const style = type === "error"
    ? darkMode
      ? "bg-red-900 text-red-100 border-red-700"
      : "bg-red-50 text-red-800 border-red-200"
    : darkMode
      ? "bg-emerald-900 text-emerald-100 border-emerald-700"
      : "bg-emerald-50 text-emerald-800 border-emerald-200";
  
  return (
    <div className={`px-4 py-3 rounded-lg border ${style} flex items-center justify-between mb-4`}>
      <div className="flex items-center">
        <span className="mr-3">{type === "error" ? "❌" : "✅"}</span>
        <div className="text-sm">{children}</div>
      </div>
      <button 
        onClick={onClose} 
        className="text-sm underline hover:no-underline"
      >
        Tutup
      </button>
    </div>
  );
}

/* ===== Modal Components ===== */
function ResolveModal({ row, onClose, onSubmit, darkMode = false }) {
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  
  async function submit() { 
    setBusy(true); 
    await onSubmit(row.id, file, notes); 
    setBusy(false); 
  }
  
  return (
    <Modal title={`Konfirmasi Selesai - ${row.ticketNo || `#${row.id}`}`} onClose={onClose} darkMode={darkMode}>
      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
        Tandai tiket sebagai <b>selesai</b>. Tambahkan foto/catatan (opsional).
      </p>
      
      <div className="space-y-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Lampirkan foto (opsional)
          </label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setFile(e.target.files?.[0] || null)} 
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Catatan (opsional)
          </label>
          <textarea
            value={notes} 
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 rounded-lg border ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="Tambahkan catatan penyelesaian..."
          />
        </div>
      </div>
      
      <div className="mt-6 flex justify-end gap-3">
        <button 
          onClick={onClose} 
          className={`px-4 py-2 rounded-lg border ${
            darkMode 
              ? 'border-gray-600 hover:bg-gray-700 text-white' 
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          Batal
        </button>
        <button 
          onClick={submit} 
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 flex items-center"
        >
          {busy ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Menyimpan…
            </>
          ) : (
            "Konfirmasi Selesai"
          )}
        </button>
      </div>
    </Modal>
  );
}

function DeclineModal({ row, onClose, onSubmit, darkMode = false }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const canSubmit = notes.trim().length >= 5;
  
  async function submit() { 
    setBusy(true); 
    await onSubmit(row.id, notes); 
    setBusy(false); 
  }
  
  return (
    <Modal title={`Tolak Tiket - ${row.ticketNo || `#${row.id}`}`} onClose={onClose} darkMode={darkMode}>
      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
        Tuliskan <b>alasan penolakan</b>. Alasan ini akan dikirim ke email user.
      </p>
      
      <div>
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Alasan penolakan *
        </label>
        <textarea 
          value={notes} 
          onChange={(e) => setNotes(e.target.value)} 
          rows={4}
          className={`w-full px-3 py-2 rounded-lg border ${
            darkMode 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'border-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-amber-500`}
          placeholder="Minimal 5 karakter..."
        />
        {!canSubmit && notes.length > 0 && (
          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Minimal 5 karakter diperlukan.
          </div>
        )}
      </div>
      
      <div className="mt-6 flex justify-end gap-3">
        <button 
          onClick={onClose} 
          className={`px-4 py-2 rounded-lg border ${
            darkMode 
              ? 'border-gray-600 hover:bg-gray-700 text-white' 
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          Batal
        </button>
        <button 
          onClick={submit} 
          disabled={!canSubmit || busy}
          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-50 flex items-center"
        >
          {busy ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Mengirim…
            </>
          ) : (
            "Tolak & Kirim Email"
          )}
        </button>
      </div>
    </Modal>
  );
}

function DeleteConfirm({ row, onClose, onSubmit, darkMode = false }) {
  const [busy, setBusy] = useState(false);
  
  async function submit() { 
    setBusy(true); 
    await onSubmit(row.id); 
    setBusy(false); 
  }
  
  return (
    <Modal title="Hapus Tiket" onClose={onClose} darkMode={darkMode}>
      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-6`}>
        Yakin ingin <b className="text-red-600">menghapus</b> tiket <b>{row.ticketNo || `#${row.id}`}</b>?
        <br />
        <span className="text-xs">Tindakan ini tidak dapat dibatalkan.</span>
      </p>
      
      <div className="flex justify-end gap-3">
        <button 
          onClick={onClose} 
          className={`px-4 py-2 rounded-lg border ${
            darkMode 
              ? 'border-gray-600 hover:bg-gray-700 text-white' 
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          Batal
        </button>
        <button 
          onClick={submit} 
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 flex items-center"
        >
          {busy ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Menghapus…
            </>
          ) : (
            "Hapus Tiket"
          )}
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose, darkMode = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl ${
        darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
      }`}>
        <div className={`px-6 py-4 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        } flex items-center justify-between`}>
          <h3 className="font-semibold">{title}</h3>
          <button 
            onClick={onClose} 
            className={`p-1 rounded-full hover:${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-4">
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