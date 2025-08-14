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

  // ====== PRINT HELPERS (tanpa popup) ======
  function getPhotoUrlFromFields(fields) {
    try {
      const PHOTO_FIELD_INTERNAL_NAME = "DevicePhoto";
      let obj = fields?.[PHOTO_FIELD_INTERNAL_NAME];
      if (typeof obj === "string") obj = JSON.parse(obj);
      if (fields?.Attachments && obj?.fileName && fields?.id) {
        return `${REST_URL}/Lists/Devices/Attachments/${fields.id}/${obj.fileName}`;
      }
    } catch {}
    return "";
  }

  function buildPrintHTML(rows, userMap) {
    const now = new Date().toLocaleString();
    const head = `
      <meta charset="utf-8" />
      <title>Devices - Print</title>
      <style>
        /* Kertas & margin */
        @page { size: A4 landscape; margin: 12mm; }
        html, body { color:#000; font: 12px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        h2 { margin: 0 0 6px 0; }
        .meta { font-size: 12px; color:#6b7280; margin-bottom: 12px; }

        /* Tabel dan border tebal */
        table { width: 100%; border-collapse: collapse; font-size: 12px; border: 1.5pt solid #000; }
        thead th { background: #f3f4f6; text-align: left; border: 1.2pt solid #000; }
        th, td { padding: 8px 10px; vertical-align: top; }
        tbody td { border: 0.9pt solid #000; }
        tr { page-break-inside: avoid; }
        thead { display: table-header-group; }
        tfoot { display: table-row-group; }

        /* Foto */
        td img { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; display:block; border: 0.9pt solid #000; }
        .center { text-align:center; }
      </style>
    `;

    const bodyRows = rows
      .map((item) => {
        const f = item.fields || {};
        const photo = getPhotoUrlFromFields({ ...f, id: item.id });
        const pengguna = f.CurrentOwnerLookupId ? (userMap[f.CurrentOwnerLookupId] || f.CurrentOwnerLookupId) : "";
        const av = f.AntiVirus ? "✔" : "";
        return `
          <tr>
            <td class="center">${photo ? `<img src="${photo}" />` : "—"}</td>
            <td>${f.Title ?? ""}</td>
            <td>${f.Status ?? ""}</td>
            <td>${f.Model ?? ""}</td>
            <td>${f.Manufacturer ?? ""}</td>
            <td>${f.SerialNumber ?? ""}</td>
            <td>${pengguna}</td>
            <td>${f.Divisi ?? ""}</td>
            <td class="center">${av}</td>
          </tr>
        `;
      })
      .join("");

    return `<!doctype html>
      <html>
        <head>${head}</head>
        <body>
          <h2>Devices</h2>
          <div class="meta">Dicetak: ${now}</div>
          <table>
            <thead>
              <tr>
                <th>Foto</th>
                <th>Title</th>
                <th>Status</th>
                <th>Tipe</th>
                <th>Pabrikan</th>
                <th>Nomor Serial</th>
                <th>Pengguna</th>
                <th>Departemen</th>
                <th>Antivirus</th>
              </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>`;
  }

  async function printViaHiddenIframe(html) {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // tunggu gambar supaya ikut tercetak
    const imgs = iframe.contentDocument.images;
    const waits = Array.from(imgs).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((res) => {
            img.onload = img.onerror = res;
          })
    );
    await Promise.all(waits);

    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    setTimeout(() => document.body.removeChild(iframe), 1000);
  }

  // tombol: cetak sesuai filter aktif
  async function handlePrintFiltered() {
    const rows = getFiltered(); // fungsi kamu yang sudah ada
    const html = buildPrintHTML(rows, userMap);
    await printViaHiddenIframe(html);
  }

  // tombol: cetak semua data (abaikan filter)
  async function handlePrintAll() {
    const rows = data || [];
    const html = buildPrintHTML(rows, userMap);
    await printViaHiddenIframe(html);
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

  // ==== CETAK: via hidden iframe (no popup) ====
  const PRINT_CSS = `
    * { box-sizing: border-box; }
    body { font: 12px/1.45 'Inter', Arial, sans-serif; color: #111; margin: 24px; }
    h1 { margin: 0 0 4px; font-size: 20px; }
    .meta { color:#555; margin: 0 0 14px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; border: 1.5pt solid #000; }
    th, td { border: 0.9pt solid #000; padding: 6px 8px; vertical-align: top; }
    thead th { background: #eef4ff; text-align: left; border: 1.2pt solid #000; }
    tbody tr:nth-child(even) { background: #fbfdff; }
    .img { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border:0.9pt solid #000; }
    .check { font-size: 16px; }
    @page { margin: 16mm; }
  `;

  // Ambil URL foto dari fields (sama logika dengan renderPhoto)
  function getPhotoUrl(fields) {
    try {
      let obj = fields?.[PHOTO_FIELD_INTERNAL_NAME];
      if (typeof obj === "string") obj = JSON.parse(obj);
      if (fields.Attachments && obj?.fileName && fields.id) {
        return `${REST_URL}/Lists/Devices/Attachments/${fields.id}/${obj.fileName}`;
      }
    } catch {}
    return "";
  }

  // Buat HTML <table> dari array item
  function buildTableHTML(items) {
    const head = `
      <thead>
        <tr>
          ${FIELDS.map((f) => `<th>${f.name}</th>`).join("")}
        </tr>
      </thead>
    `;

    const bodyRows = items
      .map((it) => {
        const f = it.fields || {};
        const tds = FIELDS.map((col) => {
          switch (col.key) {
            case "Foto_x0020_Peralang": {
              const url = getPhotoUrl(f);
              return `<td>${url ? `<img class=\"img\" src=\"${url}\"/>` : ""}</td>`;
            }
            case "CurrentOwnerLookupId": {
              const v = f.CurrentOwnerLookupId ? (userMap[f.CurrentOwnerLookupId] || f.CurrentOwnerLookupId) : "";
              return `<td>${String(v ?? "")}</td>`;
            }
            case "AntiVirus": {
              return `<td>${f.AntiVirus ? `<span class=\"check\">✔️</span>` : ""}</td>`;
            }
            default: {
              const v = f[col.key];
              return `<td>${v != null ? String(v) : ""}</td>`;
            }
          }
        }).join("");
        return `<tr>${tds}</tr>`;
      })
      .join("");

    return `<table>${head}<tbody>${bodyRows}</tbody></table>`;
  }

  // Cetak: items = getFiltered() (untuk Print Filter) atau data (untuk Print Semua)
  function printViaIframe(items, title = "Devices") {
    const now = new Date();
    const htmlDoc = `
      <!doctype html>
      <html>
        <head>
          <meta charset=\"utf-8\"/>
          <title>${title}</title>
          <style>${PRINT_CSS}</style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class=\"meta\">\n            Total baris: ${items.length} &middot; Dicetak: ${now.toLocaleString()}\n          </div>
          ${buildTableHTML(items)}
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlDoc);
    doc.close();

    // Tunggu render, lalu print & cleanup
    iframe.onload = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        setTimeout(() => document.body.removeChild(iframe), 1200);
      }
    };
  }

  // Handler tombol
  function handlePrintFiltered() {
    printViaIframe(getFiltered(), "Devices (Sesuai Filter)");
  }
  function handlePrintAll() {
    printViaIframe(
      // urutkan sama seperti tampilan (opsional)
      data.slice(),
      "Devices (Semua Data)"
    );
  }

  // ==== QUICK PRINT: cetak DOM yang sudah ada (tanpa popup/iframe) ====
  const INLINE_PRINT_CSS = `
    @media print {
      body { background: white !important; }
      /* Sembunyikan SEMUA, lalu tampilkan hanya area yang mau dicetak */
      body * { visibility: hidden !important; }
      #print-area, #print-area * { visibility: visible !important; }
      #print-area { position: absolute; left: 0; top: 0; width: 100vw; }
      /* Hapus elemen yang tidak perlu di print */
      #print-area .no-print { display: none !important; }
      #print-area table { width: 100%; border-collapse: collapse; border: 1.5pt solid #000; }
      #print-area th, #print-area td { border: 0.9pt solid #000; padding: 6px 8px; }
      #print-area thead th { background: #eef4ff; text-align: left; border: 1.2pt solid #000; }
    }
  `;

  // inject CSS print hanya sekali
  let injectedInlineCss = false;
  function ensureInlinePrintCss() {
    if (injectedInlineCss) return;
    const style = document.createElement("style");
    style.textContent = INLINE_PRINT_CSS;
    document.head.appendChild(style);
    injectedInlineCss = true;
  }

  // Print CEPAT untuk tampilan yang sedang difilter (pakai tabel yang sudah nampak)
  function handlePrintFiltered() {
    ensureInlinePrintCss();
    // pastikan layout settle dulu
    requestAnimationFrame(() => window.print());
  }

  /* ==== QUICK PRINT ALL (tanpa foto, super cepat) ==== */
  const PAGE_HIDE_TO_PRINT_TEMP = `
    @media print {
      body * { visibility: hidden !important; }
      #print-temp, #print-temp * { visibility: visible !important; }
      #print-temp { position: absolute; left: 0; top: 0; width: 100%; }
      #print-temp table { width: 100%; border-collapse: collapse; border: 1.5pt solid #000; }
      #print-temp th, #print-temp td { border: 0.9pt solid #000; padding: 6px 8px; }
      #print-temp thead th { background: #eef4ff; text-align: left; border: 1.2pt solid #000; }
    }
  `;

  // Bangun tabel HTML cepat TANPA foto (lebih ngebut)
  function buildTableHTMLNoPhoto(items) {
    const cols = FIELDS.filter((c) => c.key !== "Foto_x0020_Peralang");
    const head = `<thead><tr>${cols.map((c) => `<th>${c.name}</th>`).join("")}</tr></thead>`;
    const body = items
      .map((it) => {
        const f = it.fields || {};
        const tds = cols
          .map((col) => {
            if (col.key === "CurrentOwnerLookupId") {
              const v = f.CurrentOwnerLookupId ? (userMap[f.CurrentOwnerLookupId] || f.CurrentOwnerLookupId) : "";
              return `<td>${String(v ?? "")}</td>`;
            }
            if (col.key === "AntiVirus") {
              return `<td>${f.AntiVirus ? "✔️" : ""}</td>`;
            }
            return `<td>${f[col.key] != null ? String(f[col.key]) : ""}</td>`;
          })
          .join("");
        return `<tr>${tds}</tr>`;
      })
      .join("");
    return `<table>${head}<tbody>${body}</tbody></table>`;
  }

  function handlePrintAllFast() {
    // buat container sementara di halaman yg sama (no popup)
    const div = document.createElement("div");
    div.id = "print-temp";
    div.style.position = "fixed";
    div.style.left = "-10000px"; // sembunyikan di layar
    const html = `
      <style>${PAGE_HIDE_TO_PRINT_TEMP}</style>
      <h1>Devices (Semua Data)</h1>
      <div style="margin:6px 0 12px;color:#555;font-size:12px">
        Total baris: ${data.length} &middot; Dicetak: ${new Date().toLocaleString()}
      </div>
      ${buildTableHTMLNoPhoto(data)}
    `;
    div.innerHTML = html;
    document.body.appendChild(div);

    // cetak & bersihkan
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => div.remove(), 800);
    });
  }

  /** ====== UI ====== */
  return (
    <div className="relative min-h-screen flex flex-col items-center py-8 bg-gray-50 dark:bg-gray-900">
      <div
        className="fixed inset-0 z-0"
        style={{
          background: `
            linear-gradient(rgba(251, 250, 252, 0.25),rgba(45,30,90,0.14)),
            url('/device-bg.jpg') center center / cover no-repeat
          `,
        }}
      />

      {notif && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded shadow-md font-bold"
          onClick={() => setNotif("")}
        >
          {notif}
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-7 w-[92vw] max-w-2xl shadow-2xl relative">
            <button
              onClick={() => {
                setModal({ open: false, mode: "", data: {} });
                resetPhoto();
              }}
              className="absolute right-3 top-2 text-2xl font-bold text-gray-400 hover:text-black"
              type="button"
            >
              ×
            </button>

            <h3 className="font-bold text-xl mb-5">
              {modal.mode === "edit" ? "Edit" : "Tambah"} Device
            </h3>

            <form onSubmit={doCreateOrEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Foto</label>
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
                    <img
                      src={photoPreview}
                      alt="preview"
                      className="h-20 w-20 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="text-red-600 hover:underline"
                    >
                      Hapus foto
                    </button>
                  </div>
                ) : modal.data?.[PHOTO_FIELD_INTERNAL_NAME] ? (
                  <OldPhotoPreview
                    meta={modal.data[PHOTO_FIELD_INTERNAL_NAME]}
                    fields={modal.data}
                  />
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Title</label>
                  <input
                    name="Title"
                    defaultValue={modal.data?.Title || ""}
                    className="border rounded w-full px-3 py-2"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Tipe</label>
                  <input
                    name="Model"
                    defaultValue={modal.data?.Model || ""}
                    className="border rounded w-full px-3 py-2"
                    placeholder="PERSONAL COMPUTER (PC)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Status</label>
                  <select
                    name="Status"
                    defaultValue={modal.data?.Status || ""}
                    className="border rounded w-full px-3 py-2"
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
                  <label className="block text-sm font-semibold mb-1">Pabrikan</label>
                  <select
                    name="Manufacturer"
                    defaultValue={modal.data?.Manufacturer || ""}
                    className="border rounded w-full px-3 py-2"
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
                  <label className="block text-sm font-semibold mb-1">Nomor Serial</label>
                  <input
                    name="SerialNumber"
                    defaultValue={modal.data?.SerialNumber || ""}
                    className="border rounded w-full px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Pengguna</label>
                  <input
                    name="CurrentOwnerLookupId"
                    defaultValue={
                      modal.data?.CurrentOwnerLookupId
                        ? String(modal.data.CurrentOwnerLookupId)
                        : ""
                    }
                    className="border rounded w-full px-3 py-2"
                    placeholder="ID user (angka) untuk lookup"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Departemen</label>
                  <select
                    name="Divisi"
                    defaultValue={modal.data?.Divisi || ""}
                    className="border rounded w-full px-3 py-2"
                  >
                    <option value="">Pilih Departemen</option>
                    {getUniqueOptions("Divisi").map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 mt-6 sm:mt-0">
                  <input
                    name="AntiVirus"
                    type="checkbox"
                    defaultChecked={!!modal.data?.AntiVirus}
                    className="h-5 w-5"
                  />
                  <label className="text-sm font-semibold">Antivirus</label>
                </div>
              </div>

              <div className="flex gap-2 mt-6 justify-end">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-200"
                  onClick={() => {
                    setModal({ open: false, mode: "", data: {} });
                    resetPhoto();
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-blue-600 text-white font-bold disabled:opacity-60"
                  disabled={loading}
                >
                  {modal.mode === "edit" ? "Simpan" : "Tambah"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="bg-white/95 dark:bg-gray-800/90 rounded-2xl p-10 w-full max-w-[95vw] shadow-xl mt-8">
          <div className="flex flex-wrap justify-between items-center mb-5 gap-2">
            <h2 className="text-3xl font-bold mb-2 text-[#215ba6] dark:text-white">
              Devices
            </h2>

            {/* Tombol Print */}
            <div className="flex flex-wrap items-center mb-6 gap-3">
              {/* ... select2 & Refresh & Tambah ... */}

              <button
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
                onClick={handlePrintFiltered}
              >
                Print (Filter)
              </button>

              <button
                className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handlePrintAll}
              >
                Print (Semua)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center mb-6 gap-3">
            <select
              className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white"
              value={filter.Status}
              onChange={(e) => setFilter((f) => ({ ...f, Status: e.target.value }))}
            >
              <option value="">All Status</option>
              {getUniqueOptions("Status").map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white"
              value={filter.Model}
              onChange={(e) => setFilter((f) => ({ ...f, Model: e.target.value }))}
            >
              <option value="">All Tipe</option>
              {getUniqueOptions("Model").map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white"
              value={filter.Divisi}
              onChange={(e) => setFilter((f) => ({ ...f, Divisi: e.target.value }))}
            >
              <option value="">All Departemen</option>
              {getUniqueOptions("Divisi").map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              onClick={fetchData}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              className="px-5 py-2 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
              onClick={handleTambah}
            >
              + Tambah Data
            </button>
          </div>

          <div className="overflow-x-auto bg-white/95 dark:bg-gray-900/90 rounded-xl shadow min-h-[350px]">
            <table className="min-w-full w-full text-base table-auto">
              <thead>
                <tr className="bg-blue-50 dark:bg-gray-800 text-[#215ba6] dark:text-white text-lg">
                  {FIELDS.map((field) => (
                    <th key={field.key} className="px-5 py-4 text-left">
                      {field.name}
                    </th>
                  ))}
                  <th className="px-5 py-4 text-left sm:text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={FIELDS.length + 1}
                      className="px-5 py-10 text-center text-gray-400"
                    >
                      Loading data...
                    </td>
                  </tr>
                ) : getFiltered().length === 0 ? (
                  <tr>
                    <td
                      colSpan={FIELDS.length + 1}
                      className="px-5 py-10 text-center text-gray-400"
                    >
                      Data tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  getFiltered().map((item, i) => (
                    <tr
                      key={item.id || i}
                      className={`cursor-pointer ${
                        selectedRow && selectedRow.id === item.id
                          ? "bg-purple-200 font-bold"
                          : i % 2 === 1
                          ? "bg-blue-50/60 dark:bg-gray-800/60"
                          : ""
                      }`}
                      onClick={() => setSelectedRow(item)}
                    >
                      <td className="px-5 py-3 text-gray-800 dark:text-gray-100">
                        {renderPhoto(item.fields)}
                      </td>
                      <td className="px-5 py-3 text-gray-800 dark:text-gray-100">
                        {item.fields?.Title ?? ""}
                      </td>
                      <td className="px-5 py-3 text-gray-800 dark:text-gray-100">
                        {item.fields?.Status ?? ""}
                      </td>
                      <td className="px-5 py-3 text-gray-800 dark:text-gray-100">
                        {item.fields?.Model ?? ""}
                      </td>
                      <td className="px-5 py-3 text-gray-800 dark:text-gray-100">
                        {item.fields?.Manufacturer ?? ""}
                      </td>
                      <td className="px-5 py-3 text-gray-800 dark:text-gray-100">
                        {item.fields?.SerialNumber ?? ""}
                      </td>
                      <td className="px-5 py-3 text-gray-800 dark:text-gray-100">
                        {renderPengguna(item.fields)}
                      </td>
                      <td className="px-5 py-3 text-gray-800 dark:text-gray-100">
                        {item.fields?.Divisi ?? ""}
                      </td>
                      <td className="px-5 py-3 text-gray-800 dark:text-gray-100">
                        {item.fields?.AntiVirus ? <span className="text-xl">✔️</span> : ""}
                      </td>
                      <td className="px-5 py-3">
                        {selectedRow && selectedRow.id === item.id ? (
                          <div className="flex gap-2 justify-start sm:justify-end">
                            <button
                              className="px-4 py-1.5 rounded bg-yellow-500 hover:bg-yellow-600 text-black"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit();
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white"
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
        <div className="mt-3">
          <img
            src={url}
            alt="current"
            className="h-20 w-20 object-cover rounded-lg border"
          />
        </div>
      );
    }
  } catch {}
  return null;
}
