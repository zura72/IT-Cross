// src/components/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BsBarChart, 
  BsCpu, 
  BsPlug, 
  BsGear,
  BsShieldCheck, 
  BsChevronDown, 
  BsChevronUp, 
  BsHeadset,
  BsBoxArrowRight, 
  BsPersonCircle,
  BsHouse,
  BsListCheck
} from "react-icons/bs";
import { FaRegMoon, FaRegSun } from "react-icons/fa";
import { useMsal } from "@azure/msal-react";
import { useTheme } from "../context/ThemeContext"; // PERBAIKI IMPORT PATH

export default function Sidebar() {
  const [chartsOpen, setChartsOpen] = useState(false);
  const [helpdeskOpen, setHelpdeskOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const user = accounts[0] || {};
  
  // Gunakan useTheme() untuk mengakses state dark mode global
  const { dark, toggleDark } = useTheme();

  useEffect(() => {
    if (location.pathname.startsWith("/charts")) setChartsOpen(true);
    if (location.pathname.startsWith("/helpdesk")) setHelpdeskOpen(true);
  }, [location.pathname]);

  const handleLogout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: "/"
    });
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  return (
    <aside
      className={`
        w-64 h-screen sticky top-0 z-20 transition-all
        bg-white dark:bg-gray-900
        text-gray-900 dark:text-white
        border-r border-gray-200 dark:border-gray-700
        shadow-lg
      `}
    >
      <div className="flex flex-col h-full w-64">
        {/* Logo + Judul */}
        <div className="flex items-center justify-center mt-8 mb-2 px-4">
          <img
            src="/logo-wki.png"
            alt="Waskita Infrastruktur Logo"
            className="h-12 w-12 rounded-full shadow-md bg-white object-contain p-1"
          />
          <span className="ml-4 text-xl font-bold text-[#215ba6] dark:text-white tracking-wide leading-tight">
            Waskita Karya<br />Infrastruktur<br />
            <span className="font-normal text-sm">IT Asset Management</span>
          </span>
        </div>

        {/* Menu */}
        <nav className="mt-8 flex-1 flex flex-col space-y-1 px-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              (isActive
                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-r-4 border-blue-500"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800") +
              " flex items-center px-6 py-3 text-base font-medium rounded-lg transition-all mx-2"
            }
          >
            <BsHouse className="mr-4" /> Dashboard
          </NavLink>

          <NavLink
            to="/devices"
            className={({ isActive }) =>
              (isActive
                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-r-4 border-blue-500"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800") +
              " flex items-center px-6 py-3 text-base font-medium rounded-lg transition-all mx-2"
            }
          >
            <BsCpu className="mr-4" /> Devices
          </NavLink>

          <NavLink
            to="/peripheral"
            className={({ isActive }) =>
              (isActive
                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-r-4 border-blue-500"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800") +
              " flex items-center px-6 py-3 text-base font-medium rounded-lg transition-all mx-2"
            }
          >
            <BsPlug className="mr-4" /> Peripheral
          </NavLink>

          <NavLink
            to="/licenses"
            className={({ isActive }) =>
              (isActive
                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-r-4 border-blue-500"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800") +
              " flex items-center px-6 py-3 text-base font-medium rounded-lg transition-all mx-2"
            }
          >
            <BsShieldCheck className="mr-4" /> Licenses
          </NavLink>

          {/* Helpdesk dropdown */}
          <div className="mx-2">
            <button
              className={
                "flex items-center px-6 py-3 text-base font-medium rounded-lg transition-all w-full " +
                (location.pathname.startsWith("/helpdesk")
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-r-4 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800")
              }
              onClick={() => setHelpdeskOpen((o) => !o)}
            >
              <BsHeadset className="mr-4" />
              Helpdesk
              {helpdeskOpen ? <BsChevronUp className="ml-auto" /> : <BsChevronDown className="ml-auto" />}
            </button>
            {helpdeskOpen && (
              <div className="ml-6 mt-1 flex flex-col space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                <NavLink
                  to="/helpdesk/entry"
                  className={({ isActive }) =>
                    (isActive
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800") +
                    " px-4 py-2 text-sm rounded-lg transition"
                  }
                >
                  Ticket Entry
                </NavLink>
                <NavLink
                  to="/helpdesk/solved"
                  className={({ isActive }) =>
                    (isActive
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800") +
                    " px-4 py-2 text-sm rounded-lg transition"
                  }
                >
                  Ticket Solved
                </NavLink>
              </div>
            )}
          </div>

          {/* Charts dropdown */}
          <div className="mx-2">
            <button
              className={
                "flex items-center px-6 py-3 text-base font-medium rounded-lg transition-all w-full " +
                (location.pathname.startsWith("/charts")
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-r-4 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800")
              }
              onClick={() => setChartsOpen((o) => !o)}
            >
              <BsBarChart className="mr-4" />
              Charts
              {chartsOpen ? <BsChevronUp className="ml-auto" /> : <BsChevronDown className="ml-auto" />}
            </button>
            {chartsOpen && (
              <div className="ml-6 mt-1 flex flex-col space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                <NavLink
                  to="/charts/license"
                  className={({ isActive }) =>
                    (isActive
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800") +
                    " px-4 py-2 text-sm rounded-lg transition"
                  }
                >
                  License Chart
                </NavLink>
                <NavLink
                  to="/charts/device"
                  className={({ isActive }) =>
                    (isActive
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800") +
                    " px-4 py-2 text-sm rounded-lg transition"
                  }
                >
                  Device Chart
                </NavLink>
                <NavLink
                  to="/charts/peripheral"
                  className={({ isActive }) =>
                    (isActive
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800") +
                    " px-4 py-2 text-sm rounded-lg transition"
                  }
                >
                  Peripheral Chart
                </NavLink>
              </div>
            )}
          </div>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              (isActive
                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-r-4 border-blue-500"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800") +
              " flex items-center px-6 py-3 text-base font-medium rounded-lg transition-all mx-2"
            }
          >
            <BsGear className="mr-4" /> Settings
          </NavLink>
        </nav>

        {/* Footer: User Info + Dark Mode + Logout */}
        <div className="p-4 mt-auto border-t border-gray-200 dark:border-gray-700">
          {/* User Info */}
          <div className="flex items-center mb-4 p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            <BsPersonCircle className="text-gray-600 dark:text-gray-300 text-xl mr-2" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                {user.name || "User"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.username || user.email || "user@waskita.com"}
              </p>
            </div>
            <button
              onClick={toggleUserMenu}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              {userMenuOpen ? <BsChevronUp /> : <BsChevronDown />}
            </button>
          </div>

          {/* User Menu Dropdown */}
          {userMenuOpen && (
            <div className="mb-4 p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <button
                onClick={() => navigate("/profile")}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition"
              >
                📋 Profil Saya
              </button>
              <button
                onClick={() => navigate("/settings")}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition"
              >
                ⚙️ Pengaturan
              </button>
            </div>
          )}

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between mb-3 p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            <div className="flex items-center">
              {dark ? (
                <FaRegSun className="text-yellow-500 mr-2" />
              ) : (
                <FaRegMoon className="text-gray-600 mr-2" />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {dark ? "Light Mode" : "Dark Mode"}
              </span>
            </div>
            <button
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                dark ? "bg-blue-600" : "bg-gray-300"
              }`}
              onClick={toggleDark}
              aria-label="Toggle dark mode"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  dark ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50 transition"
          >
            <BsBoxArrowRight className="mr-2" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}