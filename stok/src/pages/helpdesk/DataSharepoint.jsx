// src/pages/helpdesk/TicketSolved.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate, useLocation } from "react-router-dom";

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

/* ===================== KONFIG SharePoint ===================== */
const siteId =
  "waskitainfra.sharepoint.com,32252c41-8aed-4ed2-ba35-b6e2731b0d4a,fb2ae80c-1283-4942-a3e8-0d47e8d004fb";
const TICKET_LIST_ID = "e4a152ba-ee6e-4e1d-9c74-04e8d32ea912";
const REST_URL = "https://waskitainfra.sharepoint.com/sites/ITHELPDESK";

const GRAPH_SCOPE = ["Sites.ReadWrite.All"];
const SHAREPOINT_SCOPE = ["https://waskitainfra.sharepoint.com/.default"];

const TICKET_LIST_NAME_FOR_ATTACH = "Tickets";
const DONE_PHOTO_FIELD = "ScreenshotBuktiTicketsudahDilaku";
const PROOF_IMAGES_FIELD = "Images";

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
function byNewest(a,b){
  const fa = a.fields || a;
  const fb = b.fields || b;
  const aTime = Date.parse(fa.DateFinished || fa.Created || fa.DateReported || 0) || 0;
  const bTime = Date.parse(fb.DateFinished || fb.Created || fb.DateReported || 0) || 0;
  return bTime - aTime;
}

/* ===================== Mapping SharePoint ===================== */
function pickFirst(...cands){
  for (const c of cands) if (c != null && c !== "") return c;
  return null;
}

/** Normalisasi People ke shape {displayName, email} walau datang sebagai string. */
function toPerson(v) {
  if (!v) return null;
  if (typeof v === "string") {
    const email = v.includes("@") ? (v.match(/[^\s|;<>"]+@[^\s|;<>"]+/)?.[0] || "") : "";
    const raw = v.split("|").pop() || v; // buang prefix claims i:0#.f|membership|
    const nameFromEmail = email ? email.split("@")[0].replace(/[._]/g, " ") : raw;
    return { displayName: nameFromEmail, email };
  }
  if (typeof v === "object") {
    return {
      displayName: v.displayName || v.Title || v.title || v.Name || v.EMail || v.email || v.mail || "",
      email: v.email || v.EMail || v.mail || ""
    };
  }
  return null;
}

function mapSpItem(item){
  const f = item.fields || {};

  // Debug: Lihat struktur lengkap item
  console.log("=== DEBUG: Struktur Lengkap Item ===");
  console.log("Item:", item);
  console.log("Fields:", f);
  
  // ===== User Requestor (People) - PERBAIKAN KHUSUS =====
  let userReq = null;
  
  // Prioritaskan field-field yang mungkin berisi User Requestor
  // TERBARU: Tambahkan createdBy berdasarkan struktur yang ditemukan
  const fieldPriority = [
    'UserRequestor', 'User_x0020_Requestor', 'RequestedBy', 
    'Requestor', 'Pemohon', 'Author', 'CreatedBy'
  ];
  
  for (const fieldName of fieldPriority) {
    if (f[fieldName]) {
      if (typeof f[fieldName] === 'object') {
        // Jika berupa object (People field yang sudah di-expand)
        // PERBAIKAN: Handle createdBy.user structure
        if (fieldName === 'CreatedBy' && f[fieldName].user) {
          userReq = {
            displayName: f[fieldName].user.displayName || '',
            email: f[fieldName].user.email || ''
          };
        } else {
          userReq = {
            displayName: f[fieldName].Title || f[fieldName].displayName || f[fieldName].Name || '',
            email: f[fieldName].EMail || f[fieldName].Email || f[fieldName].mail || ''
          };
        }
        if (userReq.displayName) break;
      } else if (typeof f[fieldName] === 'string') {
        // Jika berupa string (LookupId atau email)
        userReq = toPerson(f[fieldName]);
        if (userReq.displayName) break;
      }
    }
  }

  // ===== Pelaksana (People atau text) =====
  let assigned = null;
  const executorFields = ['Assignedto0', 'AssignedTo', 'Pelaksana', 'Executor'];
  
  for (const fieldName of executorFields) {
    if (f[fieldName]) {
      if (typeof f[fieldName] === 'object') {
        assigned = {
          displayName: f[fieldName].Title || f[fieldName].displayName || f[fieldName].Name || '',
          email: f[fieldName].EMail || f[fieldName].Email || f[fieldName].mail || ''
        };
        if (assigned.displayName) break;
      } else if (typeof f[fieldName] === 'string') {
        assigned = toPerson(f[fieldName]);
        if (assigned.displayName) break;
      }
    }
  }

  // fallback kalau hanya text Issueloggedby
  const executor = assigned || (f.Issueloggedby ? { displayName: f.Issueloggedby, email: "" } : null);

  return {
    spId: item.id,
    Title: f.Title || "",
    TicketNumber: f.TicketNumber || item.id,
    Description: f.Description || "",
    Priority: f.Priority || "Normal",
    Status: f.Status || "",
    Divisi: f.Divisi || "Umum",
    DateReported: f.DateReported || f.Created || "",
    DateFinished: f.DateFinished || "",
    UserRequestor: userReq,     // People
    Assignedto0: executor,      // People (or synthesized from Issueloggedby)
    TipeTicket: f.TipeTicket || "",
    Issueloggedby: f.Issueloggedby || "",
    Author: toPerson(f.Author) || null,
    [DONE_PHOTO_FIELD]: f[DONE_PHOTO_FIELD] || "",
    HasAttachments: !!f.Attachments,
  };
}

function buildFieldsPayload(src){
  return {
    Title: src.Title || (src.Description ? String(src.Description).slice(0,120) : `Ticket ${src.TicketNumber || ""}`),
    TicketNumber: src.TicketNumber || "",
    Description: src.Description || "",
    Priority: src.Priority || "Normal",
    Status: src.Status || "Selesai",
    Divisi: src.Divisi || "Umum",
    DateReported: src.DateReported || undefined,
    DateFinished: src.DateFinished || undefined,
    TipeTicket: src.TipeTicket || undefined,
    Assignedto0: src.Assignedto0 || undefined,
    Issueloggedby: src.Issueloggedby || undefined,
  };
}

function spAttachmentUrl(itemId, fileName){
  if(!itemId || !fileName) return "";
  return `${REST_URL}/Lists/${TICKET_LIST_NAME_FOR_ATTACH}/Attachments/${itemId}/${encodeURIComponent(fileName)}`;
}

/* ===================== Component ===================== */
export default function TicketSolved(){
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL query parameter
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'sp';
  
  // 'sp' = SharePoint, 'staging' = dari Ticket Entry (backend lokal)
  const [tab, setTab] = useState(initialTab);

  // Update URL when tab changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', tab);
    navigate({ search: params.toString() }, { replace: true });
  }, [tab, navigate]);

  // SharePoint state
  const [rowsSP, setRowsSP] = useState([]);
  const [loadingSP, setLoadingSP] = useState(false);
  const [notif, setNotif] = useState("");
  const [qSP, setQSP] = useState("");
  const [filterSP, setFilterSP] = useState({ Divisi:"", Priority:"", Status:"" });
  const [sel, setSel] = useState(null);
  const [modal, setModal] = useState({ open:false, mode:"", data:{} });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const fileInputRef = useRef(null);

  // Staging state
  const [rowsST, setRowsST] = useState([]);
  const [loadingST, setLoadingST] = useState(false);
  const [qST, setQST] = useState("");

  // Debug state
  const [debugData, setDebugData] = useState(null);

  /* ====== Derived ====== */
  const filteredSP = useMemo(() => {
    const s = qSP.trim().toLowerCase();
    return rowsSP
      .filter((it)=>{
        const f = it.fields;
        if (filterSP.Status && (f.Status||"") !== filterSP.Status) return false;
        if (filterSP.Divisi && (f.Divisi||"") !== filterSP.Divisi) return false;
        if (filterSP.Priority && (f.Priority||"") !== filterSP.Priority) return false;
        if (!s) return true;
        const reqName = f.UserRequestor?.displayName || "";
        const exeName = (f.Assignedto0?.displayName) || f.Issueloggedby || "";
        return [
          f.TicketNumber,f.Title,f.Description,f.Divisi,f.Priority,f.Status,
          f.TipeTicket, exeName, reqName, f.Author?.displayName, f.Author?.email,
          it.id,it.fields?.spId
        ].join(" ").toLowerCase().includes(s);
      })
      .sort(byNewest);
  }, [rowsSP,qSP,filterSP]);

  const filteredST = useMemo(()=>{
    const s = qST.trim().toLowerCase();
    return rowsST
      .filter(r=>{
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
  }, [rowsST,qST]);

  /* ====== Effects ====== */
  useEffect(()=>{
    if (tab==="sp") fetchFromSP();
    if (tab==="staging") loadStaging();
  }, [tab]);

  /* ===================== SHAREPOINT: FETCH ===================== */
  async function fetchFromSP(){
    setLoadingSP(true);
    try{
      const account = accounts?.[0];
      if(!account) throw new Error("Belum login MSAL");
      const tok = await instance.acquireTokenSilent({ scopes: GRAPH_SCOPE, account });

      // PERBAIKAN: Query yang lebih komprehensif untuk field People
      // Gunakan $expand dengan select yang spesifik untuk field People
      const url =
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${TICKET_LIST_ID}/items` +
        `?$expand=fields($select=id,Title,TicketNumber,Description,Priority,Status,Divisi,DateReported,DateFinished,TipeTicket,Issueloggedby,${DONE_PHOTO_FIELD},Attachments,UserRequestor,User_x0020_Requestor,Assignedto0,AssignedTo,Pelaksana,Author)` +
        `&$top=2000`;

      const res = await fetch(url, {
        headers:{
          Authorization: `Bearer ${tok.accessToken}`,
          Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly=true",
        }
      });
      const j = await res.json();
      if(!res.ok){
        const msg = j?.error?.message || JSON.stringify(j).slice(0,200);
        throw new Error(msg);
      }
      
      // Debug: Lihat struktur data yang diterima
      console.log("Data dari SharePoint (struktur lengkap):", j.value);
      setDebugData(j.value && j.value.length > 0 ? j.value[0] : j);
      
      const items = (j.value||[]).map((v)=>({ id:v.id, fields: mapSpItem(v) })).sort(byNewest);
      setRowsSP(items);
      setSel(null);
    }catch(e){
      console.error(e);
      setNotif("Gagal mengambil data SharePoint: " + (e?.message || e));
      setRowsSP([]);
    }finally{
      setLoadingSP(false);
    }
  }

  // Alternatif: Fetch Data Langsung dari REST API SharePoint
  async function fetchFromSPRestAPI(){
    setLoadingSP(true);
    try{
      const account = accounts?.[0];
      if(!account) throw new Error("Belum login MSAL");
      const spTok = await instance.acquireTokenSilent({ scopes: SHAREPOINT_SCOPE, account });

      // Gunakan REST API SharePoint langsung
      const url = `${REST_URL}/_api/web/lists(guid'${TICKET_LIST_ID}')/items` +
        `?$select=ID,Title,TicketNumber,Description,Priority,Status,Divisi,DateReported,DateFinished,TipeTicket,Issueloggedby,${DONE_PHOTO_FIELD},UserRequestor/Title,UserRequestor/EMail,User_x0020_Requestor/Title,User_x0020_Requestor/EMail,Assignedto0/Title,Assignedto0/EMail,Author/Title,Author/EMail` +
        `&$expand=UserRequestor,User_x0020_Requestor,Assignedto0,Author` +
        `&$top=2000`;

      const res = await fetch(url, {
        headers:{
          Authorization: `Bearer ${spTok.accessToken}`,
          Accept: "application/json;odata=verbose",
        }
      });
      
      if(!res.ok){
        const msg = await res.text();
        throw new Error(msg);
      }
      
      const j = await res.json();
      console.log("Data dari REST API SharePoint:", j);
      setDebugData(j.d && j.d.results && j.d.results.length > 0 ? j.d.results[0] : j);
      
      // Mapping data dari REST API response
      const items = (j.d?.results || []).map(item => {
        return {
          id: item.ID,
          fields: {
            spId: item.ID,
            Title: item.Title || "",
            TicketNumber: item.TicketNumber || item.ID,
            Description: item.Description || "",
            Priority: item.Priority || "Normal",
            Status: item.Status || "",
            Divisi: item.Divisi || "Umum",
            DateReported: item.DateReported || item.Created || "",
            DateFinished: item.DateFinished || "",
            UserRequestor: item.UserRequestor ? { 
              displayName: item.UserRequestor.Title, 
              email: item.UserRequestor.EMail 
            } : (item.User_x0020_Requestor ? { 
              displayName: item.User_x0020_Requestor.Title, 
              email: item.User_x0020_Requestor.EMail 
            } : null),
            Assignedto0: item.Assignedto0 ? { 
              displayName: item.Assignedto0.Title, 
              email: item.Assignedto0.EMail 
            } : (item.Issueloggedby ? { 
              displayName: item.Issueloggedby, 
              email: "" 
            } : null),
            TipeTicket: item.TipeTicket || "",
            Issueloggedby: item.Issueloggedby || "",
            Author: item.Author ? { 
              displayName: item.Author.Title, 
              email: item.Author.EMail 
            } : null,
            [DONE_PHOTO_FIELD]: item[DONE_PHOTO_FIELD] || "",
            HasAttachments: !!item.Attachments,
          }
        };
      }).sort(byNewest);
      
      setRowsSP(items);
      setSel(null);
    }catch(e){
      console.error(e);
      setNotif("Gagal mengambil data SharePoint: " + (e?.message || e));
      setRowsSP([]);
    }finally{
      setLoadingSP(false);
    }
  }

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
    setLoadingST(true);
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
          setRowsST(JSON.parse(demo));
          setLoadingST(false);
          return;
        }
        payload = {
          rows: [{
            id: 9001,
            TicketNumber: "TKT-DUMMY-9001",
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
      setRowsST(normalized);
      localStorage.setItem("helpdesk_demo_tickets_solved", JSON.stringify(normalized));
    }catch(e){
      console.error(e);
      setRowsST([]);
    }finally{
      setLoadingST(false);
    }
  }

  /* ===================== CRUD (SharePoint) ===================== */
  function openCreate(){
    resetPhoto();
    setModal({
      open:true, mode:"create",
      data:{
        Title:"", TicketNumber:"", Description:"",
        Priority:"Normal", Status:"Selesai", Divisi:"Umum",
        DateReported:new Date().toISOString(),
        DateFinished:new Date().toISOString(),
        TipeTicket:"", Assignedto0:"", Issueloggedby:"",
      }
    });
  }
  function openEdit(){
    if(!sel) return;
    resetPhoto();
    setModal({ open:true, mode:"edit", data:{ ...sel.fields, spId: sel.id } });
  }
  async function handleDelete(){
    if(!sel) return;
    if(!window.confirm(`Hapus Ticket #${sel.fields.TicketNumber || sel.id}?`)) return;
    setLoadingSP(true);
    try{
      const account = accounts?.[0];
      const tok = await instance.acquireTokenSilent({ scopes: GRAPH_SCOPE, account });
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${TICKET_LIST_ID}/items/${sel.id}`,
        { method:"DELETE", headers:{ Authorization:`Bearer ${tok.accessToken}` } }
      );
      if(!res.ok) throw new Error(await res.text());
      setNotif("Data berhasil dihapus.");
      await fetchFromSP();
    }catch(e){
      console.error(e);
      setNotif("Gagal menghapus: " + (e?.message || e));
    }finally{
      setLoadingSP(false);
    }
  }
  async function doCreateOrEdit(e){
    e.preventDefault();
    if(loadingSP) return;
    setLoadingSP(true);
    try{
      const account = accounts?.[0];
      const gTok = await instance.acquireTokenSilent({ scopes: GRAPH_SCOPE, account });

      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      const fields = buildFieldsPayload({
        Title: data.Title, TicketNumber: data.TicketNumber, Description: data.Description,
        Priority: data.Priority || "Normal", Status: data.Status || "Selesai",
        Divisi: data.Divisi || "Umum", DateReported: data.DateReported || undefined,
        DateFinished: data.DateFinished || undefined, TipeTicket: data.TipeTicket || undefined,
        Assignedto0: data.Assignedto0 || undefined, Issueloggedby: data.Issueloggedby || undefined,
      });

      let itemId = null;
      if (modal.mode === "create"){
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${TICKET_LIST_ID}/items`,
          { method:"POST", headers:{ Authorization:`Bearer ${gTok.accessToken}`, "Content-Type":"application/json" }, body: JSON.stringify({ fields }) }
        );
        if(!res.ok) throw new Error(await res.text());
        const created = await res.json();
        itemId = created?.id;
      } else {
        itemId = sel?.id;
        if(!itemId) throw new Error("Tidak ada item terpilih.");
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${TICKET_LIST_ID}/items/${itemId}/fields`,
          { method:"PATCH", headers:{ Authorization:`Bearer ${gTok.accessToken}`, "Content-Type":"application/json" }, body: JSON.stringify(fields) }
        );
        if(!res.ok) throw new Error(await res.text());
      }

      if(itemId && photoFile){
        const saved = await uploadAttachmentToSP(instance, accounts, itemId, photoFile);
        await setDonePhotoMetaOnSP(instance, accounts, itemId, saved.fileName);
      }

      setNotif(modal.mode==="create" ? "Berhasil menambahkan data." : "Perubahan tersimpan.");
      setModal({ open:false, mode:"", data:{} });
      resetPhoto();
      await fetchFromSP();
    }catch(e){
      console.error(e);
      setNotif("Gagal simpan: " + (e?.message || e));
    }finally{
      setLoadingSP(false);
    }
  }

  /* ===================== FOTO HELPERS ===================== */
  function onPickPhoto(e){
    const f = e.target.files?.[0];
    if(f){
      setPhotoFile(f);
      const url = URL.createObjectURL(f);
      setPhotoPreview(url);
    }
  }
  function removePhoto(){
    setPhotoFile(null);
    if(photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview("");
    if(fileInputRef.current) fileInputRef.current.value = "";
  }
  function resetPhoto(){ removePhoto(); }

  /* ===================== PRINT ===================== */
  function handlePrintSP(){
    const items = filteredSP;
    const head = `
      <meta charset="utf-8"/>
      <title>Ticket Solved (SharePoint)</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font: 12px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#000; }
        h1 { margin:0 0 8px; font-size:18px; }
        table { width:100%; border-collapse:collapse; border:1.5pt solid #000; }
        th,td { border:0.9pt solid
                th,td { border:0.9pt solid #000; padding:6px 8px; vertical-align:top; }
        thead th { background:#f3f4f6; text-align:left; }
      </style>
    `;
    const body = items.map(it=>{
      const f = it.fields;
      const req = f.UserRequestor?.displayName || "";
      const exe = (f.Assignedto0?.displayName) || f.Issueloggedby || "";
      return `
        <tr>
          <td>${esc(f.TicketNumber)}</td>
          <td>${esc(fmtWaktu(f.DateReported))}</td>
          <td>${esc(fmtWaktu(f.DateFinished))}</td>
          <td>${esc(req)}</td>
          <td>${esc(exe)}</td>
          <td>${esc(f.Divisi)}</td>
          <td>${esc(f.Priority)}</td>
          <td>${esc(f.Status)}</td>
          <td>${esc(f.Description)}</td>
        </tr>`;
    }).join("");
    const html = `<!doctype html><html><head>${head}</head><body>
      <h1>Ticket Solved (SharePoint)</h1>
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

  function handlePrintST(){
    const items = filteredST;
    const head = `
      <meta charset="utf-8"/>
      <title>Ticket Solved (Staging)</title>
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
      <h1>Ticket Solved (Staging)</h1>
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

  /* ===================== RENDER ===================== */
  return (
    <div className="relative min-h-screen flex flex-col items-center py-4 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      {notif && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded shadow-md font-bold" onClick={()=>setNotif("")}>
          {notif}
        </div>
      )}

      <div className="relative z-10 w-full max-w-[95vw]">
        {/* Header */}
        <div className="mb-3">
          <h2 className="text-3xl font-bold mb-1 text-[#215ba6] dark:text-blue-400">Data Sharepoint</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tab === "sp" 
              ? "Data SharePoint List: TICKETS" 
              : "Sumber data: " + API_BASE + "/api/tickets?status=Selesai"}
          </p>
        </div>

        {/* ===== SharePoint Tab ===== */}
        {tab==="sp" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <input value={qSP} onChange={(e)=>setQSP(e.target.value)} placeholder="Cari…"
                       className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 w-64"/>
                <select className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                        value={filterSP.Divisi} onChange={(e)=>setFilterSP(f=>({...f,Divisi:e.target.value}))}>
                  <option value="">All Divisi</option>
                  {DIVISI_OPTIONS.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
                <select className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                        value={filterSP.Priority} onChange={(e)=>setFilterSP(f=>({...f,Priority:e.target.value}))}>
                  <option value="">All Prioritas</option>
                  {["Low","Normal","High"].map(p=><option key={p} value={p}>{p}</option>)}
                </select>
                <select className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                        value={filterSP.Status} onChange={(e)=>setFilterSP(f=>({...f,Status:e.target.value}))}>
                  {["","Belum","Selesai","Pending"].map(s=><option key={s||"all"} value={s}>{s || "All Status"}</option>)}
                </select>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" onClick={fetchFromSP} disabled={loadingSP}>
                  {loadingSP ? "Loading..." : "Reload"}
                </button>
                <button className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white" onClick={handlePrintSP}>Print</button>
                <button className="px-5 py-2 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-bold" onClick={openCreate}>+ Tambah Ticket</button>
                {sel && (
                  <>
                    <button className="px-4 py-2 rounded bg-yellow-500 hover:bg-yellow-600 text-black" onClick={openEdit}>Edit</button>
                    <button className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>Hapus</button>
                  </>
                )}
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">Total: {filteredSP.length}{qSP ? ` (dari ${rowsSP.length})` : ""}</div>

            <div className="overflow-x-auto bg-white dark:bg-gray-700 rounded-xl shadow min-h-[350px]">
              <table className="min-w-full w-full text-base table-auto">
                <thead>
                  <tr className="bg-blue-50 dark:bg-blue-900 text-[#215ba6] dark:text-blue-300 text-lg">
                    <Th className="w-28">No. Ticket</Th>
                    <Th className="w-44">Waktu Lapor</Th>
                    <Th className="w-44">Waktu Selesai</Th>
                    <Th className="w-56">User Requestor</Th>
                    <Th className="w-56">Pelaksana (Tim IT)</Th>
                    <Th className="w-40">Divisi</Th>
                    <Th className="w-32">Prioritas</Th>
                    <Th className="w-28">Status</Th>
                    <Th>Deskripsi</Th>
                    <Th className="w-28">Lampiran</Th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSP ? (
                    <tr><td colSpan={10} className="px-5 py-10 text-center text-gray-400">Loading data...</td></tr>
                  ) : filteredSP.length === 0 ? (
                    <tr><td colSpan={10} className="px-5 py-10 text-center text-gray-400">Tidak ada data.</td></tr>
                  ) : (
                    filteredSP.map((it,i)=>(
                      <RowSP key={it.id} r={it} zebra={i%2===1} onSelect={()=>setSel(it)}
                             selected={sel?.id===it.id} msal={{ instance, accounts }}/>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== Staging Tab ===== */}
        {tab==="staging" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <input value={qST} onChange={(e)=>setQST(e.target.value)} placeholder="Cari…"
                       className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 w-64"/>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" onClick={loadStaging} disabled={loadingST}>
                  {loadingST ? "Loading..." : "Reload"}
                </button>
                <button className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white" onClick={handlePrintST}>Print</button>
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">Total: {filteredST.length}{qST ? ` (dari ${rowsST.length})` : ""}</div>

            <div className="overflow-x-auto bg-white dark:bg-gray-700 rounded-xl shadow min-h-[350px]">
              <table className="min-w-full w-full text-base table-auto">
                <thead>
                  <tr className="bg-blue-50 dark:bg-blue-900 text-[#215ba6] dark:text-blue-300 text-lg">
                    <Th className="w-28">No. Ticket</Th>
                    <Th className="w-44">Waktu Lapor</Th>
                    <Th className="w-44">Waktu Selesai</Th>
                    <Th className="w-56">User Requestor</Th>
                    <Th className="w-56">Pelaksana (Tim IT)</Th>
                    <Th className="w-40">Divisi</Th>
                    <Th className="w-32">Prioritas</Th>
                    <Th className="w-28">Status</Th>
                    <Th>Deskripsi</Th>
                    <Th className="w-28">Lampiran</Th>
                  </tr>
                </thead>
                <tbody>
                  {loadingST ? (
                    <tr><td colSpan={10} className="px-5 py-10 text-center text-gray-400">Loading data...</td></tr>
                  ) : filteredST.length === 0 ? (
                    <tr><td colSpan={10} className="px-5 py-10 text-center text-gray-400">Tidak ada data.</td></tr>
                  ) : (
                    filteredST.map((r,i)=> <RowST key={r.id || r.ticketNo || i} r={r} zebra={i%2===1} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Create/Edit (SharePoint) */}
      {modal.open && tab==="sp" && (
        <FormModal
          mode={modal.mode}
          data={modal.data}
          onClose={()=>{ setModal({open:false,mode:"",data:{}}); resetPhoto(); }}
          onSubmit={doCreateOrEdit}
          onPickPhoto={onPickPhoto}
          onRemovePhoto={removePhoto}
          fileInputRef={fileInputRef}
          photoPreview={photoPreview}
        />
      )}

      {/* Debug Panel */}
      <DebugPanel data={debugData} title="Struktur Data SharePoint" />
    </div>
  );
}

/* ===================== Sub Komponen ===================== */
function Th({ children, className = "" }) {
  return <th className={`px-5 py-4 font-semibold text-xs uppercase tracking-wide ${className}`}>{children}</th>;
}

function Td({ children, className = "" }) {
  return <td className={`px-5 py-3 align-top text-gray-900 dark:text-white ${className}`}>{children}</td>;
}

function Avatar({ name = "" }) {
  const init = useMemo(() => {
    const parts = String(name || "").trim().split(/\s+/);
    return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
  }, [name]);
  
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-sm font-semibold shadow">
      {String(init).toUpperCase()}
    </div>
  );
}

function Chip({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 text-xs">
      {children}
    </span>
  );
}

function PriorityChip({ value = "" }) {
  const v = String(value || "").toLowerCase();
  const style =
    v.includes("high") || v.includes("tinggi")
      ? "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100 border-red-200 dark:border-red-700"
      : v.includes("low") || v.includes("rendah")
      ? "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 border-green-200 dark:border-green-700"
      : "bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 border-yellow-200 dark:border-yellow-700";
  
  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-xs ${style}`}>
      {value || "-"}
    </span>
  );
}

function StatusBadge({ value = "" }) {
  const v = String(value || "").toLowerCase();
  const style =
    v === "selesai"
      ? "bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100 border-emerald-200 dark:border-emerald-700"
      : v === "belum"
      ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600"
      : "bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 border-yellow-200 dark:border-yellow-700";
  
  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-xs ${style}`}>
      {value || "-"}
    </span>
  );
}

/* ===== Row SP ===== */
function RowSP({ r, zebra, onSelect, selected, msal }) {
  const f = r.fields;
  const reqName = f.UserRequestor?.displayName || "-";
  const reqEmail = f.UserRequestor?.email || "";

  const exeName = f.Assignedto0?.displayName || f.Issueloggedby || "-";
  const exeEmail = f.Assignedto0?.email || "";

  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer ${
        selected
          ? "bg-purple-200 dark:bg-purple-800 font-bold"
          : zebra
          ? "bg-blue-50/60 dark:bg-blue-900/60"
          : ""
      } hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
    >
      <Td>{f.TicketNumber || r.id}</Td>
      <Td>{fmtWaktu(f.DateReported)}</Td>
      <Td>{fmtWaktu(f.DateFinished)}</Td>

      {/* User Requestor */}
      <Td>
        <div className="flex items-center gap-3">
          <Avatar name={reqName} />
          <div className="leading-tight">
            <div className="font-medium">{reqName}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{reqEmail}</div>
          </div>
        </div>
      </Td>

      {/* Pelaksana */}
      <Td>
        <div className="flex items-center gap-3">
          <Avatar name={exeName} />
          <div className="leading-tight">
            <div className="font-medium">{exeName}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{exeEmail}</div>
          </div>
        </div>
      </Td>

      <Td>
        <Chip>{f.Divisi || "-"}</Chip>
      </Td>
      <Td>
        <PriorityChip value={f.Priority} />
      </Td>
      <Td>
        <StatusBadge value={f.Status} />
      </Td>
      <Td>
        <div className="max-w-[560px] whitespace-pre-wrap">{f.Description || "-"}</div>
      </Td>
      <Td>
        {f[DONE_PHOTO_FIELD] ? (
          <button
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              openAttachmentWithToken(msal.instance, msal.accounts, r.id, f[DONE_PHOTO_FIELD]);
            }}
          >
            Lihat
          </button>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </Td>
    </tr>
  );
}

/* ===== Row ST ===== */
function RowST({ r, zebra }) {
  return (
    <tr className={`${zebra ? "bg-blue-50/60 dark:bg-blue-900/60" : ""} hover:bg-gray-50 dark:hover:bg-gray-700`}>
      <Td>{r.ticketNo || r.TicketNumber || "-"}</Td>
      <Td>{fmtWaktu(r.Created || r.waktu)}</Td>
      <Td>{fmtWaktu(r.DateFinished || "")}</Td>

      {/* User Requestor */}
      <Td>
        <div className="flex items-center gap-3">
          <Avatar name={r.userRequestor || r.Title || ""} />
          <div className="leading-tight">
            <div className="font-medium">{r.userRequestor || r.Title || "-"}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{r.email || ""}</div>
          </div>
        </div>
      </Td>

      {/* Pelaksana */}
      <Td>
        <div className="flex items-center gap-3">
          <Avatar name={r.pelaksana || ""} />
          <div className="leading-tight">
            <div className="font-medium">{r.pelaksana || "-"}</div>
          </div>
        </div>
      </Td>

      <Td>
        <Chip>{r.divisi || r.Division || "-"}</Chip>
      </Td>
      <Td>
        <PriorityChip value={r.prioritas || r.Priority} />
      </Td>
      <Td>
        <StatusBadge value={r.status || r.Status || ""} />
      </Td>
      <Td>
        <div className="max-w-[560px] whitespace-pre-wrap">{r.deskripsi || r.Description || "-"}</div>
      </Td>
      <Td>
        {r.PhotoUrl ? (
          <a
            href={r.PhotoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Lihat
          </a>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </Td>
    </tr>
  );
}

/* ===================== Modal Form (SharePoint) ===================== */
function FormModal({ mode, data, onClose, onSubmit, onPickPhoto, onRemovePhoto, photoPreview, fileInputRef }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-[720px] max-w-[92vw] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700"
      >
        <div
          className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between"
        >
          <div className="font-semibold">{mode === "edit" ? "Edit" : "Tambah"} Ticket</div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:underline">
            tutup
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">No. Ticket</label>
              <input
                name="TicketNumber"
                defaultValue={data.TicketNumber || ""}
                className="border rounded w-full px-3 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Judul (Title)</label>
              <input
                name="Title"
                defaultValue={data.Title || ""}
                className="border rounded w-full px-3 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Divisi</label>
              <select
                name="Divisi"
                defaultValue={data.Divisi || "Umum"}
                className="border rounded w-full px-3 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              >
                {DIVISI_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Prioritas</label>
              <select
                name="Priority"
                defaultValue={data.Priority || "Normal"}
                className="border rounded w-full px-3 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              >
                {["Low", "Normal", "High"].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Status</label>
              <select
                name="Status"
                defaultValue={data.Status || "Selesai"}
                className="border rounded w-full px-3 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              >
                {["Belum", "Pending", "Selesai"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Tipe Ticket</label>
              <input
                name="TipeTicket"
                defaultValue={data.TipeTicket || ""}
                className="border rounded w-full px-3 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Assigned To</label>
              <input
                name="Assignedto0"
                defaultValue={data.Assignedto0?.displayName || data.Assignedto0 || ""}
                className="border rounded w-full px-3 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                placeholder="Nama/ID internal"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Pelaksana (Operator)</label>
              <input
                name="Issueloggedby"
                defaultValue={data.Issueloggedby || ""}
                className="border rounded w-full px-3 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Waktu Lapor</label>
              <input
                name="DateReported"
                defaultValue={data.DateReported || ""}
                className="border rounded w-full px-3 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                placeholder="ISO string / yyyy-mm-dd"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Waktu Selesai</label>
              <input
                name="DateFinished"
                defaultValue={data.DateFinished || ""}
                className="border rounded w-full px-3 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                placeholder="ISO string / yyyy-mm-dd"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold mb-1">Deskripsi</label>
              <textarea
                name="Description"
                defaultValue={data.Description || ""}
                rows={3}
                className="border rounded w-full px-3 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Foto Bukti Selesai (opsional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPickPhoto}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {photoPreview ? (
              <div className="mt-3 flex items-center gap-3">
                <img src={photoPreview} alt="preview" className="h-20 w-20 object-cover rounded-lg border" />
                <button type="button" onClick={onRemovePhoto} className="text-red-600 hover:underline">
                  Hapus foto
                </button>
              </div>
            ) : data?.[DONE_PHOTO_FIELD] ? (
              <OldPhotoPreview metaName={data[DONE_PHOTO_FIELD]} itemId={data.spId} />
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 dark:text-white"
              onClick={onClose}
            >
              Batal
            </button>
            <button type="submit" className="px-5 py-2 rounded bg-blue-600 text-white font-bold">
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===================== Attachment Helpers (SP) ===================== */
async function uploadAttachmentToSP(instance, accounts, itemId, file) {
  const account = accounts?.[0];
  const spTok = await instance.acquireTokenSilent({ scopes: SHAREPOINT_SCOPE, account });
  const buf = await file.arrayBuffer();
  const upUrl = `${REST_URL}/_api/web/lists(guid'${TICKET_LIST_ID}')/items(${itemId})/AttachmentFiles/add(FileName='${encodeURIComponent(file.name)}')`;
  const r = await fetch(upUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${spTok.accessToken}`,
      Accept: "application/json;odata=verbose",
      "Content-Type": "application/octet-stream",
    },
    body: buf,
  });
  const txt = await r.text();
  if (!r.ok) {
    console.error("Upload error:", txt);
    throw new Error("Gagal upload lampiran");
  }
  return { fileName: file.name };
}

async function setDonePhotoMetaOnSP(instance, accounts, itemId, fileName) {
  const account = accounts?.[0];
  const gTok = await instance.acquireTokenSilent({ scopes: GRAPH_SCOPE, account });
  const body = { [DONE_PHOTO_FIELD]: fileName };
  const r = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${TICKET_LIST_ID}/items/${itemId}/fields`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${gTok.accessToken}`, "Content-Type":"application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!r.ok) {
    const t = await r.text();
    console.warn("Set photo meta failed:", t);
  }
}

async function openAttachmentWithToken(instance, accounts, itemId, fileName) {
  const account = accounts?.[0];
  const spTok = await instance.acquireTokenSilent({ scopes: SHAREPOINT_SCOPE, account });
  const url = `${REST_URL}/_api/web/lists(guid'${TICKET_LIST_ID}')/items(${itemId})/AttachmentFiles('${encodeURIComponent(fileName)}')/$value`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${spTok.accessToken}` } });
  if (!r.ok) throw new Error(`Gagal ambil lampiran: ${r.status}`);
  const blob = await r.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
}

/* ===================== Preview Foto Lama ===================== */
function OldPhotoPreview({ metaName, itemId }) {
  if (!metaName || !itemId) return null;
  
  // Fungsi untuk membuat URL lampiran SharePoint
  const spAttachmentUrl = (itemId, fileName) => {
    return `${REST_URL}/_api/web/lists(guid'${TICKET_LIST_ID}')/items(${itemId})/AttachmentFiles('${encodeURIComponent(fileName)}')/$value`;
  };
  
  const url = spAttachmentUrl(itemId, metaName);
  return (
    <div className="mt-3">
      <img src={url} alt="current" className="h-20 w-20 object-cover rounded-lg border" />
    </div>
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

/* ===================== Debug Panel ===================== */
function DebugPanel({ data, title = "Debug Info" }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!data) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-red-500 text-white px-3 py-1 rounded-md text-sm"
      >
        {isOpen ? "Tutup Debug" : "Buka Debug"}
      </button>

      {isOpen && (
        <div className="mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-4 max-w-lg max-h-96 overflow-auto">
          <h3 className="font-bold mb-2">{title}</h3>
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}