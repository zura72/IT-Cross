// src/pages/charts/ChartsPeripheral.jsx
import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Mouse", stok: 0 },
  { name: "Hardisk", stok: 0 },
  { name: "SSD", stok: 0 },
  { name: "Webcam", stok: 0 },
  { name: "Kabel HDMI", stok: 3 },
  // dst
];

export default function ChartsPeripheral() {
  return (
    <div className="w-full h-[400px] bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#215ba6] dark:text-white">Peripheral Chart</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="stok" fill="#FFBB28" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
