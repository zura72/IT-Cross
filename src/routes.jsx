// src/routes.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Devices from "./pages/Devices";
import Licenses from "./pages/Licenses";
import Peripheral from "./pages/Peripheral";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
import ChartsLicense from "./pages/charts/ChartsLicense";
import ChartsPeripheral from "./pages/charts/ChartsPeripheral";
import ChartsDevice from "./pages/charts/ChartsDevice";
import Login from "./pages/Login";

export default function AppRoutes() {
  // State untuk darkmode
  const [dark, setDark] = useState(() => {
    const t = localStorage.getItem("theme");
    return t
      ? t === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
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
    <Router>
      <div className="flex bg-gray-100 dark:bg-gray-900 min-h-screen">
        <Sidebar dark={dark} toggleDark={() => setDark((v) => !v)} />
        <div className="flex-1 p-6 md:p-10">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/peripheral" element={<Peripheral />} />
            <Route path="/licenses" element={<Licenses />} />
            <Route path="/settings" element={<Settings />} />
            {/* Charts dropdown menu */}
            <Route path="/charts/license" element={<ChartsLicense />} />
            <Route path="/charts/peripheral" element={<ChartsPeripheral />} />
            <Route path="/charts/device" element={<ChartsDevice />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
