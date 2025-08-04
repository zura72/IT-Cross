import React, { useEffect, useState } from "react";

export default function StockList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ganti ini dengan access token yang sudah kamu dapatkan
  const accessToken = "YOUR_ACCESS_TOKEN_HERE";

  // Ganti dengan Site ID dan List ID kamu
  const siteId = "waskitainfra.sharepoint.com,82f98496-0de9-45f8-9b3e-30bbfd2838fe,a097be9c-086d-41bd-9afb-5b1a095f2705";
  const listId = "8a0d252f-a22e-4e6f-ac72-455708ab6e42";

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const json = await res.json();
      if (res.ok) {
        setData(json.value);
      } else {
        alert(`Error: ${json.error.message}`);
      }
    } catch (error) {
      alert("Fetch failed: " + error.message);
    }
    setLoading(false);
  }

  return (
    <div>
      <h2>Data List SharePoint: List_Peripheral</h2>
      <button onClick={fetchData}>Refresh Data</button>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table border="1" cellPadding="5" style={{ marginTop: "10px", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>No</th>
              <th>Title</th>
              <th>Stok Saat Ini</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: "center" }}>
                  Tidak ada data
                </td>
              </tr>
            )}
            {data.map((item, idx) => (
              <tr key={item.id}>
                <td>{idx + 1}</td>
                <td>{item.fields?.Title ?? "-"}</td>
                <td>{item.fields?.Stok_x0020_Saat_x0020_Ini ?? "-"}</td>
                <td>
                  <button>Edit</button> <button>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
