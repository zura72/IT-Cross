import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area
} from "recharts";

const GRAPH_SCOPE = ["Sites.ReadWrite.All"];
const siteId = "waskitainfra-my.sharepoint.com,81711596-bf57-403c-8ef6-1cb25a538e52,43f60d09-3f38-4874-bf00-352549188508";
const listId = "467d78c3-7a1d-486f-8743-4a93c6b9ec91";
const ITEM_TYPE_OPTIONS = [
  "Input Device", "Kabel", "Media Penyimpanan",
  "Audio", "Jaringan", "Operating System", "Hub/Expander", "Item"
];

// Warna untuk setiap tipe item
const typeColors = {
  "Input Device": "#8884d8",
  "Kabel": "#82ca9d",
  "Media Penyimpanan": "#ffc658",
  "Audio": "#ff8042",
  "Jaringan": "#0088fe",
  "Operating System": "#ffbb28",
  "Hub/Expander": "#00c49f",
  "Item": "#ff6b6b"
};

export default function ModernPeripheralDashboard() {
  const { instance, accounts } = useMsal();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [viewMode, setViewMode] = useState("bar");
  const [activeFilter, setActiveFilter] = useState("all");

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
      setData(json.value || []);
    } catch (err) {
      showError("Gagal mengambil data: " + err.message);
    }
    setLoading(false);
  };

  // Hitung statistik untuk chart
  const getChartData = () => {
    const typeCounts = {};
    
    data.forEach(item => {
      const type = item.fields?.Tipe || "Unknown";
      if (!typeCounts[type]) {
        typeCounts[type] = 0;
      }
      typeCounts[type] += item.fields?.Quantity || 0;
    });

    return Object.entries(typeCounts).map(([type, count]) => ({
      name: type,
      value: count,
      color: typeColors[type] || "#8884d8"
    }));
  };

  // Hitung statistik
  const totalItems = data.reduce((sum, item) => sum + (item.fields?.Quantity || 0), 0);
  const lowStockItems = data.filter(item => (item.fields?.Quantity || 0) < 5).length;
  const uniqueTypes = [...new Set(data.map(item => item.fields?.Tipe).filter(Boolean))];

  // Custom tooltip untuk chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <p className="font-bold text-gray-800 dark:text-white text-lg">{payload[0].payload.name}</p>
          <p className="text-sm mt-2">
            Jumlah: <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
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

      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
                Peripheral Management Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Overview of all company peripherals and their current stock status
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-xl shadow-inner flex">
                <button 
                  onClick={() => setViewMode("bar")}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    viewMode === "bar" 
                      ? "bg-white text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm" 
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Bar Chart
                </button>
                <button 
                  onClick={() => setViewMode("pie")}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    viewMode === "pie" 
                      ? "bg-white text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm" 
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Pie Chart
                </button>
              </div>
              
              <select 
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Semua Tipe</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-5 rounded-2xl shadow-md border border-blue-100 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <h3 className="text-blue-700 dark:text-blue-300 text-sm font-medium">Total Item</h3>
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400">📦</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-blue-800 dark:text-blue-200 mt-3">{totalItems}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">dalam inventaris</p>
            </div>
            
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 p-5 rounded-2xl shadow-md border border-amber-100 dark:border-amber-700">
              <div className="flex items-center justify-between">
                <h3 className="text-amber-700 dark:text-amber-300 text-sm font-medium">Jenis Peripheral</h3>
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <span className="text-amber-600 dark:text-amber-400">🔧</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-amber-800 dark:text-amber-200 mt-3">{uniqueTypes.length}</p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">kategori berbeda</p>
            </div>
            
            <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 p-5 rounded-2xl shadow-md border border-red-100 dark:border-red-700">
              <div className="flex items-center justify-between">
                <h3 className="text-red-700 dark:text-red-300 text-sm font-medium">Stok Rendah</h3>
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400">⚠️</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-red-800 dark:text-red-200 mt-3">{lowStockItems}</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">perlu restock</p>
            </div>
          </div>

          {/* Chart Section */}
          <div className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-md mb-8">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Distribusi Stok Berdasarkan Tipe</h3>
            <div className="h-72">
              {viewMode === "bar" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="value" 
                      name="Jumlah" 
                      radius={[4, 4, 0, 0]}
                    >
                      {getChartData().map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getChartData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {getChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Action Buttons */}
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
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl mb-8">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Kategori Peripheral</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(typeColors).map(([type, color]) => (
              <div key={type} className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-2"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}