import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";

const GRAPH_SCOPE = ["Directory.Read.All"];

export default function Licenses() {
  const { instance, accounts } = useMsal();
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const columns = [
    { title: "License Name", key: "productName" },
    { title: "Sku Part Number", key: "skuPartNumber" },
    { title: "Enabled", key: "enabled" },
    { title: "Assigned", key: "assigned" },
    { title: "Warning", key: "warning" },
    { title: "Type", key: "type" },
    { title: "Status", key: "status" },
  ];

  // Auto-fetch data setelah login
  useEffect(() => {
    if (accounts.length > 0) fetchLicenses();
    // eslint-disable-next-line
  }, [accounts.length]);

  async function fetchLicenses() {
    setLoading(true);
    try {
      const account = accounts[0];
      const token = await instance.acquireTokenSilent({
        scopes: GRAPH_SCOPE,
        account,
      });
      const res = await fetch("https://graph.microsoft.com/v1.0/subscribedSkus", {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      });
      const json = await res.json();
      let items = json.value || [];

      const productNames = {
        POWER_BI_PRO: "Power BI Pro",
        WINDOWS_STORE: "Windows Store",
        ENTERPRISEPACK: "Office 365 E3",
        FLOW_FREE: "Power Automate Free",
        CCIBOTS_PRIVPREV_VIRAL: "Copilot Studio Viral Trial",
        POWER_BI_STANDARD: "Power BI Standard",
        Power_Pages_vTrial_for_Makers: "Power Pages vTrial for Makers",
        STANDARDPACK: "Office 365 E1",
      };

      const mapped = items
        .filter(
          (d) =>
            d.skuPartNumber !== "WINDOWS_STORE" &&
            d.skuPartNumber
        )
        .map((d) => ({
          productName:
            productNames[d.skuPartNumber] ||
            d.skuPartNumber.replaceAll("_", " "),
          skuPartNumber: d.skuPartNumber,
          enabled: d.prepaidUnits?.enabled ?? 0,
          assigned: d.consumedUnits ?? 0,
          warning: d.prepaidUnits?.warning ?? 0,
          type: d.appliesTo ?? "",
          status: d.capabilityStatus ?? "",
        }));

      setLicenses(mapped);
    } catch (err) {
      alert("Gagal mengambil data: " + err.message);
    }
    setLoading(false);
  }

  const filtered = licenses.filter((row) =>
    columns.some((col) =>
      String(row[col.key]).toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="relative min-h-screen flex flex-col items-center py-8">
      {/* --- BACKGROUND FULLSCREEN --- */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: `
            linear-gradient(rgba(250, 250, 252, 0.34),rgba(45,30,90,0.23)),
            url('/license-bg.jpg') center center / cover no-repeat
          `
        }}
      />
      {/* --- CONTENT --- */}
      <div className="relative z-10 bg-transparent w-full flex flex-col items-center">
        <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-8 w-full max-w-4xl shadow-xl mt-8">
          <h2 className="text-3xl font-bold mb-6 text-[#215ba6] dark:text-white">
            Microsoft 365 Licenses
          </h2>
          <div className="flex items-center mb-4 gap-2">
            <input
              className="px-4 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white"
              style={{ minWidth: 240 }}
              type="text"
              placeholder="Cari License, Sku, dsb..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              onClick={fetchLicenses}
              disabled={loading}
            >
              {loading ? "Loading..." : "Tampilkan Data License"}
            </button>
          </div>
          <div className="overflow-x-auto mt-2">
            <table className="min-w-full text-base rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-[#223e74] dark:bg-[#223e74] text-white">
                  {columns.map((col) => (
                    <th className="px-4 py-3 text-left" key={col.key}>
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                      Belum ada data license.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, i) => (
                    <tr
                      key={row.skuPartNumber}
                      className={
                        i % 2 === 0
                          ? "bg-blue-50 dark:bg-gray-700"
                          : "bg-white dark:bg-gray-800"
                      }
                    >
                      <td className="px-4 py-2 font-semibold text-gray-800 dark:text-white">
                        {row.productName}
                      </td>
                      <td className="px-4 py-2 text-gray-800 dark:text-white">
                        {row.skuPartNumber}
                      </td>
                      <td className="px-4 py-2 text-gray-800 dark:text-white">
                        {row.enabled}
                      </td>
                      <td className="px-4 py-2 text-gray-800 dark:text-white">
                        {row.assigned}
                      </td>
                      <td className="px-4 py-2 text-gray-800 dark:text-white">
                        {row.warning}
                      </td>
                      <td className="px-4 py-2 text-gray-800 dark:text-white">
                        {row.type}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            row.status === "Enabled"
                              ? "bg-green-300 text-green-900 px-4 py-1 rounded-lg font-bold"
                              : "bg-red-300 text-red-900 px-4 py-1 rounded-lg font-bold"
                          }
                        >
                          {row.status}
                        </span>
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
