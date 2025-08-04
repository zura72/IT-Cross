import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from "recharts";

const data = [
  { status: "Dipakai", jumlah: 74 },
  { status: "Spare", jumlah: 0 },
  { status: "Rusak", jumlah: 0 },
  { status: "Hilang", jumlah: 0 },
  { status: "Perbaikan", jumlah: 4 },
  { status: "Tersedia", jumlah: 3 },
];

const COLORS = [
  "#4f8cff", // Dipakai
  "#01cfc9", // Spare
  "#f56c6c", // Rusak
  "#b99aff", // Hilang
  "#f7b731", // Perbaikan
  "#6d6ad7", // Tersedia
];

const LABELS = {
  Dipakai: "Dipakai",
  Spare: "Spare",
  Rusak: "Rusak",
  Hilang: "Hilang",
  Perbaikan: "Perbaikan",
  Tersedia: "Tersedia"
};

export default function ChartsDevice() {
  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#215ba6] dark:text-white">Device Chart</h2>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart
          data={data}
          margin={{ top: 16, right: 24, left: 0, bottom: 24 }}
          barSize={36}
        >
          <CartesianGrid strokeDasharray="4 2" vertical={false} />
          <XAxis
            dataKey="status"
            fontSize={16}
            tickLine={false}
            axisLine={false}
            style={{ fontWeight: 600 }}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 14, fontSize: 15 }}
            cursor={{ fill: "#4f8cff22" }}
          />
          <Legend
            iconType="circle"
            verticalAlign="top"
            height={36}
            formatter={(val) => (
              <span style={{ fontSize: 14, color: "#666" }}>{LABELS[val] || val}</span>
            )}
          />
          <Bar
            dataKey="jumlah"
            name="Jumlah"
            radius={[12, 12, 4, 4]}
            animationDuration={800}
            label={{ position: "top", fontSize: 15, fill: "#215ba6", fontWeight: 600 }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-5 flex flex-wrap gap-3 text-sm text-gray-700 dark:text-gray-200 font-semibold">
        {data.map((d, idx) => (
          <span key={d.status} className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full" style={{ background: COLORS[idx] }}></span>
            {LABELS[d.status]}
          </span>
        ))}
      </div>
    </div>
  );
}
