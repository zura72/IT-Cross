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
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

  // Show success message
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // Show error message
  const showError = (message) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(""), 5000);
  };

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
      showError("Gagal mengambil data: " + err.message);
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
      showSuccess("Data berhasil ditambahkan");
      setModalOpen(false);
      fetchData();
    } catch (err) {
      showError("Gagal menambah data: " + err.message);
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
      showSuccess("Data berhasil diupdate");
      setModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err) {
      showError("Gagal update data: " + err.message);
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
      showSuccess("Data berhasil dihapus");
      fetchData();
    } catch (err) {
      showError("Gagal hapus data: " + err.message);
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
    <div className="relative min-h-screen flex flex-col items-center py-8 md:py-12 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      {/* Notification Messages */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-lg animate-fadeIn">
          <p>{successMessage}</p>
        </div>
      )}
      
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-lg animate-fadeIn">
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="w-full flex flex-col items-center px-4">
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-xl rounded-2xl w-full max-w-6xl p-6 md:p-8 transition-all duration-300">
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-blue-700 dark:text-blue-300">Peripheral Management</h2>
            <div className="text-gray-600 dark:text-gray-300 text-lg">
              Daftar seluruh peripheral, kabel, media penyimpanan, dan perangkat tambahan lainnya.
            </div>
          </div>
          
          {accounts.length === 0 && (
            <div className="flex justify-center my-10">
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg shadow-md transition-all duration-300 transform hover:-translate-y-1"
              >
                Login Microsoft
              </button>
            </div>
          )}

          {accounts.length > 0 && (
            <div>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-bold shadow transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Refresh Data
                    </>
                  )}
                </button>
                <button
                  onClick={openAddModal}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Tambah Data
                </button>
              </div>
              
              <div className="overflow-x-auto rounded-xl shadow-lg bg-white/80 dark:bg-gray-800/80">
                <table className="min-w-full text-base">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                      <th className="px-6 py-4 text-left rounded-tl-xl">No</th>
                      <th className="px-6 py-4 text-left">Nama Item</th>
                      <th className="px-6 py-4 text-center">Stok</th>
                      <th className="px-6 py-4 text-center">Tipe</th>
                      <th className="px-6 py-4 text-center rounded-tr-xl">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="text-center px-4 py-14 text-gray-400 dark:text-gray-300 font-semibold">
                          <div className="flex justify-center items-center">
                            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        </td>
                      </tr>
                    ) : sortedData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center px-4 py-14 text-gray-400 dark:text-gray-300 font-semibold">
                          <div className="flex flex-col items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p>Belum ada data peripheral</p>
                            <button 
                              onClick={openAddModal}
                              className="mt-4 text-blue-600 hover:text-blue-800 font-medium flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                              </svg>
                              Tambah data pertama
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedData.map((item, idx) => (
                        <tr 
                          key={item.id || idx} 
                          className={`transition-colors duration-200 ${idx % 2 === 1 ? "bg-blue-50/60 dark:bg-gray-700/60" : "bg-white dark:bg-gray-800"} hover:bg-blue-100 dark:hover:bg-gray-700`}
                        >
                          <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-100">{item.fields?.Nomor ?? "-"}</td>
                          <td className="px-6 py-4 text-gray-800 dark:text-gray-100 font-medium">{item.fields?.Title ?? "-"}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${item.fields?.Quantity > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                              {item.fields?.Quantity ?? 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-semibold">
                              {item.fields?.Tipe ?? "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => openEditModal(item)}
                                className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium px-3 py-1.5 rounded-lg transition-colors duration-200 flex items-center"
                                title="Edit Item"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() => deleteItem(item)}
                                className="bg-red-100 hover:bg-red-200 text-red-800 font-medium px-3 py-1.5 rounded-lg transition-colors duration-200 flex items-center"
                                title="Hapus Item"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Hapus
                              </button>
                            </div>
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
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4 animate-fadeIn">
              <div 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {editingItem ? "Edit Data Peripheral" : "Tambah Data Peripheral"}
                  </h2>
                </div>
                
                <form onSubmit={submitForm} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nomor
                    </label>
                    <input
                      type="number"
                      name="Nomor"
                      value={formFields.Nomor}
                      readOnly
                      disabled
                      placeholder="(otomatis)"
                      className="w-full p-3 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 bg-gray-100 text-gray-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nama Item *
                    </label>
                    <input
                      type="text"
                      name="Title"
                      value={formFields.Title}
                      onChange={handleFormChange}
                      required
                      className="w-full p-3 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Masukkan nama item"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Jumlah Stok *
                    </label>
                    <input
                      type="number"
                      name="Quantity"
                      value={formFields.Quantity}
                      onChange={handleFormChange}
                      required
                      min={0}
                      className="w-full p-3 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Masukkan jumlah stok"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tipe Item *
                    </label>
                    <select
                      name="Tipe"
                      value={formFields.Tipe}
                      onChange={handleFormChange}
                      required
                      className="w-full p-3 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    >
                      <option value="">-- Pilih Tipe --</option>
                      {ITEM_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-5 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center"
                    >
                      {editingItem ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Update
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          Tambah
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}