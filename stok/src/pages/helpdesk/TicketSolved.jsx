// src/pages/helpdesk/TicketSolved.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";

/* ===================== ENV (Vite/CRA) ===================== */
function readEnv(viteKey, craKey) {
  let vite = {};
  try { vite = (import.meta && import.meta.env) || {}; } catch {}
  const cra = (typeof process !== "undefined" && process.env) || {};
  return vite[viteKey] ?? cra[craKey] ?? "";
}
const RAW_API_BASE =
  readEnv("VITE_API_BASE", "REACT_APP_API_BASE") || "http://localhost:4000";
const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "");

/* ===================== Divisi ===================== */
const DIVISI_OPTIONS = [
  "IT & System","Business Development","Direksi","Engineering","Finance & Accounting",
  "Human Capital","Legal","Marketing & Sales","Operation & Maintenance",
  "Procurement & Logistic","Project","QHSE","Sekper","Warehouse","Umum",
];

/* ===================== Utils ===================== */
const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
function fmtWaktu(s){
  try {
    return new Date(s).toLocaleString("id-ID",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"});
  } catch { return s || "-"; }
}

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerChildren = {
  visible: { transition: { staggerChildren: 0.1 } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
};

const slideIn = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } }
};

// Component untuk menampilkan statistik
const StatCard = ({ title, value, color, darkMode, index }) => {
  const colorClasses = {
    blue: darkMode ? "bg-blue-900/20 text-blue-400" : "bg-blue-100 text-blue-600",
    red: darkMode ? "bg-red-900/20 text-red-400" : "bg-red-100 text-red-600",
    orange: darkMode ? "bg-orange-900/20 text-orange-400" : "bg-orange-100 text-orange-600",
    green: darkMode ? "bg-green-900/20 text-green-400" : "bg-green-100 text-green-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`p-4 rounded-xl ${colorClasses[color]} shadow-lg hover:shadow-xl transition-shadow duration-300`}
      whileHover={{ scale: 1.05 }}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{title}</div>
    </motion.div>
  );
};

// Component untuk menampilkan priority badge
const PriorityBadge = ({ priority, darkMode }) => {
  const priorityConfig = {
    urgent: { color: "red", icon: "🔥" },
    high: { color: "orange", icon: "⚠️" },
    normal: { color: "blue", icon: "ℹ️" },
    low: { color: "green", icon: "💤" },
  };

  const config = priorityConfig[priority?.toLowerCase()] || priorityConfig.normal;
  
  return (
    <motion.span 
      className={`px-3 py-1 rounded-full text-sm font-medium ${
        darkMode ? `bg-${config.color}-900/30 text-${config.color}-300` : `bg-${config.color}-100 text-${config.color}-800`
      }`}
      whileHover={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      {config.icon} {priority || "Normal"}
    </motion.span>
  );
};

// Component untuk status badge
const StatusBadge = ({ value = "", darkMode }) => {
  const v = String(value || "").toLowerCase();
  const style =
    v === "selesai"
      ? darkMode ? "bg-emerald-900/30 text-emerald-300" : "bg-emerald-100 text-emerald-800"
      : v === "belum"
      ? darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"
      : darkMode ? "bg-yellow-900/30 text-yellow-300" : "bg-yellow-100 text-yellow-800";
  
  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${style}`}>
      {value || "-"}
    </span>
  );
};

/* ===================== Component ===================== */
export default function TicketSolved(){
  // Staging state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState({ Divisi:"", Priority:"", Status:"" });
  const { dark: darkMode } = useTheme();

  // Stats calculation
  const stats = {
    total: rows.length,
    selesai: rows.filter(t => (t.status || "").toLowerCase() === "selesai").length,
    belum: rows.filter(t => (t.status || "").toLowerCase() === "belum").length,
  };

  /* ====== Effects ====== */
  useEffect(() => {
    loadStaging();
  }, []);

  /* ===================== STAGING: FETCH ===================== */
  function isCrossOrigin(u) {
    try {
      const Url = new URL(u, window.location.origin);
      return Url.host !== window.location.host;
    } catch {
      return false;
    }
  }
  
  async function tryGetJson(url){
    const opts = { headers:{}, credentials: isCrossOrigin(url) ? "omit" : "include" };
    const r = await fetch(url, opts);
    const ct = r.headers.get("content-type") || "";
    if(!r.ok){
      console.warn(`try url fail: ${url} HTTP ${r.status} @ ${url}`);
      throw new Error(`HTTP ${r.status} @ ${url}`);
    }
    if(!ct.includes("application/json")){
      const text = await r.text().catch(()=> "");
      const head = text.slice(0,160).replace(/\s+/g," ");
      throw new Error(`Non-JSON (${r.status}) @ ${url}: ${head}`);
    }
    return await r.json();
  }

  async function loadStaging(){
    setLoading(true);
    try{
      const candidates = [
        `${API_BASE}/api/tickets?status=Selesai`,
        `${API_BASE}/api/tickets`,
        "/api/tickets?status=Selesai",
        "/api/tickets",
        "/tickets?status=Selesai",
        "/tickets",
      ];
      let payload = null;
      for (const u of candidates){
        try {
          payload = await tryGetJson(u);
          if (payload && (Array.isArray(payload.rows) || Array.isArray(payload))) break;
        } catch {}
      }
      if(!payload){
        const demo = localStorage.getItem("helpdesk_demo_tickets_solved");
        if(demo){
          setRows(JSON.parse(demo));
          setLoading(false);
          return;
        }
        payload = {
          rows: [{
            id: 9001,
            ticketNo: "TKT-DUMMY-9001",
            Created: new Date().toISOString(),
            DateFinished: new Date().toISOString(),
            Title: "User Dummy",
            Division: "Umum",
            Priority: "Normal",
            Status: "Selesai",
            Description: "Contoh tiket solved (dummy).",
            PhotoUrl: "",
          }]
        };
      }
      const arr = Array.isArray(payload) ? payload : payload.rows || [];
      const normalized = arr.map(normalizeStagingRow).sort((a,b)=>{
        const tA = Date.parse(a.DateFinished || a.Created || a.waktu || 0) || 0;
        const tB = Date.parse(b.DateFinished || b.Created || b.waktu || 0) || 0;
        return tB - tA;
      });
      setRows(normalized);
      localStorage.setItem("helpdesk_demo_tickets_solved", JSON.stringify(normalized));
    }catch(e){
      console.error(e);
      setNotif("Gagal mengambil data: " + (e?.message || e));
      setRows([]);
    }finally{
      setLoading(false);
    }
  }

  /* ===================== PRINT ===================== */
  function handlePrint(){
    const items = filtered;
    const head = `
      <meta charset="utf-8"/>
      <title>Ticket Solved</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font: 12px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#000; }
        h1 { margin:0 0 8px; font-size:18px; }
        table { width:100%; border-collapse:collapse; border:1.5pt solid #000; }
        th,td { border:0.9pt solid #000; padding:6px 8px; vertical-align:top; }
        thead th { background:#f3f4f6; text-align:left; }
      </style>
    `;
    const body = items.map(r=>`
      <tr>
        <td>${esc(r.ticketNo || r.TicketNumber || "")}</td>
        <td>${esc(fmtWaktu(r.Created || r.waktu))}</td>
        <td>${esc(fmtWaktu(r.DateFinished || ""))}</td>
        <td>${esc(r.userRequestor || r.Title || "")}</td>
        <td>${esc(r.pelaksana || "")}</td>
        <td>${esc(r.divisi || r.Division || "Umum")}</td>
        <td>${esc(r.prioritas || r.Priority || "Normal")}</td>
        <td>${esc(r.status || r.Status || "")}</td>
        <td>${esc(r.deskripsi || r.Description || "")}</td>
      </tr>
    `).join("");
    const html = `<!doctype html><html><head>${head}</head><body>
      <h1>Ticket Solved</h1>
      <table>
        <thead><tr>
          <th>No. Ticket</th><th>Waktu Lapor</th><th>Waktu Selesai</th><th>User Requestor</th><th>Pelaksana</th>
          <th>Divisi</th><th>Prioritas</th><th>Status</th><th>Deskripsi</th>
        </tr></thead><tbody>${body}</tbody></table>
      <script>onload=()=>{print();setTimeout(()=>close(),300)}</script>
    </body></html>`;
    const w = window.open("", "_blank", "noopener,noreferrer");
    w.document.open(); w.document.write(html); w.document.close();
  }

  /* ====== Derived ====== */
  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    return rows
      .filter(r=>{
        if (filter.Status && (r.status||"") !== filter.Status) return false;
        if (filter.Divisi && (r.divisi||"") !== filter.Divisi) return false;
        if (filter.Priority && (r.prioritas||"") !== filter.Priority) return false;
        if (!s) return true;
        return [
          r.ticketNo, r.userRequestor, r.pelaksana, r.divisi, r.prioritas, r.deskripsi,
          r.status, r.email
        ].join(" ").toLowerCase().includes(s);
      })
      .sort((a,b)=>{
        const tA = Date.parse(a.DateFinished || a.Created || a.waktu || 0) || 0;
        const tB = Date.parse(b.DateFinished || b.Created || b.waktu || 0) || 0;
        return tB - tA;
      });
  }, [rows, q, filter]);

  /* ===================== RENDER ===================== */
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`min-h-screen p-6 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
    >
      {/* Notifications */}
      <AnimatePresence>
        {notif && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`mb-6 p-4 rounded-xl ${
              darkMode ? "bg-emerald-900/30 border-emerald-700" : "bg-emerald-50 border-emerald-200"
            } border`}
          >
            <div className="flex justify-between items-center">
              <span>✅ {notif}</span>
              <button onClick={() => setNotif("")} className="text-sm underline">Tutup</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <motion.div 
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className={`rounded-2xl p-6 mb-6 ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <motion.div variants={slideIn}>
            <h1 className={`text-3xl font-bold ${darkMode ? "text-blue-400" : "text-blue-600"} mb-2`}>
              Ticket Solved
            </h1>
            <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
              Data dari Ticket Entry (Staging)
            </p>
          </motion.div>
          
          <motion.div 
            className="flex gap-3"
            variants={staggerChildren}
            initial="hidden"
            animate="visible"
          >
            <StatCard title="Total" value={stats.total} color="blue" darkMode={darkMode} index={0} />
            <StatCard title="Selesai" value={stats.selesai} color="green" darkMode={darkMode} index={1} />
            <StatCard title="Belum" value={stats.belum} color="orange" darkMode={darkMode} index={2} />
          </motion.div>
        </div>

        {/* Search and Actions */}
        <motion.div 
          className="flex flex-col md:flex-row gap-4"
          variants={fadeIn}
        >
          <div className="flex-1">
            <motion.div 
              className="relative"
              whileFocus={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <input
                type="text"
                placeholder="Cari tiket..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${
                  darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300`}
              />
              <span className="absolute right-3 top-3 text-gray-400">🔍</span>
            </motion.div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select 
              className={`px-3 py-2 rounded-xl border ${
                darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
              } focus:ring-2 focus:ring-blue-500`}
              value={filter.Divisi} 
              onChange={(e)=>setFilter(f=>({...f,Divisi:e.target.value}))}
            >
              <option value="">All Divisi</option>
              {DIVISI_OPTIONS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
            
            <select 
              className={`px-3 py-2 rounded-xl border ${
                darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
              } focus:ring-2 focus:ring-blue-500`}
              value={filter.Priority} 
              onChange={(e)=>setFilter(f=>({...f,Priority:e.target.value}))}
            >
              <option value="">All Prioritas</option>
              {["Low","Normal","High"].map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            
            <select 
              className={`px-3 py-2 rounded-xl border ${
                darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
              } focus:ring-2 focus:ring-blue-500`}
              value={filter.Status} 
              onChange={(e)=>setFilter(f=>({...f,Status:e.target.value}))}
            >
              {["","Belum","Selesai","Pending"].map(s=><option key={s||"all"} value={s}>{s || "All Status"}</option>)}
            </select>
            
            <motion.button
              onClick={loadStaging}
              disabled={loading}
              className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 ${
                loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              } text-white`}
              whileHover={{ scale: loading ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? "⏳" : "🔄"} {loading ? "Loading..." : "Refresh"}
            </motion.button>
            
            <motion.button
              onClick={handlePrint}
              className={`px-4 py-2 rounded-xl border ${
                darkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100"
              } flex items-center gap-2`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🖨️ Print
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      {/* Tickets Table */}
      <motion.div 
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className={`rounded-2xl overflow-hidden ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={darkMode ? "bg-gray-700" : "bg-gray-100"}>
                <th className="p-4 text-left">Ticket #</th>
                <th className="p-4 text-left">Waktu Lapor</th>
                <th className="p-4 text-left">Waktu Selesai</th>
                <th className="p-4 text-left">User Requestor</th>
                <th className="p-4 text-left">Pelaksana</th>
                <th className="p-4 text-left">Divisi</th>
                <th className="p-4 text-left">Prioritas</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Deskripsi</th>
                <th className="p-4 text-left">Lampiran</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"
                    />
                    <p className={`mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Memuat tiket...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className={`p-8 text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {q ? "Tidak ada tiket yang cocok dengan pencarian" : "Tidak ada tiket"}
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {filtered.map((r, i) => (
                    <motion.tr 
                      key={r.id || i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className={i % 2 === 0 ? (darkMode ? "bg-gray-800" : "bg-white") : (darkMode ? "bg-gray-700" : "bg-gray-50")}
                      whileHover={{ backgroundColor: darkMode ? "rgba(55, 65, 81, 0.5)" : "rgba(243, 244, 246, 0.5)" }}
                    >
                      <td className="p-4 font-mono">{r.ticketNo || r.TicketNumber || "-"}</td>
                      <td className="p-4">{fmtWaktu(r.Created || r.waktu)}</td>
                      <td className="p-4">{fmtWaktu(r.DateFinished || "")}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-sm font-semibold shadow">
                            {String(r.userRequestor || r.Title || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="leading-tight">
                            <div className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                              {r.userRequestor || r.Title || "-"}
                            </div>
                            <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                              {r.email || ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-sm font-semibold shadow">
                            {String(r.pelaksana || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                            {r.pelaksana || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                          darkMode ? "bg-gray-700 text-gray-300 border-gray-600" : "bg-gray-100 text-gray-700 border-gray-200"
                        } border`}>
                          {r.divisi || r.Division || "-"}
                        </span>
                      </td>
                      <td className="p-4">
                        <PriorityBadge priority={r.prioritas || r.Priority} darkMode={darkMode} />
                      </td>
                      <td className="p-4">
                        <StatusBadge value={r.status || r.Status || ""} darkMode={darkMode} />
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className={`whitespace-pre-wrap ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          {r.deskripsi || r.Description || "-"}
                        </div>
                      </td>
                      <td className="p-4">
                        {r.PhotoUrl ? (
                          <a
                            href={r.PhotoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`${darkMode ? "text-blue-400" : "text-blue-600"} hover:underline`}
                          >
                            Lihat
                          </a>
                        ) : (
                          <span className={darkMode ? "text-gray-500" : "text-gray-400"}>-</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ===================== Normalizer Staging ===================== */
function normalizeStagingRow(v) {
  const f = v.fields || v;
  const divisi = f["Divisi/ Departemen"] || f.Division || f.Divisi || v.Division || "Umum";
  const prior = f.Prioritas || f.Priority || v.Priority || "Normal";
  
  return {
    id: v.id ?? f.id ?? f.ID,
    ticketNo: f.TicketNumber || f["Ticket Number"] || v.TicketNumber || "",
    Created: f.Created || v.createdDateTime || v.Created || new Date().toISOString(),
    DateFinished: f.DateFinished || v.DateFinished || "",
    userRequestor:
      f["User Requestor"]?.displayName ||
      f.UserRequestor?.displayName ||
      f.RequestedBy?.displayName ||
      f.Requestor?.displayName ||
      f.Nama ||
      f.Title ||
      "—",
    email:
      f["User Requestor"]?.email ||
      f.UserRequestor?.email ||
      f.RequestedBy?.email ||
      f.Requestor?.email ||
      f.email ||
      v.email ||
      "",
    pelaksana: f.Pelaksana || v.Pelaksana || f.Assignedto0?.displayName || v.Assignedto0?.displayName || "",
    divisi,
    prioritas: prior,
    deskripsi: f["Insiden/ Keluhan saat ini"] || f.Description || f.Deskripsi || v.Description || "",
    PhotoUrl: f["Screenshot Bukti Insiden/ Keluhan"] || f.PhotoUrl || v.PhotoUrl || "",
    status: f.Status || v.Status || "Selesai",
  };
}