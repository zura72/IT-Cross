import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area
} from "recharts";

const data = [
  { status: "Dipakai", jumlah: 74, color: "#4f8cff", icon: "💻" },
  { status: "Spare", jumlah: 0, color: "#01cfc9", icon: "📦" },
  { status: "Rusak", jumlah: 0, color: "#f56c6c", icon: "🔧" },
  { status: "Hilang", jumlah: 0, color: "#b99aff", icon: "🔍" },
  { status: "Perbaikan", jumlah: 4, color: "#f7b731", icon: "🛠️" },
  { status: "Tersedia", jumlah: 3, color: "#6d6ad7", icon: "✅" },
];

// Data untuk trend chart
const trendData = [
  { month: "Jan", devices: 65 },
  { month: "Feb", devices: 70 },
  { month: "Mar", devices: 68 },
  { month: "Apr", devices: 72 },
  { month: "Mei", devices: 74 },
  { month: "Jun", devices: 81 },
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
        <p className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-lg">
          {payload[0].payload.icon} {payload[0].payload.status}
        </p>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          <span className="font-bold text-2xl" style={{ color: payload[0].payload.color }}>
            {payload[0].value}
          </span> perangkat
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {((payload[0].value / data.reduce((sum, item) => sum + item.jumlah, 0)) * 100).toFixed(1)}% dari total
        </p>
      </div>
    );
  }
  return null;
};

const TrendTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-bold text-gray-800 dark:text-white">
          {payload[0].payload.month}
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          <span className="font-bold text-blue-600 dark:text-blue-400">{payload[0].value}</span> perangkat
        </p>
      </div>
    );
  }
  return null;
};

export default function ModernDeviceDashboard() {
  const [viewMode, setViewMode] = useState("bar");
  const [timeRange, setTimeRange] = useState("monthly");
  const totalDevices = data.reduce((sum, item) => sum + item.jumlah, 0);

  return (
    <div className="w-full bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-3xl shadow-xl p-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
            Device Status Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Overview of all company devices and their current status
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
          
          <div className="bg-white dark:bg-gray-800 p-1 rounded-xl shadow-inner flex">
            <button 
              onClick={() => setTimeRange("weekly")}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                timeRange === "weekly" 
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Mingguan
            </button>
            <button 
              onClick={() => setTimeRange("monthly")}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                timeRange === "monthly" 
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Bulanan
            </button>
            <button 
              onClick={() => setTimeRange("yearly")}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                timeRange === "yearly" 
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Tahunan
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Perangkat</h3>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400">📊</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-3">{totalDevices}</p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1 flex items-center">
            <span className="mr-1">↑</span> 8.2% dari bulan lalu
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Perangkat Aktif</h3>
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400">✅</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-3">74</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">91.4% dari total</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Perlu Perhatian</h3>
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <span className="text-amber-600 dark:text-amber-400">⚠️</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-3">7</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Perbaikan & Tersedia</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Main Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Distribusi Status Perangkat</h3>
          <div className="h-72">
            {viewMode === "bar" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="4 2" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="status"
                    fontSize={14}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => data.find(d => d.status === value)?.icon + " " + value}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={14} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#4f8cff22" }} />
                  <Bar
                    dataKey="jumlah"
                    name="Jumlah"
                    radius={[6, 6, 0, 0]}
                    animationDuration={800}
                    label={{ 
                      position: "top", 
                      fontSize: 14, 
                      fill: "#374151", 
                      fontWeight: 600,
                      formatter: (value) => value > 0 ? value : ""
                    }}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.filter(item => item.jumlah > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="80%"
                    paddingAngle={2}
                    dataKey="jumlah"
                    nameKey="status"
                    label={({ status, jumlah }) => `${data.find(d => d.status === status)?.icon} ${jumlah}`}
                    labelLine={false}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Trend Perangkat 6 Bulan Terakhir</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 16, right: 24, left: 0, bottom: 24 }}>
                <defs>
                  <linearGradient id="colorDevices" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f8cff" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4f8cff" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 2" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" fontSize={14} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={14} />
                <Tooltip content={<TrendTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="devices" 
                  stroke="#4f8cff" 
                  fillOpacity={1} 
                  fill="url(#colorDevices)" 
                  activeDot={{ r: 6, fill: "#4f8cff" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {data.map((item, idx) => (
          <div 
            key={item.status} 
            className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 text-center transition-transform hover:scale-105"
            style={{ borderLeft: `4px solid ${item.color}` }}
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{item.status}</div>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">{item.jumlah}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {totalDevices > 0 ? ((item.jumlah / totalDevices) * 100).toFixed(1) : 0}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}