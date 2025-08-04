import React, { useState } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "./authConfig";
import axios from "axios";

const siteId = "waskitainfra-my.sharepoint.com,81711596-bf57-403c-8ef6-1cb25a538e52,43f60d09-3f38-4874-bf00-352549188508";
const listId = "254f57d0-991e-4e42-b7e5-8ad3794ed926";

function MainPage() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const [lists, setLists] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newStock, setNewStock] = useState("");
  const [editId, setEditId] = useState(null);
  const [editStock, setEditStock] = useState("");

  const handleLogin = () => {
    instance.loginPopup(loginRequest);
  };

  const getToken = async () => {
    const account = accounts[0];
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return response.accessToken;
  };

  // READ - Tampilkan data
  const fetchLists = async () => {
    try {
      const token = await getToken();
      const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields`;
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLists(data.value);
    } catch (error) {
      console.log("FETCH ERROR:", error.response?.data || error.message);
      alert("Fetch error: " + JSON.stringify(error.response?.data || error.message));
    }
  };

  // CREATE - Tambah barang baru
  const createItem = async () => {
    try {
      if (!newTitle || !newStock) return alert("Lengkapi nama & stok!");
      const token = await getToken();
      const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`;
      await axios.post(
        url,
        {
          fields: {
            Title: newTitle,
            "Stok saat ini": parseInt(newStock, 10),
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewTitle("");
      setNewStock("");
      fetchLists();
    } catch (error) {
      console.log("CREATE ERROR:", error.response?.data || error.message);
      alert("Create error: " + JSON.stringify(error.response?.data || error.message));
    }
  };

  // UPDATE - Edit stok
  const updateStock = async (id) => {
    try {
      if (!editStock) return alert("Isi stok baru!");
      const token = await getToken();
      const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${id}/fields`;
      await axios.patch(
        url,
        {
          "Stok saat ini": parseInt(editStock, 10),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditId(null);
      setEditStock("");
      fetchLists();
    } catch (error) {
      console.log("UPDATE ERROR:", error.response?.data || error.message);
      alert("Update error: " + JSON.stringify(error.response?.data || error.message));
    }
  };

  // DELETE - Hapus barang
  const deleteItem = async (id) => {
    if (!window.confirm("Yakin hapus barang ini?")) return;
    try {
      const token = await getToken();
      const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${id}`;
      await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchLists();
    } catch (error) {
      console.log("DELETE ERROR:", error.response?.data || error.message);
      alert("Delete error: " + JSON.stringify(error.response?.data || error.message));
    }
  };

  return (
    <div style={{ padding: 20 }}>
      {!isAuthenticated ? (
        <button onClick={handleLogin}>Login Microsoft</button>
      ) : (
        <>
          <h2>Stok Barang</h2>
          <button onClick={fetchLists}>Tampilkan Data</button>
          <table border="1" cellPadding="6" style={{ marginTop: 20 }}>
            <thead>
              <tr>
                <th>Nama Barang</th>
                <th>Stok Saat Ini</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {lists.map((item) => (
                <tr key={item.id}>
                  <td>{item.fields.Title}</td>
                  <td>
                    {editId === item.id ? (
                      <input
                        type="number"
                        value={editStock}
                        onChange={(e) => setEditStock(e.target.value)}
                        style={{ width: "60px" }}
                      />
                    ) : (
                      item.fields["Stok saat ini"]
                    )}
                  </td>
                  <td>
                    {editId === item.id ? (
                      <>
                        <button onClick={() => updateStock(item.id)}>Simpan</button>
                        <button onClick={() => setEditId(null)}>Batal</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditId(item.id);
                            setEditStock(item.fields["Stok saat ini"]);
                          }}
                        >
                          Edit Stok
                        </button>
                        <button onClick={() => deleteItem(item.id)}>Hapus</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* FORM TAMBAH BARANG BARU */}
          <div style={{ marginTop: 30 }}>
            <h4>Tambah Barang Baru</h4>
            <input
              type="text"
              placeholder="Nama barang"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <input
              type="number"
              placeholder="Stok"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              style={{ marginLeft: 10 }}
            />
            <button onClick={createItem} style={{ marginLeft: 10 }}>
              Tambah
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default MainPage;
