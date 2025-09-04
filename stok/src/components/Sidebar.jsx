import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BsBarChart, BsCpu, BsPlug, BsGear,
  BsShieldCheck, BsChevronDown, BsChevronUp, BsHeadset
} from "react-icons/bs";
import { FaRegMoon, FaRegSun } from "react-icons/fa";
import UserMenu from "./UserMenu"; // ⬅️ tambah menu user (logout)

export default function Sidebar({ dark, toggleDark }) {
  const [chartsOpen, setChartsOpen] = useState(false);
  const [helpdeskOpen, setHelpdeskOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith("/charts")) setChartsOpen(true);
    if (location.pathname.startsWith("/helpdesk")) setHelpdeskOpen(true);
  }, [location.pathname]);

  return (
    <aside
      className={`
        w-64 h-screen sticky top-0 z-20 transition-all
        bg-white/45 dark:bg-black/50
        text-gray-900 dark:text-white
        border-r border-gray-200 dark:border-[#232737]
        backdrop-blur-xl
      `}
    >
      <div className="flex flex-col h-full w-64">
        {/* Logo + Judul */}
        <div className="flex items-center justify-center mt-8 mb-2">
          <img
            src="/logo-wki.png"
            alt="Waskita Infrastruktur Logo"
            className="h-12 w-12 rounded-full shadow-md bg-white object-contain"
            style={{ background: "white" }}
          />
          <span className="ml-4 text-xl font-bold text-[#215ba6] dark:text-white tracking-wide leading-tight">
            Waskita Karya<br />Infrastruktur<br />
            <span className="font-normal">IT Asset<br />Management</span>
          </span>
        </div>

        {/* Menu */}
        <nav className="mt-10 flex-1 flex flex-col space-y-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              (isActive
                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                : "text-gray-800 dark:text-gray-100") +
              " flex items-center px-6 py-3 text-lg font-medium rounded-r-full transition"
            }
          >
            <BsBarChart className="mr-4" /> Dashboard
          </NavLink>

          <NavLink
            to="/devices"
            className={({ isActive }) =>
              (isActive
                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                : "text-gray-800 dark:text-gray-100") +
              " flex items-center px-6 py-3 text-lg font-medium rounded-r-full transition"
            }
          >
            <BsCpu className="mr-4" /> Devices
          </NavLink>

          <NavLink
            to="/peripheral"
            className={({ isActive }) =>
              (isActive
                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                : "text-gray-800 dark:text-gray-100") +
              " flex items-center px-6 py-3 text-lg font-medium rounded-r-full transition"
            }
          >
            <BsPlug className="mr-4" /> Peripheral
          </NavLink>

          <NavLink
            to="/licenses"
            className={({ isActive }) =>
              (isActive
                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                : "text-gray-800 dark:text-gray-100") +
              " flex items-center px-6 py-3 text-lg font-medium rounded-r-full transition"
            }
          >
            <BsShieldCheck className="mr-4" /> Licenses
          </NavLink>

          {/* Helpdesk dropdown — route tetap dilindungi guard, menu selalu tampil */}
          <button
            className={
              "flex items-center px-6 py-3 text-lg font-medium rounded-r-full transition focus:outline-none w-full " +
              (location.pathname.startsWith("/helpdesk")
                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                : "text-gray-800 dark:text-gray-100")
            }
            onClick={() => setHelpdeskOpen((o) => !o)}
          >
            <BsHeadset className="mr-4" />
            Helpdesk
            {helpdeskOpen ? <BsChevronUp className="ml-auto" /> : <BsChevronDown className="ml-auto" />}
          </button>
          {helpdeskOpen && (
            <div className="ml-8 flex flex-col">
              <NavLink
                to="/helpdesk/entry"
                className={({ isActive }) =>
                  (isActive
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                    : "text-gray-800 dark:text-gray-100") +
                  " px-3 py-2 text-base rounded-lg transition"
                }
              >
                Ticket Entry
              </NavLink>
              <NavLink
                to="/helpdesk/solved"
                className={({ isActive }) =>
                  (isActive
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                    : "text-gray-800 dark:text-gray-100") +
                  " px-3 py-2 text-base rounded-lg transition"
                }
              >
                Ticket Solved
              </NavLink>
            </div>
          )}

          {/* Charts dropdown */}
          <button
            className={
              "flex items-center px-6 py-3 text-lg font-medium rounded-r-full transition focus:outline-none w-full " +
              (location.pathname.startsWith("/charts")
                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                : "text-gray-800 dark:text-gray-100")
            }
            onClick={() => setChartsOpen((o) => !o)}
          >
            <BsBarChart className="mr-4" />
            Charts
            {chartsOpen ? <BsChevronUp className="ml-auto" /> : <BsChevronDown className="ml-auto" />}
          </button>
          {chartsOpen && (
            <div className="ml-8 flex flex-col">
              <NavLink
                to="/charts/license"
                className={({ isActive }) =>
                  (isActive
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                    : "text-gray-800 dark:text-gray-100") +
                  " px-3 py-2 text-base rounded-lg transition"
                }
              >
                License Chart
              </NavLink>
              <NavLink
                to="/charts/device"
                className={({ isActive }) =>
                  (isActive
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                    : "text-gray-800 dark:text-gray-100") +
                  " px-3 py-2 text-base rounded-lg transition"
                }
              >
                Device Chart
              </NavLink>
              <NavLink
                to="/charts/peripheral"
                className={({ isActive }) =>
                  (isActive
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                    : "text-gray-800 dark:text-gray-100") +
                  " px-3 py-2 text-base rounded-lg transition"
                }
              >
                Peripheral Chart
              </NavLink>
            </div>
          )}

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              (isActive
                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                : "text-gray-800 dark:text-gray-100") +
              " flex items-center px-6 py-3 text-lg font-medium rounded-r-full transition"
            }
          >
            <BsGear className="mr-4" /> Settings
          </NavLink>
        </nav>

        {/* Footer: Dark Mode + UserMenu (Logout) */}
        <div className="p-4 mt-auto flex flex-col gap-3">
          <div className="flex items-center justify-center">
            <button
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              onClick={toggleDark}
              title="Toggle tema"
            >
              {dark ? <FaRegSun size={21} /> : <FaRegMoon size={20} />}
            </button>
            <span className="ml-3 text-sm text-gray-600 dark:text-gray-300">
              {dark ? "Light" : "Dark"} Mode
            </span>
          </div>
          <div className="flex justify-center">
            <UserMenu />
          </div>
        </div>
      </div>
    </aside>
  );
}
