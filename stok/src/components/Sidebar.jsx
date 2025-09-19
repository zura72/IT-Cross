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
  BsListCheck,
  BsShare,
  BsGraphUp,
  BsLaptop,
  BsKeyboard,
  BsKey,
  BsTicket,
  BsCheckCircle,
  BsMouse,
  BsXLg,
  BsList
} from "react-icons/bs";
import { FaRegMoon, FaRegSun } from "react-icons/fa";
import { useMsal } from "@azure/msal-react";
import { useTheme } from "../context/ThemeContext";

export default function Sidebar() {
  const [chartsOpen, setChartsOpen] = useState(false);
  const [helpdeskOpen, setHelpdeskOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeHover, setActiveHover] = useState(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const user = accounts[0] || {};
  
  const { dark, toggleDark } = useTheme();

  useEffect(() => {
    if (location.pathname.startsWith("/charts")) setChartsOpen(true);
    if (location.pathname.startsWith("/helpdesk")) setHelpdeskOpen(true);
    
    // Simulate logo loading
    const timer = setTimeout(() => {
      setLogoLoaded(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    // Close sidebar when route changes on mobile
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location]);

  const handleLogout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: "/"
    });
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-blue-600 text-white shadow-lg"
      >
        {sidebarOpen ? <BsXLg size={20} /> : <BsList size={20} />}
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen z-40 transition-all duration-300 ease-in-out
          bg-gradient-to-b from-white to-blue-50 
          dark:from-gray-900 dark:to-gray-800
          text-gray-900 dark:text-white
          border-r border-blue-100 dark:border-gray-700
          shadow-2xl
          flex flex-col
          overflow-hidden
          ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 w-64'}
        `}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-200/10 to-transparent pointer-events-none"></div>
        
        {/* Container utama dengan flex column dan justify-between */}
        <div className="flex flex-col h-full justify-between relative z-10">
          
          {/* Bagian atas: Logo dan Menu */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Logo dengan animasi */}
            <div 
              className="flex items-center justify-center mt-8 mb-6 px-4 transform transition-all duration-700"
              style={{
                transform: logoLoaded ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.95)',
                opacity: logoLoaded ? 1 : 0
              }}
              onMouseEnter={() => setActiveHover('logo')}
              onMouseLeave={() => setActiveHover(null)}
            >
              <div className="relative">
                {/* Outer glow */}
                <div className={`absolute -inset-3 bg-blue-200/30 dark:bg-blue-800/30 rounded-full blur-lg transition-all duration-500 ${
                  activeHover === 'logo' ? 'opacity-100 scale-110' : 'opacity-0 scale-100'
                }`}></div>
                
                {/* Logo container */}
                <div className={`relative rounded-2xl p-2 bg-gradient-to-br from-white to-blue-100 dark:from-gray-800 dark:to-gray-700 shadow-lg transition-all duration-500 ${
                  activeHover === 'logo' ? 'ring-4 ring-blue-300/50 dark:ring-blue-600/50 transform rotate-3' : 'ring-2 ring-blue-100/50 dark:ring-gray-600/50'
                }`}>
                  <img
                    src="/logo-wki.png"
                    alt="Waskita Infrastruktur Logo"
                    className="h-12 w-12 md:h-14 md:w-14 object-contain transition-all duration-500"
                    style={{
                      filter: activeHover === 'logo' ? 'drop-shadow(0 5px 10px rgba(33, 91, 166, 0.3))' : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                    }}
                  />
                </div>
              </div>
              
              <div className="ml-3 md:ml-4">
                <h1 className="text-lg md:text-xl font-bold text-[#215ba6] dark:text-white tracking-wide leading-tight transition-all duration-500">
                  <span className={`block transform transition-transform duration-500 ${
                    activeHover === 'logo' ? 'translate-x-1' : ''
                  }`}>Waskita Karya</span>
                  <span className={`block transform transition-transform duration-500 delay-75 ${
                    activeHover === 'logo' ? 'translate-x-2' : ''
                  }`}>Infrastruktur</span>
                </h1>
                <p className="font-normal text-xs md:text-sm text-gray-600 dark:text-gray-300 mt-1 transition-all duration-500">
                  IT Asset Management
                </p>
              </div>
            </div>

            {/* Menu Navigation */}
            <nav className="mt-4 flex-1 flex flex-col space-y-1 md:space-y-2 px-2 md:px-3 overflow-y-auto pb-4">
              {/* Dashboard */}
              <NavLink
                to="/"
                className={({ isActive }) =>
                  (isActive
                    ? "bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 text-blue-800 dark:text-blue-200 border-r-4 border-blue-500 shadow-inner transform scale-[1.02]"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-blue-100/80 dark:hover:from-gray-800 dark:hover:to-gray-700") +
                  " flex items-center px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-medium rounded-xl transition-all duration-300 mx-1 group relative overflow-hidden"
                }
              >
                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <BsHouse className="mr-3 md:mr-4 text-lg md:text-xl group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300 relative z-10" /> 
                <span className="group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300 relative z-10">Dashboard</span>
                
                {/* Active indicator */}
                <div className="absolute right-2 md:right-3 w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </NavLink>

              {/* Devices */}
              <NavLink
                to="/devices"
                className={({ isActive }) =>
                  (isActive
                    ? "bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 text-blue-800 dark:text-blue-200 border-r-4 border-blue-500 shadow-inner transform scale-[1.02]"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-blue-100/80 dark:hover:from-gray-800 dark:hover:to-gray-700") +
                  " flex items-center px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-medium rounded-xl transition-all duration-300 mx-1 group relative overflow-hidden"
                }
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <BsLaptop className="mr-3 md:mr-4 text-lg md:text-xl group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300 relative z-10" /> 
                <span className="group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300 relative z-10">Devices</span>
                <div className="absolute right-2 md:right-3 w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </NavLink>

              {/* Peripheral */}
              <NavLink
                to="/peripheral"
                className={({ isActive }) =>
                  (isActive
                    ? "bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 text-blue-800 dark:text-blue-200 border-r-4 border-blue-500 shadow-inner transform scale-[1.02]"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-blue-100/80 dark:hover:from-gray-800 dark:hover:to-gray-700") +
                  " flex items-center px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-medium rounded-xl transition-all duration-300 mx-1 group relative overflow-hidden"
                }
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <BsKeyboard className="mr-3 md:mr-4 text-lg md:text-xl group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300 relative z-10" /> 
                <span className="group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300 relative z-10">Peripheral</span>
                <div className="absolute right-2 md:right-3 w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </NavLink>

              {/* Licenses */}
              <NavLink
                to="/licenses"
                className={({ isActive }) =>
                  (isActive
                    ? "bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 text-blue-800 dark:text-blue-200 border-r-4 border-blue-500 shadow-inner transform scale-[1.02]"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-blue-100/80 dark:hover:from-gray-800 dark:hover:to-gray-700") +
                  " flex items-center px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-medium rounded-xl transition-all duration-300 mx-1 group relative overflow-hidden"
                }
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <BsKey className="mr-3 md:mr-4 text-lg md:text-xl group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300 relative z-10" /> 
                <span className="group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300 relative z-10">Licenses</span>
                <div className="absolute right-2 md:right-3 w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </NavLink>

              {/* Helpdesk dropdown */}
              <div className="mx-1">
                <button
                  className={
                    "flex items-center px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-medium rounded-xl transition-all duration-300 w-full group relative overflow-hidden " +
                    (location.pathname.startsWith("/helpdesk")
                      ? "bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 text-blue-800 dark:text-blue-200 border-r-4 border-blue-500 shadow-inner transform scale-[1.02]"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-blue-100/80 dark:hover:from-gray-800 dark:hover:to-gray-700")
                  }
                  onClick={() => setHelpdeskOpen((o) => !o)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <BsHeadset className="mr-3 md:mr-4 text-lg md:text-xl group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300 relative z-10" />
                  <span className="group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300 relative z-10">Helpdesk</span>
                  {helpdeskOpen ? (
                    <BsChevronUp className="ml-auto text-sm md:text-base transition-transform duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-300 relative z-10" />
                  ) : (
                    <BsChevronDown className="ml-auto text-sm md:text-base transition-transform duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-300 relative z-10" />
                  )}
                </button>
                {helpdeskOpen && (
                  <div className="ml-4 md:ml-6 mt-1 md:mt-2 flex flex-col space-y-1 md:space-y-2 border-l-2 border-blue-200 dark:border-blue-700 pl-3 md:pl-4 animate-fadeIn">
                    <NavLink
                      to="/helpdesk/entry"
                      className={({ isActive }) =>
                        (isActive
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-inner transform scale-[1.02]"
                          : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700") +
                        " px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-lg transition-all duration-300 transform hover:translate-x-1 flex items-center"
                      }
                    >
                      <BsTicket className="mr-2 text-sm md:text-base" />
                      Ticket Entry
                    </NavLink>
                    <NavLink
                      to="/helpdesk/solved"
                      className={({ isActive }) =>
                        (isActive
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-inner transform scale-[1.02]"
                          : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700") +
                        " px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-lg transition-all duration-300 transform hover:translate-x-1 flex items-center"
                      }
                    >
                      <BsCheckCircle className="mr-2 text-sm md:text-base" />
                      Ticket Solved
                    </NavLink>
                    <NavLink
                      to="/helpdesk/sharepoint"
                      className={({ isActive }) =>
                        (isActive
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-inner transform scale-[1.02]"
                          : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700") +
                        " px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-lg transition-all duration-300 transform hover:translate-x-1 flex items-center"
                      }
                    >
                      <BsShare className="mr-2 text-sm md:text-base" />
                      Data Sharepoint
                    </NavLink>
                  </div>
                )}
              </div>

              {/* Charts dropdown */}
              <div className="mx-1">
                <button
                  className={
                    "flex items-center px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-medium rounded-xl transition-all duration-300 w-full group relative overflow-hidden " +
                    (location.pathname.startsWith("/charts")
                      ? "bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 text-blue-800 dark:text-blue-200 border-r-4 border-blue-500 shadow-inner transform scale-[1.02]"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-blue-100/80 dark:hover:from-gray-800 dark:hover:to-gray-700")
                  }
                  onClick={() => setChartsOpen((o) => !o)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <BsBarChart className="mr-3 md:mr-4 text-lg md:text-xl group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300 relative z-10" />
                  <span className="group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300 relative z-10">Charts</span>
                  {chartsOpen ? (
                    <BsChevronUp className="ml-auto text-sm md:text-base transition-transform duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-300 relative z-10" />
                  ) : (
                    <BsChevronDown className="ml-auto text-sm md:text-base transition-transform duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-300 relative z-10" />
                  )}
                </button>
                {chartsOpen && (
                  <div className="ml-4 md:ml-6 mt-1 md:mt-2 flex flex-col space-y-1 md:space-y-2 border-l-2 border-blue-200 dark:border-blue-700 pl-3 md:pl-4 animate-fadeIn">
                    <NavLink
                      to="/charts/license"
                      className={({ isActive }) =>
                        (isActive
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-inner transform scale-[1.02]"
                          : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700") +
                        " px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-lg transition-all duration-300 transform hover:translate-x-1 flex items-center"
                      }
                    >
                      <BsKey className="mr-2 text-sm md:text-base" />
                      License Chart
                    </NavLink>
                    <NavLink
                      to="/charts/device"
                      className={({ isActive }) =>
                        (isActive
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-inner transform scale-[1.02]"
                          : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700") +
                        " px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-lg transition-all duration-300 transform hover:translate-x-1 flex items-center"
                      }
                    >
                      <BsLaptop className="mr-2 text-sm md:text-base" />
                      Device Chart
                    </NavLink>
                    <NavLink
                      to="/charts/peripheral"
                      className={({ isActive }) =>
                        (isActive
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-inner transform scale-[1.02]"
                          : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700") +
                        " px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-lg transition-all duration-300 transform hover:translate-x-1 flex items-center"
                      }
                    >
                      <BsMouse className="mr-2 text-sm md:text-base" />
                      Peripheral Chart
                    </NavLink>
                    <NavLink
                      to="/charts/helpdesk"
                      className={({ isActive }) =>
                        (isActive
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-inner transform scale-[1.02]"
                          : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700") +
                        " px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-lg transition-all duration-300 transform hover:translate-x-1 flex items-center"
                      }
                    >
                      <BsGraphUp className="mr-2 text-sm md:text-base" />
                      Helpdesk Chart
                    </NavLink>
                  </div>
                )}
              </div>

              {/* Settings */}
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  (isActive
                    ? "bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 text-blue-800 dark:text-blue-200 border-r-4 border-blue-500 shadow-inner transform scale-[1.02]"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-blue-100/80 dark:hover:from-gray-800 dark:hover:to-gray-700") +
                  " flex items-center px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-medium rounded-xl transition-all duration-300 mx-1 group relative overflow-hidden"
                }
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <BsGear className="mr-3 md:mr-4 text-lg md:text-xl group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300 relative z-10" /> 
                <span className="group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300 relative z-10">Settings</span>
                <div className="absolute right-2 md:right-3 w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </NavLink>
            </nav>
          </div>

          {/* Bagian bawah: User Info + Dark Mode + Logout dengan padding */}
          <div className="p-3 md:p-4 pb-4 md:pb-6 border-t border-blue-100/50 dark:border-gray-700/50 mt-auto bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm">
            {/* User Info */}
            <div 
              className="flex items-center mb-3 md:mb-4 p-2 md:p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 shadow-sm transition-all duration-300 hover:shadow-md cursor-pointer border border-blue-100/30 dark:border-gray-700/30"
              onClick={toggleUserMenu}
              onMouseEnter={() => setActiveHover('user')}
              onMouseLeave={() => setActiveHover(null)}
            >
              <div className="relative">
                <div className={`absolute -inset-1 md:-inset-2 bg-blue-200/30 dark:bg-blue-800/30 rounded-full blur transition-all duration-300 ${
                  activeHover === 'user' ? 'opacity-100 scale-110' : 'opacity-0 scale-100'
                }`}></div>
                <BsPersonCircle className="text-gray-600 dark:text-gray-300 text-lg md:text-xl mr-2 md:mr-3 transition-colors duration-300 relative z-10" 
                  style={{ color: activeHover === 'user' ? '#2563eb' : '' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-800 dark:text-white truncate transition-colors duration-300"
                  style={{ color: activeHover === 'user' ? '#2563eb' : '' }}>
                  {user.name || "User"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate transition-colors duration-300"
                  style={{ color: activeHover === 'user' ? '#3b82f6' : '' }}>
                  {user.username || user.email || "user@waskita.com"}
                </p>
              </div>
              <button
                className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors duration-300 relative z-10"
                style={{ color: activeHover === 'user' ? '#2563eb' : '' }}
              >
                {userMenuOpen ? <BsChevronUp className="text-sm md:text-base" /> : <BsChevronDown className="text-sm md:text-base" />}
              </button>
            </div>

            {/* User Menu Dropdown */}
            {userMenuOpen && (
              <div className="mb-3 md:mb-4 p-2 md:p-3 rounded-xl bg-white/90 dark:bg-gray-800/90 shadow-lg animate-fadeIn border border-blue-100/30 dark:border-gray-700/30 backdrop-blur-sm">
                <button
                  onClick={() => navigate("/profile")}
                  className="w-full text-left px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-300 flex items-center transform hover:translate-x-1"
                >
                  <BsPersonCircle className="mr-2 md:mr-3 text-sm md:text-base" />
                  Profil Saya
                </button>
                <button
                  onClick={() => navigate("/settings")}
                  className="w-full text-left px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-300 flex items-center transform hover:translate-x-1 mt-1 md:mt-2"
                >
                  <BsGear className="mr-2 md:mr-3 text-sm md:text-base" />
                  Pengaturan
                </button>
              </div>
            )}

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between mb-3 md:mb-4 p-2 md:p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 shadow-sm transition-all duration-300 hover:shadow-md border border-blue-100/30 dark:border-gray-700/30">
              <div className="flex items-center">
                {dark ? (
                  <FaRegSun className="text-yellow-500 mr-2 md:mr-3 text-sm md:text-base transition-colors duration-300" />
                ) : (
                  <FaRegMoon className="text-gray-600 mr-2 md:mr-3 text-sm md:text-base transition-colors duration-300" />
                )}
                <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300 transition-colors duration-300">
                  {dark ? "Light Mode" : "Dark Mode"}
                </span>
              </div>
              <button
                className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-all duration-500 ${
                  dark ? "bg-blue-600 shadow-lg" : "bg-gray-300"
                }`}
                onClick={toggleDark}
                aria-label="Toggle dark mode"
              >
                <span
                  className={`inline-block h-3 w-3 md:h-4 md:w-4 transform rounded-full bg-white transition-all duration-500 shadow-md ${
                    dark ? "translate-x-4 md:translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2 md:p-3 rounded-xl bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 text-red-700 dark:text-red-300 hover:from-red-200 hover:to-red-300 dark:hover:from-red-800/50 dark:hover:to-red-700/50 transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md border border-red-200/50 dark:border-red-800/30"
              onMouseEnter={() => setActiveHover('logout')}
              onMouseLeave={() => setActiveHover(null)}
            >
              <BsBoxArrowRight className="mr-1 md:mr-2 text-sm md:text-base transition-transform duration-300" 
                style={{ transform: activeHover === 'logout' ? 'translateX(-2px)' : 'none' }} />
              <span className="font-medium text-sm md:text-base">Logout</span>
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeIn {
            from { 
              opacity: 0; 
              transform: translateY(-10px) scale(0.95); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0) scale(1); 
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }
          
          /* Custom scrollbar for sidebar */
          nav::-webkit-scrollbar {
            width: 4px;
          }
          
          nav::-webkit-scrollbar-track {
            background: transparent;
          }
          
          nav::-webkit-scrollbar-thumb {
            background: rgba(59, 130, 246, 0.3);
            border-radius: 10px;
          }
          
          nav::-webkit-scrollbar-thumb:hover {
            background: rgba(59, 130, 246, 0.5);
          }
        `}</style>
      </aside>
    </>
  );
}