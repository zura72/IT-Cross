import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Cell, PieChart, Pie
} from "recharts";

const data = [
  { status: "Dipakai", jumlah: 74, color: "#4f8cff" },
  { status: "Spare", jumlah: 0, color: "#01cfc9" },
  { status: "Rusak", jumlah: 0, color: "#f56c6c" },
  { status: "Hilang", jumlah: 0, color: "#b99aff" },
  { status: "Perbaikan", jumlah: 4, color: "#f7b731" },
  { status: "Tersedia", jumlah: 3, color: "#6d6ad7" },
];

const statusIcons = {
  Dipakai: "💻",
  Spare: "📦",
  Rusak: "🔧",
  Hilang: "🔍",
  Perbaikan: "🛠️",
  Tersedia: "✅"
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          {statusIcons[payload[0].payload.status]} {payload[0].payload.status}
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          <span className="font-bold text-blue-600 dark:text-blue-400">{payload[0].value}</span> perangkat
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {((payload[0].value / data.reduce((sum, item) => sum + item.jumlah, 0)) * 100).toFixed(1)}% dari total
        </p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center gap-2 text-sm">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-700 dark:text-gray-300">{entry.value}</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {data.find(d => d.status === entry.value)?.jumlah}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ChartsDevice() {
  const [viewMode, setViewMode] = useState("bar"); // 'bar' or 'pie'
  const totalDevices = data.reduce((sum, item) => sum + item.jumlah, 0);

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#215ba6] dark:text-white">Status Perangkat</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Total: <span className="font-semibold text-blue-600 dark:text-blue-400">{totalDevices}</span> perangkat
          </p>
        </div>
        
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button 
            onClick={() => setViewMode("bar")}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "bar" 
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Chart Bar
          </button>
          <button 
            onClick={() => setViewMode("pie")}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "pie" 
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Chart Pie
          </button>
        </div>
      </div>

      <div className="h-80">
        {viewMode === "bar" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="4 2" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="status"
                fontSize={14}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => statusIcons[value] + " " + value}
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
                label={({ status, jumlah }) => `${statusIcons[status]} ${jumlah}`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.map((item, idx) => (
          <div 
            key={item.status} 
            className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex flex-col items-center"
          >
            <div className="text-2xl mb-1">{statusIcons[item.status]}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center">{item.status}</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">{item.jumlah}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {totalDevices > 0 ? ((item.jumlah / totalDevices) * 100).toFixed(1) : 0}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}