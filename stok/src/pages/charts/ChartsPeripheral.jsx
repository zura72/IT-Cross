import React, { useState, useEffect } from "react";
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

// Data contoh (akan digantikan dengan data props atau API)
const sampleData = [
  { name: "Mouse", stok: 15, tipe: "Input Device", harga: 250000, penggunaan: "Tinggi" },
  { name: "Keyboard", stok: 12, tipe: "Input Device", harga: 450000, penggunaan: "Tinggi" },
  { name: "Hardisk", stok: 8, tipe: "Media Penyimpanan", harga: 800000, penggunaan: "Sedang" },
  { name: "SSD", stok: 10, tipe: "Media Penyimpanan", harga: 1200000, penggunaan: "Tinggi" },
  { name: "Webcam", stok: 5, tipe: "Audio", harga: 650000, penggunaan: "Sedang" },
  { name: "Kabel HDMI", stok: 3, tipe: "Kabel", harga: 150000, penggunaan: "Rendah" },
  { name: "Switch Jaringan", stok: 7, tipe: "Jaringan", harga: 950000, penggunaan: "Sedang" },
  { name: "USB Hub", stok: 9, tipe: "Hub/Expander", harga: 350000, penggunaan: "Tinggi" },
];

// Data untuk trend penggunaan
const usageTrendData = [
  { bulan: "Jan", penggunaan: 45 },
  { bulan: "Feb", penggunaan: 52 },
  { bulan: "Mar", penggunaan: 48 },
  { bulan: "Apr", penggunaan: 61 },
  { bulan: "Mei", penggunaan: 65 },
  { bulan: "Jun", penggunaan: 72 },
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

// Warna untuk tingkat penggunaan
const usageColors = {
  "Tinggi": "#10b981",
  "Sedang": "#f59e0b",
  "Rendah": "#ef4444"
};

export default function ModernPeripheralDashboard({ peripheralData = sampleData }) {
  const [data, setData] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState("bar");
  const [timeRange, setTimeRange] = useState("monthly");

  // Proses data saat komponen dimount atau data berubah
  useEffect(() => {
    processData();
  }, [peripheralData, activeFilter, sortBy]);

  const processData = () => {
    let processedData = [...peripheralData];
    
    // Filter data berdasarkan tipe
    if (activeFilter !== "all") {
      processedData = processedData.filter(item => item.tipe === activeFilter);
    }
    
    // Urutkan data
    processedData.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else {
        return b.stok - a.stok;
      }
    });
    
    setData(processedData);
  };

  // Hitung statistik
  const totalItems = data.reduce((sum, item) => sum + item.stok, 0);
  const lowStockItems = data.filter(item => item.stok < 5).length;
  const totalValue = data.reduce((sum, item) => sum + (item.stok * (item.harga || 0)), 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <p className="font-bold text-gray-800 dark:text-white text-lg">{label}</p>
          <div className="flex items-center gap-2 mt-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: typeColors[item.tipe] || "#8884d8" }}
            ></div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {item.tipe}
            </p>
          </div>
          <p className="text-sm mt-2">
            Stok: <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">{payload[0].value}</span>
          </p>
          {item.harga && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Nilai: <span className="font-medium">Rp {item.harga.toLocaleString('id-ID')}</span>
            </p>
          )}
          {item.penggunaan && (
            <div className="flex items-center gap-2 mt-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: usageColors[item.penggunaan] || "#6b7280" }}
              ></div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Penggunaan: {item.penggunaan}
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const UsageTrendTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-bold text-gray-800 dark:text-white">
            {payload[0].payload.bulan}
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            <span className="font-bold text-blue-600 dark:text-blue-400">{payload[0].value}</span> permintaan
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-3xl shadow-xl p-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
            Peripheral Stock Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Overview of all company peripherals and their current stock status
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="bg-white dark:bg-gray-800 p-1 rounded-xl shadow-inner flex">
            <button 
              onClick={() => setViewMode("bar")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                viewMode === "bar" 
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Bar
            </button>
            <button 
              onClick={() => setViewMode("pie")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                viewMode === "pie" 
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Pie
            </button>
          </div>
          
          <select 
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Semua Tipe</option>
            {Object.keys(typeColors).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Item</h3>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400">📦</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-3">{totalItems}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">dalam inventaris</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Stok Rendah</h3>
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="text-red-600 dark:text-red-400">⚠️</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-3">{lowStockItems}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">perlu restock</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Nilai</h3>
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400">💰</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-3">
            Rp {totalValue.toLocaleString('id-ID')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">nilai inventaris</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Main Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Distribusi Stok Peripheral</h3>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name">Nama</option>
              <option value="stok">Stok</option>
            </select>
          </div>
          <div className="h-72">
            {viewMode === "bar" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
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
                    dataKey="stok" 
                    name="Stok" 
                    radius={[4, 4, 0, 0]}
                  >
                    {data.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={typeColors[entry.tipe] || "#8884d8"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="stok"
                    nameKey="name"
                    label={({ name, stok }) => `${name}: ${stok}`}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={typeColors[entry.tipe] || "#8884d8"} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Trend Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Trend Permintaan 6 Bulan</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageTrendData} margin={{ top: 16, right: 24, left: 0, bottom: 24 }}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 2" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="bulan" fontSize={14} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={14} />
                <Tooltip content={<UsageTrendTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="penggunaan" 
                  stroke="#8884d8" 
                  fillOpacity={1} 
                  fill="url(#colorUsage)" 
                  activeDot={{ r: 6, fill: "#8884d8" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Item Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {data.slice(0, 4).map((item, idx) => (
          <div 
            key={idx} 
            className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 transition-transform hover:scale-105"
          >
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-bold text-gray-800 dark:text-white">{item.name}</h4>
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: typeColors[item.tipe] || "#8884d8" }}
              ></div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{item.stok}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">stok tersedia</p>
              </div>
              {item.penggunaan && (
                <div className="text-right">
                  <span 
                    className="inline-block px-2 py-1 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: `${usageColors[item.penggunaan]}20`,
                      color: usageColors[item.penggunaan]
                    }}
                  >
                    {item.penggunaan}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
        <h4 className="font-bold text-gray-800 dark:text-white mb-3">Kategori Peripheral</h4>
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
  );
}