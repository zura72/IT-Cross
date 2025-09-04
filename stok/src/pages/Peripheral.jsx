import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";

const GRAPH_SCOPE = ["Sites.ReadWrite.All"];
const siteId = "waskitainfra-my.sharepoint.com,81711596-bf57-403c-8ef6-1cb25a538e52,43f60d09-3f38-4874-bf00-352549188508";
const listId = "467d78c3-7a1d-486f-8743-4a93c6b9ec91";
const ITEM_TYPE_OPTIONS = [
  "Input Device", "Kabel", "Media Penyimpanan",
  "Audio", "Jaringan", "Operating System", "Hub/Expander", "Item"
];

export default function Peripheral() {
  const { instance, accounts } = useMsal();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal & form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formFields, setFormFields] = useState({
    Nomor: "",
    Title: "",
    Quantity: "",
    Tipe: "",
  });

  // Auto fetch data setelah login
  useEffect(() => {
    if (accounts.length > 0) fetchData();
    // eslint-disable-next-line
  }, [accounts.length]);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const account = accounts[0];
      if (!account) {
        setLoading(false);
        return;
      }
      const token = await instance.acquireTokenSilent({
        scopes: GRAPH_SCOPE,
        account,
      });
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields`,
        { headers: { Authorization: `Bearer ${token.accessToken}` } }
      );
      if (!res.ok) throw new Error("Gagal fetch data");
      const json = await res.json();
      setData(json.value);
    } catch (err) {
      alert("Gagal mengambil data: " + err.message);
    }
    setLoading(false);
  };

  // Create
  const createItem = async () => {
    try {
      const account = accounts[0];
      const token = await instance.acquireTokenSilent({
        scopes: GRAPH_SCOPE,
        account,
      });

      // Cari nomor terakhir
      let lastNo = 0;
      data.forEach(d => {
        if (d.fields.Nomor && d.fields.Nomor > lastNo) lastNo = d.fields.Nomor;
      });

      const body = {
        fields: {
          Nomor: lastNo + 1,
          Title: formFields.Title,
          Quantity: parseInt(formFields.Quantity) || 0,
          Tipe: formFields.Tipe,
        },
      };

      const res = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        throw new Error("Gagal menambah data: " + errText);
      }
      alert("Data berhasil ditambahkan");
      setModalOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal menambah data: " + err.message);
    }
  };

  // Update
  const updateItem = async () => {
    try {
      const account = accounts[0];
      const token = await instance.acquireTokenSilent({
        scopes: GRAPH_SCOPE,
        account,
      });
      const body = {
        Title: formFields.Title,
        Quantity: parseInt(formFields.Quantity) || 0,
        Tipe: formFields.Tipe,
      };

      const res = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${editingItem.id}/fields`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        throw new Error("Gagal update data: " + errText);
      }
      alert("Data berhasil diupdate");
      setModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err) {
      alert("Gagal update data: " + err.message);
    }
  };

  // Delete
  const deleteItem = async (item) => {
    if (!window.confirm(`Hapus item "${item.fields.Title}"?`)) return;
    try {
      const account = accounts[0];
      const token = await instance.acquireTokenSilent({
        scopes: GRAPH_SCOPE,
        account,
      });
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${item.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token.accessToken}` },
        }
      );
      if (res.status !== 204) throw new Error("Gagal hapus data");
      alert("Data berhasil dihapus");
      fetchData();
    } catch (err) {
      alert("Gagal hapus data: " + err.message);
    }
  };

  // Modal & Form Handler
  const openAddModal = () => {
    setEditingItem(null);
    setFormFields({
      Nomor: "",
      Title: "",
      Quantity: "",
      Tipe: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormFields({
      Nomor: item.fields.Nomor,
      Title: item.fields.Title || "",
      Quantity: item.fields.Quantity ?? "",
      Tipe: item.fields.Tipe || "",
    });
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormFields((prev) => ({ ...prev, [name]: value }));
  };

  const submitForm = (e) => {
    e.preventDefault();
    if (editingItem) updateItem();
    else createItem();
  };

  // Sorting data by Nomor
  const sortedData = [...data].sort((a, b) => (a.fields.Nomor ?? 0) - (b.fields.Nomor ?? 0));

  // UI
  return (
    <div className="relative min-h-screen flex flex-col items-center py-12">
      {/* --- BACKGROUND FULLSCREEN --- */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: `
            linear-gradient(rgba(249, 248, 250, 0.34),rgba(45,30,90,0.22)),
            url('/peripheral-bg.jpg') center center / cover no-repeat
          `
        }}
      />
      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="bg-white/90 dark:bg-gray-900/90 shadow-2xl rounded-3xl w-full max-w-5xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-[#215ba6] dark:text-white">Peripheral</h2>
            <div className="text-gray-600 dark:text-gray-300 mb-3">
              Daftar seluruh peripheral, kabel, media penyimpanan, dan perangkat tambahan lainnya.
            </div>
          </div>
          {accounts.length === 0 && (
            <div className="flex justify-center my-10">
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-bold text-lg shadow-md"
              >
                Login Microsoft
              </button>
            </div>
          )}

          {accounts.length > 0 && (
            <div>
              <div className="flex gap-3 mb-8">
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow"
                >
                  {loading ? "Loading..." : "Refresh Data"}
                </button>
                <button
                  onClick={openAddModal}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg font-bold shadow"
                >
                  + Tambah Data
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl shadow bg-white/80 dark:bg-gray-900/80">
                <table className="min-w-full text-base">
                  <thead>
                    <tr className="bg-blue-50 dark:bg-gray-800 text-[#215ba6] dark:text-white">
                      <th className="px-5 py-4 rounded-tl-xl">No</th>
                      <th className="px-5 py-4">Title</th>
                      <th className="px-5 py-4">Stok Saat Ini</th>
                      <th className="px-5 py-4">Item Type</th>
                      <th className="px-5 py-4 rounded-tr-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="text-center px-4 py-14 text-gray-400 dark:text-gray-300 font-semibold">
                          Loading...
                        </td>
                      </tr>
                    ) : sortedData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center px-4 py-14 text-gray-400 dark:text-gray-300 font-semibold">
                          Belum ada data
                        </td>
                      </tr>
                    ) : (
                      sortedData.map((item, idx) => (
                        <tr key={item.id || idx} className={idx % 2 === 1 ? "bg-blue-50/60 dark:bg-gray-800/60" : ""}>
                          <td className="px-5 py-3 text-center font-bold text-gray-700 dark:text-gray-100">{item.fields?.Nomor ?? "-"}</td>
                          <td className="px-5 py-3 text-gray-800 dark:text-gray-100">{item.fields?.Title ?? "-"}</td>
                          <td className="px-5 py-3 text-center text-gray-800 dark:text-gray-100">{item.fields?.Quantity ?? "-"}</td>
                          <td className="px-5 py-3 text-center">
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-1 rounded-full font-semibold text-base">
                              {item.fields?.Tipe ?? "-"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <button
                              onClick={() => openEditModal(item)}
                              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-4 py-1 rounded mr-2 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteItem(item)}
                              className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-1 rounded transition"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal Form */}
          {modalOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
              <form
                onSubmit={submitForm}
                className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-8"
              >
                <h2 className="text-center text-xl font-bold mb-6 text-blue-700 dark:text-blue-200">
                  {editingItem ? "Edit Data" : "Tambah Data"}
                </h2>
                <label className="block mb-3">
                  <span className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">Nomor</span>
                  <input
                    type="number"
                    name="Nomor"
                    value={formFields.Nomor}
                    readOnly
                    disabled
                    placeholder="(otomatis)"
                    className="w-full p-2 rounded border border-gray-300 dark:bg-gray-800 dark:text-white"
                  />
                </label>
                <label className="block mb-3">
                  <span className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">Title</span>
                  <input
                    type="text"
                    name="Title"
                    value={formFields.Title}
                    onChange={handleFormChange}
                    required
                    className="w-full p-2 rounded border border-gray-300 dark:bg-gray-800 dark:text-white"
                  />
                </label>
                <label className="block mb-3">
                  <span className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">Stok Saat Ini</span>
                  <input
                    type="number"
                    name="Quantity"
                    value={formFields.Quantity}
                    onChange={handleFormChange}
                    required
                    min={0}
                    className="w-full p-2 rounded border border-gray-300 dark:bg-gray-800 dark:text-white"
                  />
                </label>
                <label className="block mb-3">
                  <span className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">Item Type</span>
                  <select
                    name="Tipe"
                    value={formFields.Tipe}
                    onChange={handleFormChange}
                    required
                    className="w-full p-2 rounded border border-gray-300 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">-- Pilih Tipe --</option>
                    {ITEM_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </label>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg shadow"
                  >
                    {editingItem ? "Update" : "Tambah"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="bg-gray-400 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-500"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
