import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";

const siteId = "waskitainfra.sharepoint.com,32252c41-8aed-4ed2-ba35-b6e2731b0d4a,fb2ae80c-1283-4942-a3e8-0d47e8d004fb";
const listId = "95880dbf-54dc-4bbb-a438-d6519941a409";
const GRAPH_SCOPE = ["Sites.Read.All"];

export default function Devices() {
  const { instance, accounts } = useMsal();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // FILTER STATES
  const [filter, setFilter] = useState({
    Status: "",
    Model: "",
    Divisi: "",
  });

  const FIELDS = [
    { name: "Foto", key: "Foto_x0020_Peralang" },
    { name: "Title", key: "Title" },
    { name: "Status", key: "Status" },
    { name: "Tipe", key: "Model" },
    { name: "Pabrikan", key: "Manufacturer" },
    { name: "Nomor Serial", key: "SerialNumber" },
    { name: "Pengguna", key: "Pengguna_x0020_saat_x0020_ini" },
    { name: "Departemen", key: "Divisi" },
    { name: "Antivirus", key: "AntiVirus" }
  ];

  // Auto-fetch data setelah login atau buka halaman
  useEffect(() => {
    if (accounts.length > 0) fetchData();
    // eslint-disable-next-line
  }, [accounts.length]);

  async function fetchData() {
    setLoading(true);
    try {
      const account = accounts[0];
      const token = await instance.acquireTokenSilent({ scopes: GRAPH_SCOPE, account });
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields`,
        { headers: { Authorization: `Bearer ${token.accessToken}` } }
      );
      const json = await res.json();
      setData(json.value);
    } catch (err) {
      alert("Gagal mengambil data: " + err.message);
    }
    setLoading(false);
  }

  function getUniqueOptions(fieldKey) {
    const opts = new Set();
    data.forEach(item => {
      const val = item.fields?.[fieldKey];
      if (val) opts.add(val);
    });
    return Array.from(opts).sort();
  }

  function getFiltered() {
    return data.filter(item => {
      if (filter.Status && item.fields?.Status !== filter.Status) return false;
      if (filter.Model && item.fields?.Model !== filter.Model) return false;
      if (filter.Divisi && item.fields?.Divisi !== filter.Divisi) return false;
      return true;
    });
  }

  function renderPhoto(fields) {
    let url = "";
    if (fields?.Foto_x0020_Peralang) {
      try {
        const obj = JSON.parse(fields.Foto_x0020_Peralang);
        if (obj.serverRelativeUrl) url = "https://waskitainfra.sharepoint.com" + obj.serverRelativeUrl;
      } catch (e) {
        url = "";
      }
    }
    return (
      <div className="w-12 h-12 rounded bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
        {url
          ? <img src={url} alt="Device" className="w-full h-full object-cover" />
          : <span className="text-gray-400">—</span>
        }
      </div>
    );
  }

  function renderPengguna(fields) {
    const user = fields?.Pengguna_x0020_saat_x0020_ini;
    if (!user) return "";
    if (typeof user === "object" && user.title) return user.title;
    return user;
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center py-8">
      {/* --- BACKGROUND FULLSCREEN --- */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: `
            linear-gradient(rgba(251, 250, 252, 0.34),rgba(45,30,90,0.22)),
            url('/device-bg.jpg') center center / cover no-repeat
          `
        }}
      />
      {/* --- CONTENT --- */}
      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-8 w-full max-w-6xl shadow-xl mt-8">
          <h2 className="text-2xl font-bold mb-2 text-[#215ba6] dark:text-white">Devices</h2>
          <div className="mb-2 text-gray-700 dark:text-gray-200">
            Daftar seluruh perangkat utama (PC, laptop, server, dsb) di perusahaan.
          </div>
          <div className="flex flex-wrap items-center mb-4 gap-3">
            {/* Dropdown Filter Status */}
            <select
              className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white"
              value={filter.Status}
              onChange={e => setFilter(f => ({ ...f, Status: e.target.value }))}
            >
              <option value="">All Status</option>
              {getUniqueOptions("Status").map(opt =>
                <option key={opt} value={opt}>{opt}</option>
              )}
            </select>
            {/* Dropdown Filter Tipe */}
            <select
              className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white"
              value={filter.Model}
              onChange={e => setFilter(f => ({ ...f, Model: e.target.value }))}
            >
              <option value="">All Tipe</option>
              {getUniqueOptions("Model").map(opt =>
                <option key={opt} value={opt}>{opt}</option>
              )}
            </select>
            {/* Dropdown Filter Departemen */}
            <select
              className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white"
              value={filter.Divisi}
              onChange={e => setFilter(f => ({ ...f, Divisi: e.target.value }))}
            >
              <option value="">All Departemen</option>
              {getUniqueOptions("Divisi").map(opt =>
                <option key={opt} value={opt}>{opt}</option>
              )}
            </select>
            {/* Optional: Refresh manual */}
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              onClick={fetchData}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
          <div className="overflow-x-auto bg-white/80 dark:bg-gray-900/80 rounded-xl shadow">
            <table className="min-w-full text-base">
              <thead>
                <tr className="bg-blue-50 dark:bg-gray-800 text-[#215ba6] dark:text-white">
                  {FIELDS.map(field => (
                    <th key={field.key} className="px-4 py-3 text-left">{field.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={FIELDS.length} className="px-4 py-8 text-center text-gray-400">
                      Loading data...
                    </td>
                  </tr>
                ) : getFiltered().length === 0 ? (
                  <tr>
                    <td colSpan={FIELDS.length} className="px-4 py-8 text-center text-gray-400">
                      Data tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  getFiltered().map((item, i) => (
                    <tr key={item.id || i} className={i % 2 === 1 ? "bg-blue-50/60 dark:bg-gray-800/60" : ""}>
                      <td className="px-4 py-2 text-gray-800 dark:text-gray-100">{renderPhoto(item.fields)}</td>
                      <td className="px-4 py-2 text-gray-800 dark:text-gray-100">{item.fields?.Title ?? ""}</td>
                      <td className="px-4 py-2 text-gray-800 dark:text-gray-100">{item.fields?.Status ?? ""}</td>
                      <td className="px-4 py-2 text-gray-800 dark:text-gray-100">{item.fields?.Model ?? ""}</td>
                      <td className="px-4 py-2 text-gray-800 dark:text-gray-100">{item.fields?.Manufacturer ?? ""}</td>
                      <td className="px-4 py-2 text-gray-800 dark:text-gray-100">{item.fields?.SerialNumber ?? ""}</td>
                      <td className="px-4 py-2 text-gray-800 dark:text-gray-100">{renderPengguna(item.fields)}</td>
                      <td className="px-4 py-2 text-gray-800 dark:text-gray-100">{item.fields?.Divisi ?? ""}</td>
                      <td className="px-4 py-2 text-gray-800 dark:text-gray-100">
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
