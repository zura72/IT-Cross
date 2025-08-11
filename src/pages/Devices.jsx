import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";

const siteId =
  "waskitainfra.sharepoint.com,32252c41-8aed-4ed2-ba35-b6e2731b0d4a,fb2ae80c-1283-4942-a3e8-0d47e8d004fb";
const listId = "95880dbf-54dc-4bbb-a438-d6519941a409";
const REST_URL = "https://waskitainfra.sharepoint.com/sites/ITHELPDESK";
const GRAPH_SCOPE = ["Sites.ReadWrite.All"];
const SHAREPOINT_SCOPE = ["https://waskitainfra.sharepoint.com/.default"];

export default function Devices() {
  const { instance, accounts } = useMsal();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [filter, setFilter] = useState({ Status: "", Model: "", Divisi: "" });
  const [notif, setNotif] = useState("");
  const [modal, setModal] = useState({ open: false, mode: "", data: {} });

  // Field mapping utk form & table (kolom foto dilewati di form)
  const FIELDS = [
    { name: "Foto", key: "Foto_x0020_Peralang" },
    { name: "Title", key: "Title" },
    { name: "Status", key: "Status" },
    { name: "Tipe", key: "Model" },
    { name: "Pabrikan", key: "Manufacturer" },
    { name: "Nomor Serial", key: "SerialNumber" },
    { name: "Pengguna", key: "CurrentOwnerLookupId" }, // lookup -> number (User ID)
    { name: "Departemen", key: "Divisi" },
    { name: "Antivirus", key: "AntiVirus" }, // yes/no -> boolean
  ];

  useEffect(() => {
    if (accounts.length > 0) fetchData();
    // eslint-disable-next-line
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
    }
    setLoading(false);
  }

  // Ambil nama user SP untuk render "Pengguna"
  useEffect(() => {
    if (!data || data.length === 0) return;
    const ids = Array.from(
      new Set(data.map((d) => d.fields?.CurrentOwnerLookupId).filter(Boolean))
    );
    if (ids.length === 0) return;
    let isActive = true;

    async function fetchSPUsers() {
      const account = accounts[0];
      const token = await instance.acquireTokenSilent({
        scopes: SHAREPOINT_SCOPE,
        account,
      });
      const map = { ...userMap };
      for (const id of ids) {
        if (map[id]) continue;
        try {
          const res = await fetch(`${REST_URL}/_api/web/getuserbyid(${id})`, {
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
              Accept: "application/json;odata=verbose",
            },
          });
          const txt = await res.text();
          if (res.ok) {
            const user = JSON.parse(txt);
            map[id] = user?.d?.Title || user?.d?.Email || id;
          } else {
            map[id] = id;
          }
        } catch {
          map[id] = id;
        }
      }
      if (isActive) setUserMap(map);
    }

    fetchSPUsers();
    return () => {
      isActive = false;
    };
    // eslint-disable-next-line
  }, [data]);

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

  function renderPhoto(fields) {
    let url = "";
    try {
      let obj = fields?.DevicePhoto; // kalau kamu punya JSON penyimpan nama file
      if (typeof obj === "string") obj = JSON.parse(obj);
      if (fields.Attachments && obj?.fileName && fields.id) {
        url = `${REST_URL}/Lists/Devices/Attachments/${fields.id}/${obj.fileName}`;
      }
    } catch {
      url = "";
    }
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

  // -------------- CRUD --------------

  function handleTambah() {
    setModal({ open: true, mode: "create", data: {} });
  }
  function handleEdit() {
    if (!selectedRow) return;
    setModal({ open: true, mode: "edit", data: selectedRow.fields || {} });
  }
  async function handleDelete() {
    if (!selectedRow) return;
    if (
      !window.confirm(`Yakin hapus device "${selectedRow.fields?.Title}"?`)
    )
      return;
    setLoading(true);
    try {
      const account = accounts[0];
      const token = await instance.acquireTokenSilent({
        scopes: GRAPH_SCOPE,
        account,
      });
      await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${selectedRow.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token.accessToken}` } }
      );
      setNotif("Data berhasil dihapus!");
      fetchData();
    } catch (e) {
      setNotif("Gagal menghapus data: " + e.message);
    }
    setLoading(false);
  }

  /**
   * Bersihkan & susun payload fields agar PATCH/POST tidak 400:
   * - hapus field kosong ""
   * - konversi checkbox ke boolean
   * - konversi lookup ke integer (tetap pakai nilai lama kalau input kosong)
   */
  function buildPatchFields(formData, oldFields) {
    const raw = Object.fromEntries(formData.entries());
    const fields = { ...oldFields }; // mulai dari nilai lama, supaya tidak mengosongkan choice/lookup tanpa sengaja

    // override dari form
    for (const [k, v] of Object.entries(raw)) {
      fields[k] = v;
    }

    // normalisasi
    // AntiVirus => boolean
    if ("AntiVirus" in raw) {
      fields.AntiVirus =
        raw.AntiVirus === "on" || raw.AntiVirus === "true" || raw.AntiVirus === true;
    }

    // Lookup => integer; kalau input kosong, kembalikan ke nilai lama (biar gak kirim "")
    if ("CurrentOwnerLookupId" in raw) {
      const val = String(raw.CurrentOwnerLookupId || "").trim();
      if (val === "") {
        // biarkan nilai lama (jangan kirim string kosong)
        fields.CurrentOwnerLookupId = oldFields?.CurrentOwnerLookupId ?? undefined;
        if (fields.CurrentOwnerLookupId === undefined)
          delete fields.CurrentOwnerLookupId;
      } else {
        const n = parseInt(val, 10);
        if (!Number.isNaN(n)) fields.CurrentOwnerLookupId = n;
        else delete fields.CurrentOwnerLookupId; // hindari kirim string invalid
      }
    }

    // hapus field yang benar-benar kosong "" (terutama choice) supaya Graph tidak error
    for (const k of Object.keys(fields)) {
      if (fields[k] === "") delete fields[k];
    }

    // pastikan tidak mengirim kolom foto/attachment via fields
    delete fields.Foto_x0020_Peralang;
    delete fields.DevicePhoto;

    return fields;
  }

  async function doCreateOrEdit(e) {
  e.preventDefault();
  setLoading(true);

  const formData = new FormData(e.target);
  const fields = Object.fromEntries(formData.entries());
  if ("AntiVirus" in fields) fields.AntiVirus = !!fields.AntiVirus;

  try {
    const account = accounts[0];
    // pastikan token ReadWrite; kalau silent gagal, popup
    const token = await (async () => {
      try {
        return await instance.acquireTokenSilent({ scopes: GRAPH_SCOPE, account });
      } catch {
        return await instance.acquireTokenPopup({ scopes: GRAPH_SCOPE, account });
      }
    })();

    if (modal.mode === "create") {
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fields }),
        }
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Create failed ${res.status}: ${txt}`);
      }
      setNotif("Data berhasil ditambahkan!");
    } else if (modal.mode === "edit" && selectedRow) {
      // PATCH ke /fields dengan body = fields langsung
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${selectedRow.id}/fields`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "Content-Type": "application/json",
            "If-Match": "*", // toleran terhadap ETag
          },
          body: JSON.stringify(fields),
        }
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Edit failed ${res.status}: ${txt}`);
      }
      setNotif("Data berhasil diedit!");
    }

    setModal({ open: false, mode: "", data: {} });
    fetchData();
  } catch (err) {
    console.error(err);
    setNotif("Gagal simpan: " + err.message);
  } finally {
    setLoading(false);
  }
}


  // -------------- UI --------------

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
      {/* Notif */}
      {notif && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded shadow-md font-bold animate-fade-in-down"
          onClick={() => setNotif("")}
        >
          {notif}
        </div>
      )}

      {/* Modal Form */}
      {modal.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-xl p-7 min-w-[400px] max-w-lg w-full shadow-xl relative">
            <button
              onClick={() => setModal({ open: false, mode: "", data: {} })}
              className="absolute right-3 top-2 text-2xl font-bold text-gray-400 hover:text-black"
              type="button"
            >
              ×
            </button>
            <h3 className="font-bold text-xl mb-4">
              {modal.mode === "edit" ? "Edit" : "Tambah"} Device
            </h3>

            <form onSubmit={doCreateOrEdit}>
              {FIELDS.filter((f) => f.key !== "Foto_x0020_Peralang").map((f) => (
                <div key={f.key} className="mb-4">
                  <label className="block text-sm font-semibold mb-1">
                    {f.name}
                  </label>

                  {/* Dropdown untuk kolom Choice */}
                  {["Status", "Manufacturer", "Divisi"].includes(f.key) ? (
                    <select
                      name={f.key}
                      defaultValue={modal.data[f.key] || ""}
                      className="border rounded w-full px-3 py-2"
                      required={f.key === "Title"}
                    >
                      <option value="">Pilih {f.name}</option>
                      {getUniqueOptions(f.key).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : f.key === "AntiVirus" ? (
                    <input
                      name={f.key}
                      type="checkbox"
                      className="h-5 w-5"
                      defaultChecked={modal.data[f.key] || false}
                    />
                  ) : (
                    <input
                      name={f.key}
                      defaultValue={modal.data[f.key] || ""}
                      className="border rounded w-full px-3 py-2"
                      required={f.key === "Title"}
                      autoFocus={f.key === "Title"}
                      placeholder={
                        f.key === "CurrentOwnerLookupId"
                          ? "ID user (angka) untuk lookup"
                          : undefined
                      }
                    />
                  )}
                </div>
              ))}

              <div className="flex gap-2 mt-6 justify-end">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-200"
                  onClick={() => setModal({ open: false, mode: "", data: {} })}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-blue-600 text-white font-bold"
                  disabled={loading}
                >
                  {modal.mode === "edit" ? "Simpan" : "Tambah"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="bg-white/95 dark:bg-gray-800/90 rounded-2xl p-10 w-full max-w-[95vw] shadow-xl mt-8">
          <div className="flex flex-wrap justify-between items-center mb-5 gap-2">
            <h2 className="text-3xl font-bold mb-2 text-[#215ba6] dark:text-white">
              Devices
            </h2>
            <div className="flex gap-2">
              <button
                className={`px-5 py-2 rounded ${
                  selectedRow
                    ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                disabled={!selectedRow}
                onClick={handleEdit}
              >
                Edit
              </button>
              <button
                className={`px-5 py-2 rounded ${
                  selectedRow
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                disabled={!selectedRow}
                onClick={handleDelete}
              >
                Hapus
              </button>
              <button
                className="px-5 py-2 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
                onClick={handleTambah}
              >
                + Tambah Data
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center mb-6 gap-3">
            <select
              className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white"
              value={filter.Status}
              onChange={(e) =>
                setFilter((f) => ({ ...f, Status: e.target.value }))
              }
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
              onChange={(e) =>
                setFilter((f) => ({ ...f, Model: e.target.value }))
              }
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
              onChange={(e) =>
                setFilter((f) => ({ ...f, Divisi: e.target.value }))
              }
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
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={FIELDS.length}
                      className="px-5 py-10 text-center text-gray-400"
                    >
                      Loading data...
                    </td>
                  </tr>
                ) : getFiltered().length === 0 ? (
                  <tr>
                    <td
                      colSpan={FIELDS.length}
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
