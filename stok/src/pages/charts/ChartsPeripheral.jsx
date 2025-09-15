// src/pages/charts/ChartsPeripheral.jsx
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
  Legend
} from "recharts";

// Data contoh (akan digantikan dengan data props atau API)
const sampleData = [
  { name: "Mouse", stok: 15, tipe: "Input Device" },
  { name: "Keyboard", stok: 12, tipe: "Input Device" },
  { name: "Hardisk", stok: 8, tipe: "Media Penyimpanan" },
  { name: "SSD", stok: 10, tipe: "Media Penyimpanan" },
  { name: "Webcam", stok: 5, tipe: "Audio" },
  { name: "Kabel HDMI", stok: 3, tipe: "Kabel" },
  { name: "Switch Jaringan", stok: 7, tipe: "Jaringan" },
  { name: "USB Hub", stok: 9, tipe: "Hub/Expander" },
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

export default function ChartsPeripheral({ peripheralData = sampleData }) {
  const [data, setData] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

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

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <p className="font-bold text-gray-800 dark:text-white">{label}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Tipe: <span className="font-medium">{payload[0].payload.tipe}</span>
          </p>
          <p className="text-sm">
            Stok: <span className="font-medium text-blue-600 dark:text-blue-400">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#215ba6] dark:text-white mb-4 md:mb-0">
          Grafik Stok Peripheral
        </h2>
        
        <div className="flex flex-wrap gap-2">
          <select 
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Semua Tipe</option>
            {Object.keys(typeColors).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Urutkan berdasarkan Nama</option>
            <option value="stok">Urutkan berdasarkan Stok</option>
          </select>
        </div>
      </div>

      {/* Statistik Ringkas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">Total Item</p>
          <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{totalItems}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">Stok Rendah (&lt;5)</p>
          <p className="text-2xl font-bold text-red-800 dark:text-red-200">{lowStockItems}</p>
        </div>
      </div>

      {/* Chart Container */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
          >
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
              label={{ 
                value: 'Jumlah Stok', 
                angle: -90, 
                position: 'insideLeft',
                offset: -10,
                style: { fill: '#6B7280', fontSize: 12 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36}
              formatter={(value) => (
                <span className="text-sm text-gray-600 dark:text-gray-300">{value}</span>
              )}
            />
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
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {Object.entries(typeColors).map(([type, color]) => (
          <div key={type} className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-1"
              style={{ backgroundColor: color }}
            ></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">{type}</span>
          </div>
        ))}
      </div>

      {/* Info Tambahan */}
      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Data diperbarui: {new Date().toLocaleDateString('id-ID')}</p>
      </div>
    </div>
  );
}