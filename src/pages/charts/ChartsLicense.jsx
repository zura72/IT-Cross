// src/pages/charts/ChartsLicense.jsx
import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Data dummy, nanti ganti dengan data real
const data = [
  { name: "Aktif", value: 23 },
  { name: "Warning", value: 3 },
  { name: "Expired", value: 1 },
];

const COLORS = ["#0088FE", "#FFBB28", "#FF4B4B"];

export default function ChartsLicense() {
  return (
    <div className="w-full h-[400px] bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#215ba6] dark:text-white">License Chart</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            label
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
