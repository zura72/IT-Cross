import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";

/** ====== KONFIG ====== */
const siteId =
  "waskitainfra.sharepoint.com,32252c41-8aed-4ed2-ba35-b6e2731b0d4a,fb2ae80c-1283-4942-a3e8-0d47e8d004fb";
const listId = "95880dbf-54dc-4bbb-a438-d6519941a409";
const REST_URL = "https://waskitainfra.sharepoint.com/sites/ITHELPDESK";
const GRAPH_SCOPE = ["Sites.ReadWrite.All"];
const SHAREPOINT_SCOPE = ["https://waskitainfra.sharepoint.com/.default"];

const PHOTO_FIELD_INTERNAL_NAME = "DevicePhoto";

/** ====== KOMPONEN ====== */
export default function Devices() {
  const { instance, accounts } = useMsal();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [notif, setNotif] = useState("");
  const [filter, setFilter] = useState({ Status: "", Model: "", Divisi: "" });

  const [modal, setModal] = useState({ open: false, mode: "", data: {} });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const fileInputRef = useRef(null);

  /** ====== Field Mapping untuk tabel & form ====== */
  const FIELDS = useMemo(
    () => [
      { name: "Foto", key: "Foto_x0020_Peralang" },
      { name: "Title", key: "Title" },
      { name: "Status", key: "Status" },
      { name: "Tipe", key: "Model" },
      { name: "Pabrikan", key: "Manufacturer" },
      { name: "Nomor Serial", key: "SerialNumber" },
      { name: "Pengguna", key: "CurrentOwnerLookupId" },
      { name: "Departemen", key: "Divisi" },  
      { name: "Antivirus", key: "AntiVirus" },
    ],
    []
  );

  /** ====== Fetch data list ====== */
  useEffect(() => {
    if (accounts.length > 0) fetchData();
  }, [accounts.length]);

  async function fetchData() {
    setLoading(true);
    try {
      const account = accounts[0];
      const token = await instance.acquireTokenSilent({
        scopes: GRAPH_SCOPE,
        account,
      });

      const res = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields`,
        { headers: { Authorization: `Bearer ${token.accessToken}` } }
      );
      const json = await res.json();
      setData(json.value || []);
      setSelectedRow(null);
    } catch (err) {
      setNotif("Gagal mengambil data: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  /** ====== Fetch nama user SP untuk CurrentOwnerLookupId ====== */
  useEffect(() => {
    if (!data || data.length === 0) return;
    const ids = Array.from(
      new Set(
        data
          .map((d) => d?.fields?.CurrentOwnerLookupId)
          .filter((v) => v != null)
      )
    );
    if (ids.length === 0) return;

    let alive = true;
    (async () => {
      try {
        const account = accounts[0];
        const token = await instance.acquireTokenSilent({
          scopes: SHAREPOINT_SCOPE,
          account,
        });
        const map = { ...userMap };

        for (const id of ids) {
          if (map[id]) continue;
          try {
            const r = await fetch(`${REST_URL}/_api/web/getuserbyid(${id})`, {
              headers: {
                Authorization: `Bearer ${token.accessToken}`,
                Accept: "application/json;odata=verbose",
              },
            });
            const t = await r.text();
            if (r.ok) {
              const u = JSON.parse(t);
              map[id] = u?.d?.Title || u?.d?.Email || String(id);
            } else {
              map[id] = String(id);
            }
          } catch {
            map[id] = String(id);
          }
        }
        if (alive) setUserMap(map);
      } catch (e) {
        console.warn("getuserbyid failed", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, [data]);

  /** ====== Helpers filter & render ====== */
  function getUniqueOptions(fieldKey) {
    const opts = new Set();
    data.forEach((item) => {
      const val = item.fields?.[fieldKey];
      if (val) opts.add(val);
    });
    return Array.from(opts).sort();
  }

  function getFiltered() {
    return data.filter((item) => {
      if (filter.Status && item.fields?.Status !== filter.Status) return false;
      if (filter.Model && item.fields?.Model !== filter.Model) return false;
      if (filter.Divisi && item.fields?.Divisi !== filter.Divisi) return false;
      return true;
    });
  }

  function getPhotoUrl(fields) {
    let url = "";
    try {
      let obj = fields?.[PHOTO_FIELD_INTERNAL_NAME];
      if (typeof obj === "string") obj = JSON.parse(obj);
      if (fields.Attachments && obj?.fileName && fields.id) {
        url = `${REST_URL}/Lists/Devices/Attachments/${fields.id}/${obj.fileName}`;
      }
    } catch {
      url = "";
    }
    return url;
  }

  function renderPhoto(fields) {
    const url = getPhotoUrl(fields);
    return (
      <div className="w-14 h-14 bg-gray-200 flex items-center justify-center overflow-hidden rounded shadow">
        {url ? (
          <img src={url} alt="Device" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </div>
    );
  }

  function renderPengguna(fields) {
    const id = fields?.CurrentOwnerLookupId;
    if (!id) return "";
    return userMap[id] || id;
  }

  /** ====== PRINT helpers ====== */
  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  function buildPrintHTML(rows) {
    const printedAt = new Date().toLocaleString();
    const head = `
      <meta charset=\"utf-8\" />
      <title>Devices — Print</title>
      <style>
        /* Kertas & margin */
        @page { size: A4 landscape; margin: 12mm; }
        html, body { color:#000; font: 12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        h1 { font-size: 18px; margin: 0 0 6px; }
        .meta { font-size: 11px; margin: 0 0 12px; color:#555; }

        /* Tabel dan border tebal */
        table { width: 100%; border-collapse: collapse; border: 1.5pt solid #000; }
        thead th { background: #f0f6ff; text-align: left; border: 1.2pt solid #000; }
        th, td { padding: 6px 8px; vertical-align: top; }
        tbody td { border: 0.9pt solid #000; }
        tr { page-break-inside: avoid; }
        thead { display: table-header-group; }
        tfoot { display: table-row-group; }

        td img { height: 48px; width: 64px; object-fit: cover; border-radius: 6px; border: 0.9pt solid #000; }
        .center { text-align: center; }
      </style>
    `;

    const headerCells = FIELDS.map((f) => `<th>${esc(f.name)}</th>`).join("");

    const rowsHtml = rows
      .map((item) => {
        const f = item.fields || {};
        const foto = getPhotoUrl(f)
          ? `<img src="${getPhotoUrl(f)}" alt="foto" />`
          : "—";
        const antivirus = f.AntiVirus ? "✔" : "";
        const pengguna = f.CurrentOwnerLookupId
          ? esc(userMap[f.CurrentOwnerLookupId] || f.CurrentOwnerLookupId)
          : "";

        const cells = [
          foto,
          esc(f.Title),
          esc(f.Status),
          esc(f.Model),
          esc(f.Manufacturer),
          esc(f.SerialNumber),
          pengguna,
          esc(f.Divisi),
          antivirus,
        ]
          .map((v, idx) => (idx === 0 ? `<td class=\"center\">${v}</td>` : `<td>${v}</td>`))
          .join("");

        return `<tr>${cells}</tr>`;
      })
      .join("");

    return `
      <!doctype html>
      <html>
        <head>${head}</head>
        <body>
          <h1>Devices</h1>
          <div class="meta">
            Total baris: ${rows.length} &nbsp;|&nbsp; Dicetak: ${esc(printedAt)}
          </div>
          <table>
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(() => window.close(), 300);
            };
          </script>
        </body>
      </html>
    `;
  }

  function handlePrint(all = false) {
    const rows = all ? data : getFiltered();
    if (!rows || rows.length === 0) {
      alert("Tidak ada data untuk dicetak.");
      return;
    }
    const html = buildPrintHTML(rows);
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      alert("Popup diblokir. Izinkan pop-up untuk mencetak.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  /** ====== CRUD handlers ====== */
  function handleTambah() {
    resetPhoto();
    setModal({ open: true, mode: "create", data: {} });
  }
  function handleEdit() {
    if (!selectedRow) return;
    resetPhoto();
    setModal({ open: true, mode: "edit", data: selectedRow.fields || {} });
  }
  async function handleDelete() {
    if (!selectedRow) return;
    if (!window.confirm(`Yakin hapus device "${selectedRow.fields?.Title || ""}"?`)) return;

    setLoading(true);
    try {
      const account = accounts[0];
      const token = await instance.acquireTokenSilent({
        scopes: GRAPH_SCOPE,
        account,
      });
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${selectedRow.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token.accessToken}` } }
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      setNotif("Data berhasil dihapus!");
      await fetchData();
    } catch (e) {
      console.error(e);
      setNotif("Gagal menghapus data: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  /** ====== Build fields whitelist untuk Graph ====== */
  function buildFieldsFromForm(formEl) {
    const fd = new FormData(formEl);

    const allowed = [
      "Title",
      "Status",
      "Model",
      "Manufacturer",
      "SerialNumber",
      "CurrentOwnerLookupId",
      "Divisi",
      "AntiVirus",
    ];

    const out = {};
    for (const key of allowed) {
      if (fd.has(key)) out[key] = fd.get(key);
    }

    out.AntiVirus = fd.has("AntiVirus");

    if (!out.CurrentOwnerLookupId) {
      delete out.CurrentOwnerLookupId;
    } else {
      const id = parseInt(out.CurrentOwnerLookupId, 10);
      if (!Number.isFinite(id)) {
        throw new Error("Pengguna harus angka (SharePoint User ID).");
      }
      out.CurrentOwnerLookupId = id;
    }

    Object.keys(out).forEach((k) => {
      if (out[k] === "" || out[k] == null) delete out[k];
    });

    return out;
  }

  /** ====== Upload attachment & set field foto ====== */
  async function uploadAttachment(itemId, file) {
    const account = accounts[0];
    const spTok = await instance.acquireTokenSilent({
      scopes: SHAREPOINT_SCOPE,
      account,
    });

    const fileName = file.name;
    const buf = await file.arrayBuffer();

    const upUrl = `${REST_URL}/_api/web/lists(guid'${listId}')/items(${itemId})/AttachmentFiles/add(FileName='${encodeURIComponent(
      fileName
    )}')`;

    const res = await fetch(upUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${spTok.accessToken}`,
        Accept: "application/json;odata=verbose",
        "Content-Type": "application/octet-stream",
      },
      body: buf,
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("Upload error:", text);
      throw new Error("Gagal upload lampiran");
    }
    return { fileName };
  }

  async function setPhotoField(itemId, saved) {
    if (!saved?.fileName) return;

    const account = accounts[0];
    const gTok = await instance.acquireTokenSilent({
      scopes: GRAPH_SCOPE,
      account,
    });

    const body = {
      [PHOTO_FIELD_INTERNAL_NAME]: JSON.stringify({
        fileName: saved.fileName,
      }),
    };

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}/fields`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${gTok.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const t = await res.text();
      console.warn("Set photo field failed:", t);
    }
  }

  /** ====== Submit create/edit ====== */
  async function doCreateOrEdit(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const fields = buildFieldsFromForm(e.currentTarget);

      const account = accounts[0];
      const gTok = await instance.acquireTokenSilent({
        scopes: GRAPH_SCOPE,
        account,
      });

      const readGraphError = async (res) => {
        let msg = `HTTP ${res.status}`;
        try {
          const t = await res.text();
          const j = JSON.parse(t);
          console.log("Graph error detail:", j);
          msg = j?.error?.message || msg;
        } catch {}
        return msg;
      };

      if (modal.mode === "create") {
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${gTok.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ fields }),
          }
        );
        if (!res.ok) throw new Error(await readGraphError(res));

        const created = await res.json();
        const newId = created?.id || created?.value?.[0]?.id;

        if (photoFile && newId) {
          const saved = await uploadAttachment(newId, photoFile);
          await setPhotoField(newId, saved);
        }

        setNotif("Data berhasil ditambahkan!");
      } else if (modal.mode === "edit" && selectedRow) {
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${selectedRow.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${gTok.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ fields }),
          }
        );
        if (!res.ok) throw new Error(await readGraphError(res));

        if (photoFile) {
          const saved = await uploadAttachment(selectedRow.id, photoFile);
          await setPhotoField(selectedRow.id, saved);
        }

        setNotif("Data berhasil diedit!");
      }

      setModal({ open: false, mode: "", data: {} });
      resetPhoto();
      await fetchData();
    } catch (err) {
      console.error(err);
      setNotif("Gagal simpan: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  /** ====== Foto helpers ====== */
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

  /** ====== UI ====== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      {notif && (
        <div
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg font-semibold transition-opacity duration-300 cursor-pointer"
          onClick={() => setNotif("")}
        >
          {notif}
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setModal({ open: false, mode: "", data: {} });
                resetPhoto();
              }}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 text-xl"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              {modal.mode === "edit" ? "Edit" : "Tambah"} Device
            </h3>

            <form onSubmit={doCreateOrEdit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto Perangkat</label>
                <div className="flex items-center space-x-4">
                  <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="mt-2 text-sm text-gray-500">Upload foto</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={onPickPhoto}
                      className="hidden"
                    />
                  </label>
                  
                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="preview"
                        className="h-32 w-32 object-cover rounded-lg border shadow"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : modal.data?.[PHOTO_FIELD_INTERNAL_NAME] ? (
                    <OldPhotoPreview
                      meta={modal.data[PHOTO_FIELD_INTERNAL_NAME]}
                      fields={modal.data}
                    />
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Perangkat*</label>
                  <input
                    name="Title"
                    defaultValue={modal.data?.Title || ""}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                    autoFocus
                    placeholder="Contoh: Laptop Dell XPS 13"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Perangkat</label>
                  <input
                    name="Model"
                    defaultValue={modal.data?.Model || ""}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="PERSONAL COMPUTER (PC)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="Status"
                    defaultValue={modal.data?.Status || ""}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  >
                    <option value="">Pilih Status</option>
                    {getUniqueOptions("Status").map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                    {["TERSEDIA", "DIPAKAI", "PERBAIKAN"].map((opt) => (
                      <option key={`s-${opt}`} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pabrikan</label>
                  <select
                    name="Manufacturer"
                    defaultValue={modal.data?.Manufacturer || ""}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  >
                    <option value="">Pilih Pabrikan</option>
                    {getUniqueOptions("Manufacturer").map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                    {["DELL", "HP", "LENOVO", "ASUS", "ACER", "SAMSUNG"].map((opt) => (
                      <option key={`m-${opt}`} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Serial</label>
                  <input
                    name="SerialNumber"
                    defaultValue={modal.data?.SerialNumber || ""}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Masukkan nomor serial perangkat"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Pengguna</label>
                  <input
                    name="CurrentOwnerLookupId"
                    defaultValue={
                      modal.data?.CurrentOwnerLookupId
                        ? String(modal.data.CurrentOwnerLookupId)
                        : ""
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="ID user (angka) untuk lookup"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departemen</label>
                  <select
                    name="Divisi"
                    defaultValue={modal.data?.Divisi || ""}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  >
                    <option value="">Pilih Departemen</option>
                    {getUniqueOptions("Divisi").map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center mt-6">
                  <div className="flex items-center h-5">
                    <input
                      name="AntiVirus"
                      type="checkbox"
                      defaultChecked={!!modal.data?.AntiVirus}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label className="font-medium text-gray-700">Antivirus Terpasang</label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8 justify-end">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition"
                  onClick={() => {
                    setModal({ open: false, mode: "", data: {} });
                    resetPhoto();
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-60 flex items-center"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Menyimpan...
                    </>
                  ) : modal.mode === "edit" ? "Simpan Perubahan" : "Tambah Device"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Manajemen Perangkat</h1>
              <p className="text-gray-600 mt-1">Kelola data perangkat IT perusahaan</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition flex items-center"
                onClick={() => handlePrint(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m4 4h6a2 2 0 002-2v-4a2 2 0 00-2-2h-6a2 2 0 00-2 2v4a2 2 0 002 2z" />
                </svg>
                Cetak (Filter)
              </button>

              <button
                className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition flex items-center"
                onClick={() => handlePrint(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m4 4h6a2 2 0 002-2v-4a2 2 0 00-2-2h-6a2 2 0 00-2 2v4a2 2 0 002 2z" />
                </svg>
                Cetak (Semua)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                value={filter.Status}
                onChange={(e) => setFilter((f) => ({ ...f, Status: e.target.value }))}
              >
                <option value="">Semua Status</option>
                {getUniqueOptions("Status").map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Tipe</label>
              <select
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                value={filter.Model}
                onChange={(e) => setFilter((f) => ({ ...f, Model: e.target.value }))}
              >
                <option value="">Semua Tipe</option>
                {getUniqueOptions("Model").map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Departemen</label>
              <select
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                value={filter.Divisi}
                onChange={(e) => setFilter((f) => ({ ...f, Divisi: e.target.value }))}
              >
                <option value="">Semua Departemen</option>
                {getUniqueOptions("Divisi").map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end gap-3">
              <button
                className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition flex items-center"
                onClick={fetchData}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memuat...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
              
              <button
                className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition flex items-center"
                onClick={handleTambah}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tambah Data
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {FIELDS.map((field) => (
                    <th key={field.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {field.name}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan={FIELDS.length + 1}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <div className="flex justify-center items-center">
                        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <p className="mt-2">Memuat data perangkat...</p>
                    </td>
                  </tr>
                ) : getFiltered().length === 0 ? (
                  <tr>
                    <td
                      colSpan={FIELDS.length + 1}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="mt-2 text-lg font-medium">Data tidak ditemukan</p>
                      <p className="mt-1">Coba ubah filter atau tambah data baru</p>
                    </td>
                  </tr>
                ) : (
                  getFiltered().map((item, i) => (
                    <tr
                      key={item.id || i}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedRow && selectedRow.id === item.id
                          ? "bg-blue-50"
                          : ""
                      }`}
                      onClick={() => setSelectedRow(item)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderPhoto(item.fields)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.fields?.Title ?? ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.fields?.Status === "TERSEDIA" 
                            ? "bg-green-100 text-green-800" 
                            : item.fields?.Status === "DIPAKAI"
                            ? "bg-blue-100 text-blue-800"
                            : item.fields?.Status === "PERBAIKAN"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {item.fields?.Status ?? ""}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.fields?.Model ?? ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.fields?.Manufacturer ?? ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.fields?.SerialNumber ?? ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {renderPengguna(item.fields)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.fields?.Divisi ?? ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.fields?.AntiVirus ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {selectedRow && selectedRow.id === item.id ? (
                          <div className="flex justify-end space-x-2">
                            <button
                              className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit();
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete();
                              }}
                            >
                              Hapus
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {getFiltered().length > 0 && !loading && (
            <div className="mt-4 text-sm text-gray-500">
              Menampilkan {getFiltered().length} dari {data.length} perangkat
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Preview foto lama (kalau ada metadata simpanan) */
function OldPhotoPreview({ meta, fields }) {
  try {
    let obj = meta;
    if (typeof obj === "string") obj = JSON.parse(obj);
    if (fields?.id && obj?.fileName) {
      const url = `${REST_URL}/Lists/Devices/Attachments/${fields.id}/${obj.fileName}`;
      return (
        <div className="relative">
          <img
            src={url}
            alt="current"
            className="h-32 w-32 object-cover rounded-lg border shadow"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-lg opacity-0 hover:opacity-100 transition-opacity">
            <span className="text-white text-sm font-medium">Foto Saat Ini</span>
          </div>
        </div>
      );
    }
  } catch {}
  return null;
}