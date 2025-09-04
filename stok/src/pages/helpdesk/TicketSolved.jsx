// src/pages/helpdesk/TicketSolved.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";

/* ===================== KONFIG SharePoint ===================== */
const siteId =
  "waskitainfra.sharepoint.com,32252c41-8aed-4ed2-ba35-b6e2731b0d4a,fb2ae80c-1283-4942-a3e8-0d47e8d004fb";
const TICKET_LIST_ID = "e4a152ba-ee6e-4e1d-9c74-04e8d32ea912";
const REST_URL = "https://waskitainfra.sharepoint.com/sites/ITHELPDESK";

// token scopes
const GRAPH_SCOPE = ["Sites.ReadWrite.All"];
const SHAREPOINT_SCOPE = ["https://waskitainfra.sharepoint.com/.default"];

// nama list (untuk path AttachmentFiles)
const TICKET_LIST_NAME_FOR_ATTACH = "Tickets";

// kolom text untuk menyimpan **nama file** foto bukti selesai
const DONE_PHOTO_FIELD = "ScreenshotBuktiTicketsudahDilaku";

// (opsional) kolom images untuk bukti keluhan awal
const PROOF_IMAGES_FIELD = "Images";

/* ===================== Divisi ===================== */
const DIVISI_OPTIONS = [
  "IT & System",
  "Business Development",
  "Direksi",
  "Engineering",
  "Finance & Accounting",
  "Human Capital",
  "Legal",
  "Marketing & Sales",
  "Operation & Maintenance",
  "Procurement & Logistic",
  "Project",
  "QHSE",
  "Sekper",
  "Warehouse",
  "Umum",
];

/* ===================== Utils ===================== */
const esc = (v) =>
  String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

function fmtWaktu(s) {
  try {
    return new Date(s).toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return s || "-";
  }
}

/* ===================== Field Mapping ===================== */
function mapSpItem(item) {
  const f = item.fields || {};
  return {
    spId: item.id,
    Title: f.Title || "",
    TicketNumber: f.TicketNumber || f.ID,
    Description: f.Description || "",
    Priority: f.Priority || "Normal",
    Status: f.Status || "",
    Divisi: f.Divisi || "Umum",
    DateReported: f.DateReported || f.Created || "",
    DateFinished: f.DateFinished || "",
    TipeTicket: f.TipeTicket || "",
    Assignedto0: f.Assignedto0 || "",
    Issueloggedby: f.Issueloggedby || "",
    Author: f.Author || null,
    [DONE_PHOTO_FIELD]: f[DONE_PHOTO_FIELD] || "",
    HasAttachments: !!f.Attachments,
  };
}

function buildFieldsPayload(src) {
  return {
    Title:
      src.Title ||
      (src.Description ? String(src.Description).slice(0, 120) : `Ticket ${src.TicketNumber || ""}`),
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

/* ===================== Attachment URL helpers ===================== */
function spAttachmentUrl(itemId, fileName) {
  if (!itemId || !fileName) return "";
  return `${REST_URL}/Lists/${TICKET_LIST_NAME_FOR_ATTACH}/Attachments/${itemId}/${encodeURIComponent(
    fileName
  )}`;
}

/* ===================== KOMPONEN ===================== */
export default function TicketSolved() {
  const { instance, accounts } = useMsal();

  const [rows, setRows] = useState([]); // [{ id, fields: mapSpItem() }]
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState("");
  const [q, setQ] = useState("");

  // DEFAULT: All Status (bukan "Selesai") agar data langsung kelihatan
  const [filter, setFilter] = useState({ Divisi: "", Priority: "", Status: "" });

  const [sel, setSel] = useState(null); // selected row (raw)
  const [modal, setModal] = useState({ open: false, mode: "", data: {} });

  // foto state saat create/edit
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const fileInputRef = useRef(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((it) => {
      const f = it.fields;
      if (filter.Status && (f.Status || "") !== filter.Status) return false;
      if (filter.Divisi && (f.Divisi || "") !== filter.Divisi) return false;
      if (filter.Priority && (f.Priority || "") !== filter.Priority) return false;
      if (!s) return true;
      return [
        f.TicketNumber,
        f.Title,
        f.Description,
        f.Divisi,
        f.Priority,
        f.Status,
        f.TipeTicket,
        f.Assignedto0,
        f.Issueloggedby,
        f.Author?.displayName,
        f.Author?.email,
        it.id,
        it.fields?.spId,
      ]
        .join(" ")
        .toLowerCase()
        .includes(s);
    });
  }, [rows, q, filter]);

  useEffect(() => {
    fetchFromSP();
  }, []);

  async function fetchFromSP() {
    setLoading(true);
    try {
      const account = accounts?.[0];
      if (!account) throw new Error("Belum login MSAL");
      const tok = await instance.acquireTokenSilent({ scopes: GRAPH_SCOPE, account });

      const base =
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${TICKET_LIST_ID}/items` +
        `?$expand=fields($select=ID,Title,TicketNumber,Description,Priority,Status,Divisi,` +
        `DateReported,DateFinished,${DONE_PHOTO_FIELD},${PROOF_IMAGES_FIELD},Assignedto0,Issueloggedby,Created,Author)&$top=2000`;

      const url = filter.Status ? `${base}&$filter=fields/Status eq '${filter.Status}'` : base;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${tok.accessToken}` } });
      const j = await res.json();
      if (!res.ok) {
        const msg = j?.error?.message || JSON.stringify(j).slice(0, 200);
        throw new Error(msg);
      }
      const items = (j.value || []).map((v) => ({ id: v.id, fields: mapSpItem(v) }));
      setRows(items);
      setSel(null);
    } catch (e) {
      console.error(e);
      setNotif("Gagal mengambil data SharePoint: " + (e?.message || e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  /* ========== CREATE / EDIT / DELETE ========== */
  function openCreate() {
    resetPhoto();
    setModal({
      open: true,
      mode: "create",
      data: {
        Title: "",
        TicketNumber: "",
        Description: "",
        Priority: "Normal",
        Status: "Selesai",
        Divisi: "Umum",
        DateReported: new Date().toISOString(),
        DateFinished: new Date().toISOString(),
        TipeTicket: "",
        Assignedto0: "",
        Issueloggedby: "",
      },
    });
  }
  function openEdit() {
    if (!sel) return;
    resetPhoto();
    setModal({ open: true, mode: "edit", data: { ...sel.fields, spId: sel.id } });
  }

  async function handleDelete() {
    if (!sel) return;
    if (!window.confirm(`Hapus Ticket #${sel.fields.TicketNumber || sel.id}?`)) return;
    setLoading(true);
    try {
      const account = accounts?.[0];
      const tok = await instance.acquireTokenSilent({ scopes: GRAPH_SCOPE, account });
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${TICKET_LIST_ID}/items/${sel.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${tok.accessToken}` } }
      );
      if (!res.ok) throw new Error(await res.text());
      setNotif("Data berhasil dihapus.");
      await fetchFromSP();
    } catch (e) {
      console.error(e);
      setNotif("Gagal menghapus: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function doCreateOrEdit(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const account = accounts?.[0];
      const gTok = await instance.acquireTokenSilent({ scopes: GRAPH_SCOPE, account });

      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());

      const fields = buildFieldsPayload({
        Title: data.Title,
        TicketNumber: data.TicketNumber,
        Description: data.Description,
        Priority: data.Priority || "Normal",
        Status: data.Status || "Selesai",
        Divisi: data.Divisi || "Umum",
        DateReported: data.DateReported || undefined,
        DateFinished: data.DateFinished || undefined,
        TipeTicket: data.TipeTicket || undefined,
        Assignedto0: data.Assignedto0 || undefined,
        Issueloggedby: data.Issueloggedby || undefined,
      });

      let itemId = null;
      if (modal.mode === "create") {
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${TICKET_LIST_ID}/items`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${gTok.accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ fields }),
          }
        );
        if (!res.ok) throw new Error(await res.text());
        const created = await res.json();
        itemId = created?.id;
      } else if (modal.mode === "edit") {
        itemId = sel?.id;
        if (!itemId) throw new Error("Tidak ada item terpilih.");
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${TICKET_LIST_ID}/items/${itemId}/fields`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${gTok.accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(fields),
          }
        );
        if (!res.ok) throw new Error(await res.text());
      }

      // Upload foto lampiran jika ada
      if (itemId && photoFile) {
        const saved = await uploadAttachmentToSP(instance, accounts, itemId, photoFile);
        await setDonePhotoMetaOnSP(instance, accounts, itemId, saved.fileName);
      }

      setNotif(modal.mode === "create" ? "Berhasil menambahkan data." : "Perubahan tersimpan.");
      setModal({ open: false, mode: "", data: {} });
      resetPhoto();
      await fetchFromSP();
    } catch (e) {
      console.error(e);
      setNotif("Gagal simpan: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  /* ========== FOTO HELPERS ========== */
  function onPickPhoto(e) {
    const f = e.target.files?.[0];
    if (f) {
      setPhotoFile(f);
      const url = URL.createObjectURL(f);
      setPhotoPreview(url);
    }
  }
  function removePhoto() {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
  function resetPhoto() {
    removePhoto();
  }

  /* ========== PRINT ========== */
  function handlePrint() {
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
    const body = items
      .map((it) => {
        const f = it.fields;
        return `
        <tr>
          <td>${esc(f.TicketNumber)}</td>
          <td>${esc(fmtWaktu(f.DateReported))}</td>
          <td>${esc(fmtWaktu(f.DateFinished))}</td>
          <td>${esc(f.Author?.displayName || "")}</td>
          <td>${esc(f.Divisi)}</td>
          <td>${esc(f.Priority)}</td>
          <td>${esc(f.Status)}</td>
          <td>${esc(f.Description)}</td>
        </tr>`;
      })
      .join("");

    const html = `<!doctype html><html><head>${head}</head><body>
      <h1>Ticket Solved</h1>
      <table>
        <thead>
          <tr>
            <th>No. Ticket</th>
            <th>Waktu Lapor</th>
            <th>Waktu Selesai</th>
            <th>Pemohon</th>
            <th>Divisi</th>
            <th>Prioritas</th>
            <th>Status</th>
            <th>Deskripsi</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
      <script>onload=()=>{print();setTimeout(()=>close(),300)}</script>
    </body></html>`;
    const w = window.open("", "_blank", "noopener,noreferrer");
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center py-4">
      {notif && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded shadow-md font-bold"
          onClick={() => setNotif("")}
        >
          {notif}
        </div>
      )}

      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="bg-white/95 dark:bg-gray-800/90 rounded-2xl p-6 w-full max-w-[95vw] shadow-xl">
          {/* Header */}
          <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-1 text-[#215ba6] dark:text-white">Ticket Solved</h2>
              <p className="text-sm text-gray-500">
                Data langsung dari SharePoint List:{" "}
                <code className="bg-gray-100 px-1 rounded">TICKETS</code>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari: ticket, divisi, user, deskripsi…"
                className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white w-64"
              />
              <select
                className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white"
                value={filter.Divisi}
                onChange={(e) => setFilter((f) => ({ ...f, Divisi: e.target.value }))}
              >
                <option value="">All Divisi</option>
                {DIVISI_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white"
                value={filter.Priority}
                onChange={(e) => setFilter((f) => ({ ...f, Priority: e.target.value }))}
              >
                <option value="">All Prioritas</option>
                {["Low", "Normal", "High"].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white"
                value={filter.Status}
                onChange={(e) => setFilter((f) => ({ ...f, Status: e.target.value }))}
              >
                {["", "Belum", "Selesai", "Pending"].map((s) => (
                  <option key={s || "all"} value={s}>
                    {s ? s : "All Status"}
                  </option>
                ))}
              </select>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                onClick={fetchFromSP}
                disabled={loading}
              >
                {loading ? "Loading..." : "Reload"}
              </button>
              <button className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100" onClick={handlePrint}>
                Print
              </button>
              <button
                className="px-5 py-2 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
                onClick={openCreate}
              >
                + Tambah Ticket
              </button>
              {sel ? (
                <>
                  <button className="px-4 py-2 rounded bg-yellow-500 hover:bg-yellow-600 text-black" onClick={openEdit}>
                    Edit
                  </button>
                  <button className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
                    Hapus
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* Counter */}
          <div className="text-sm text-gray-600 mb-3">Total: {filtered.length}{q ? ` (dari ${rows.length})` : ""}</div>

          {/* Tabel */}
          <div className="overflow-x-auto bg-white/95 dark:bg-gray-900/90 rounded-xl shadow min-h-[350px]">
            <table className="min-w-full w-full text-base table-auto">
              <thead>
                <tr className="bg-blue-50 dark:bg-gray-800 text-[#215ba6] dark:text-white text-lg">
                  <Th className="w-32">No. Ticket</Th>
                  <Th className="w-48">Waktu Lapor</Th>
                  <Th className="w-48">Waktu Selesai</Th>
                  <Th className="w-64">Pemohon</Th>
                  <Th className="w-40">Divisi</Th>
                  <Th className="w-36">Prioritas</Th>
                  <Th className="w-28">Status</Th>
                  <Th>Deskripsi</Th>
                  <Th className="w-28">Lampiran</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-gray-400">
                      Loading data...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-gray-400">
                      Tidak ada data.
                    </td>
                  </tr>
                ) : (
                  filtered.map((it, i) => (
                    <Row
                      key={it.id}
                      r={it}
                      zebra={i % 2 === 1}
                      onSelect={() => setSel(it)}
                      selected={sel?.id === it.id}
                      msal={{ instance, accounts }}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Create/Edit */}
      {modal.open && (
        <FormModal
          mode={modal.mode}
          data={modal.data}
          onClose={() => {
            setModal({ open: false, mode: "", data: {} });
            resetPhoto();
          }}
          onSubmit={doCreateOrEdit}
          onPickPhoto={onPickPhoto}
          onRemovePhoto={removePhoto}
          fileInputRef={fileInputRef}
          photoPreview={photoPreview}
        />
      )}
    </div>
  );
}

/* ===================== Sub Komponen ===================== */
function Th({ children, className = "" }) {
  return <th className={`px-5 py-4 font-semibold text-xs uppercase tracking-wide ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-5 py-3 align-top ${className}`}>{children}</td>;
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
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 text-xs">
      {children}
    </span>
  );
}
function PriorityChip({ value = "" }) {
  const v = String(value || "").toLowerCase();
  const style =
    v.includes("high") || v.includes("tinggi")
      ? "bg-red-100 text-red-800 border-red-200"
      : v.includes("low") || v.includes("rendah")
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-yellow-100 text-yellow-800 border-yellow-200";
  return <span className={`inline-flex px-2 py-0.5 rounded border text-xs ${style}`}>{value || "-"}</span>;
}
function StatusBadge({ value = "" }) {
  const v = String(value || "").toLowerCase();
  const style =
    v === "selesai"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : v === "belum"
      ? "bg-gray-100 text-gray-700 border-gray-200"
      : "bg-yellow-100 text-yellow-800 border-yellow-200";
  return <span className={`inline-flex px-2 py-0.5 rounded border text-xs ${style}`}>{value || "-"}</span>;
}

function Row({ r, zebra, onSelect, selected, msal }) {
  const f = r.fields;
  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer ${
        selected ? "bg-purple-200 font-bold" : zebra ? "bg-blue-50/60 dark:bg-gray-800/60" : ""
      } hover:bg-gray-50 transition-colors`}
    >
      <Td className="text-gray-800 dark:text-gray-100">{f.TicketNumber || r.id}</Td>
      <Td className="text-gray-800 dark:text-gray-100">{fmtWaktu(f.DateReported)}</Td>
      <Td className="text-gray-800 dark:text-gray-100">{fmtWaktu(f.DateFinished)}</Td>
      <Td>
        <div className="flex items-center gap-3">
          <Avatar name={f.Author?.displayName || ""} />
          <div className="leading-tight">
            <div className="font-medium text-gray-900 dark:text-gray-100">{f.Author?.displayName || "-"}</div>
            <div className="text-xs text-gray-500">{f.Author?.email || ""}</div>
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
        <div className="max-w-[560px] whitespace-pre-wrap text-gray-800 dark:text-gray-100">
          {f.Description || "-"}
        </div>
      </Td>
      <Td>
        {f[DONE_PHOTO_FIELD] ? (
          <button
            className="text-indigo-600 hover:underline"
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

/* ===================== Modal Form ===================== */
function FormModal({ mode, data, onClose, onSubmit, onPickPhoto, onRemovePhoto, photoPreview, fileInputRef }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-[720px] max-w-[92vw] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-[fadeIn_.2s_ease]">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="font-semibold">{mode === "edit" ? "Edit" : "Tambah"} Ticket</div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:underline">
            tutup
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">No. Ticket</label>
              <input name="TicketNumber" defaultValue={data.TicketNumber || ""} className="border rounded w-full px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Judul (Title)</label>
              <input name="Title" defaultValue={data.Title || ""} className="border rounded w-full px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Divisi</label>
              <select name="Divisi" defaultValue={data.Divisi || "Umum"} className="border rounded w-full px-3 py-2">
                {DIVISI_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Prioritas</label>
              <select name="Priority" defaultValue={data.Priority || "Normal"} className="border rounded w-full px-3 py-2">
                {["Low", "Normal", "High"].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Status</label>
              <select name="Status" defaultValue={data.Status || "Selesai"} className="border rounded w-full px-3 py-2">
                {["Belum", "Pending", "Selesai"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Tipe Ticket</label>
              <input name="TipeTicket" defaultValue={data.TipeTicket || ""} className="border rounded w-full px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Assigned To</label>
              <input
                name="Assignedto0"
                defaultValue={data.Assignedto0 || ""}
                className="border rounded w-full px-3 py-2"
                placeholder="Nama/ID internal"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Pelaksana (Operator)</label>
              <input name="Issueloggedby" defaultValue={data.Issueloggedby || ""} className="border rounded w-full px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Waktu Lapor</label>
              <input
                name="DateReported"
                defaultValue={data.DateReported || ""}
                className="border rounded w-full px-3 py-2"
                placeholder="ISO string / yyyy-mm-dd"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Waktu Selesai</label>
              <input
                name="DateFinished"
                defaultValue={data.DateFinished || ""}
                className="border rounded w-full px-3 py-2"
                placeholder="ISO string / yyyy-mm-dd"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold mb-1">Deskripsi</label>
              <textarea name="Description" defaultValue={data.Description || ""} rows={3} className="border rounded w-full px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Foto Bukti Selesai (opsional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPickPhoto}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0 file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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
            <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={onClose}>
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

/* ===================== Attachment Helpers ===================== */
async function uploadAttachmentToSP(instance, accounts, itemId, file) {
  const account = accounts?.[0];
  const spTok = await instance.acquireTokenSilent({ scopes: SHAREPOINT_SCOPE, account });
  const buf = await file.arrayBuffer();

  const upUrl = `${REST_URL}/_api/web/lists(guid'${TICKET_LIST_ID}')/items(${itemId})/AttachmentFiles/add(FileName='${encodeURIComponent(
    file.name
  )}')`;

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
  const body = { [DONE_PHOTO_FIELD]: fileName }; // simpan nama file (kolom text)

  const r = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${TICKET_LIST_ID}/items/${itemId}/fields`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${gTok.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!r.ok) {
    const t = await r.text();
    console.warn("Set photo meta failed:", t);
  }
}

/** Ambil lampiran via SharePoint token lalu buka sebagai Blob URL (hindari redirect login) */
async function openAttachmentWithToken(instance, accounts, itemId, fileName) {
  const account = accounts?.[0];
  const spTok = await instance.acquireTokenSilent({ scopes: SHAREPOINT_SCOPE, account });

  const url = `${REST_URL}/_api/web/lists(guid'${TICKET_LIST_ID}')/items(${itemId})/AttachmentFiles('${encodeURIComponent(
    fileName
  )}')/$value`;

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
  const url = spAttachmentUrl(itemId, metaName);
  return (
    <div className="mt-3">
      <img src={url} alt="current" className="h-20 w-20 object-cover rounded-lg border" />
    </div>
  );
}
