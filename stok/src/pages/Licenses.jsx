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
    { title: "Total", key: "enabled" },
    { title: "Assigned", key: "assigned" },
    { title: "Available", key: "available" },
    { title: "Usage", key: "usage" },
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
        .map((d) => {
          const available = (d.prepaidUnits?.enabled ?? 0) - (d.consumedUnits ?? 0);
          const usagePercentage = d.prepaidUnits?.enabled ? 
            Math.round(((d.consumedUnits ?? 0) / d.prepaidUnits.enabled) * 100) : 0;
            
          return {
            productName:
              productNames[d.skuPartNumber] ||
              d.skuPartNumber.replaceAll("_", " "),
            enabled: d.prepaidUnits?.enabled ?? 0,
            assigned: d.consumedUnits ?? 0,
            available: available,
            usage: usagePercentage,
            status: d.capabilityStatus ?? "",
          };
        });

      setLicenses(mapped);
    } catch (err) {
      alert("Failed to fetch data: " + err.message);
    }
    setLoading(false);
  }

  const filtered = licenses.filter((row) =>
    columns.some((col) =>
      String(row[col.key]).toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="relative min-h-screen flex flex-col items-center py-8 bg-gray-50 dark:bg-gray-900">
      {/* Header Section */}
      <div className="relative z-10 w-full max-w-6xl mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl p-8 shadow-xl text-white">
          <h1 className="text-4xl font-bold mb-2">Microsoft 365 Licenses</h1>
          <p className="text-blue-100">Manage and monitor your organization's license usage</p>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative z-10 w-full max-w-6xl">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          {/* Search and Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full md:w-96">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <input
                className="pl-10 pr-4 py-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                type="text"
                placeholder="Search licenses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <button
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg transition-colors w-full md:w-auto disabled:opacity-50"
              onClick={fetchLicenses}
              disabled={loading}
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
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  Refresh License Data
                </>
              )}
            </button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Licenses</div>
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                {licenses.reduce((sum, item) => sum + item.enabled, 0)}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-100 dark:border-green-800">
              <div className="text-sm text-green-600 dark:text-green-400 font-medium">Assigned</div>
              <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                {licenses.reduce((sum, item) => sum + item.assigned, 0)}
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg border border-amber-100 dark:border-amber-800">
              <div className="text-sm text-amber-600 dark:text-amber-400 font-medium">Available</div>
              <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                {licenses.reduce((sum, item) => sum + item.available, 0)}
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
              <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">License Types</div>
              <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                {licenses.length}
              </div>
            </div>
          </div>

          {/* License Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  {columns.map((col) => (
                    <th 
                      key={col.key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                    >
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-12 text-center">
                      <div className="flex justify-center items-center">
                        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center">
                        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p className="text-lg">No license data available</p>
                        <p className="text-sm mt-1">Click "Refresh License Data" to load information</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, i) => (
                    <tr 
                      key={i} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 dark:text-white">{row.productName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {row.enabled}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {row.assigned}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {row.available}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mr-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                row.usage > 90 ? 'bg-red-500' : 
                                row.usage > 70 ? 'bg-amber-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(row.usage, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {row.usage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            row.status === "Enabled"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          }`}
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

          {/* Table Footer */}
          {filtered.length > 0 && (
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Showing {filtered.length} of {licenses.length} licenses
            </div>
          )}
        </div>
      </div>
    </div>
  );
}