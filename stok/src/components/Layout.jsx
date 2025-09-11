import React from "react";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

// Layout agar sidebar sticky dan main scrollable
export default function Layout() {
  // HAPUS SEMUA LOGIC DARK MODE DARI SINI
  // State dark mode sudah dikelola oleh ThemeContext

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Sidebar sticky (fixed), lebar 256px = w-64 */}
      <aside className="fixed left-0 top-0 h-screen w-64 z-40">
        {/* HAPUS props dark dan toggleDark dari Sidebar */}
        <Sidebar />
      </aside>
      {/* Main content: margin-left untuk sidebar */}
      <main className="ml-64 flex-1 px-6 py-8 overflow-auto min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}