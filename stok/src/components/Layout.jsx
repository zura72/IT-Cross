import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

// Layout agar sidebar sticky dan main scrollable
export default function Layout() {
  // Dark mode logic (tailwind, class: dark)
  const [dark, setDark] = useState(() => {
    if (localStorage.getItem("theme")) {
      return localStorage.getItem("theme") === "dark";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Sidebar sticky (fixed), lebar 256px = w-64 */}
      <aside className="fixed left-0 top-0 h-screen w-64 z-40">
        <Sidebar dark={dark} toggleDark={() => setDark(v => !v)} />
      </aside>
      {/* Main content: margin-left untuk sidebar */}
      <main className="ml-64 flex-1 px-6 py-8 overflow-auto min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
