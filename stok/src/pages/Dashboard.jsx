// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import { 
  FaDesktop, 
  FaPlug, 
  FaIdBadge, 
  FaBell, 
  FaListUl,
  FaChartPie,
  FaExclamationTriangle,
  FaTools,
  FaBoxOpen,
  FaSync,
  FaChevronRight
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

// Mapping warna untuk status device
const statusMap = {
  "DIPAKAI": { color: "#10b981", label: "Dipakai", icon: "🟢" },
  "SPARE": { color: "#f59e0b", label: "Spare", icon: "🟡" },
  "RUSAK": { color: "#ef4444", label: "Rusak", icon: "🔴" },
  "HILANG": { color: "#8b5cf6", label: "Hilang", icon: "🟣" },
  "TERSEDIA": { color: "#3b82f6", label: "Tersedia", icon: "🔵" },
  "PERBAIKAN": { color: "#f97316", label: "Perbaikan", icon: "🟠" },
  "(KOSONG)": { color: "#9ca3af", label: "Unknown", icon: "⚫" }
};

const defaultStatusColor = "#d1d5db";

// Config
const deviceSiteId = "waskitainfra.sharepoint.com,32252c41-8aed-4ed2-ba35-b6e2731b0d4a,fb2ae80c-1283-4942-a3e8-0d47e8d004fb";
const deviceListId = "95880dbf-54dc-4bbb-a438-d6519941a409";
const peripheralSiteId = "waskitainfra.sharepoint.com,82f98496-0de9-45f8-9b3e-30bbfd2838fe,a097be9c-086d-41bd-9afb-5b1a095f2705";
const peripheralListId = "dae749d2-2fd1-4a05-bd16-a69194eb0341";
const GRAPH_SCOPE = ["Sites.Read.All", "Directory.Read.All"];

// GlassCard Component
const GlassCard = ({ children, className = '', darkMode }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-2xl backdrop-blur-lg border border-opacity-20 
      ${darkMode 
        ? 'bg-gray-800/70 border-gray-600' 
        : 'bg-white/80 border-gray-300'
      } 
      shadow-xl ${className}`}
  >
    {children}
  </motion.div>
);

export default function Dashboard() {
  const { dark: darkMode } = useTheme();
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();

  const [deviceData, setDeviceData] = useState([]);
  const [peripheralData, setPeripheralData] = useState([]);
  const [licenseData, setLicenseData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalDevices: 0,
    totalPeripherals: 0,
    totalLicenses: 0,
    devicesNeedingRepair: 0,
    zeroStockItems: 0,
    licenseWarnings: 0
  });

  useEffect(() => {
    if (accounts.length) fetchAll();
    // eslint-disable-next-line
  }, [accounts.length]);

  async function fetchAll() {
    try {
      setLoading(true);
      const account = accounts[0];
      const tokenResp = await instance.acquireTokenSilent({
        scopes: GRAPH_SCOPE,
        account
      });
      const token = tokenResp.accessToken;

      let devRes = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${deviceSiteId}/lists/${deviceListId}/items?expand=fields`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      let devJson = await devRes.json();
      setDeviceData(Array.isArray(devJson.value) ? devJson.value : []);

      let perRes = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${peripheralSiteId}/lists/${peripheralListId}/items?expand=fields`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      let perJson = await perRes.json();
      setPeripheralData(Array.isArray(perJson.value) ? perJson.value : []);

      let licRes = await fetch(
        `https://graph.microsoft.com/v1.0/subscribedSkus`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      let licJson = await licRes.json();
      setLicenseData(Array.isArray(licJson.value) ? licJson.value : []);

    } catch (err) {
      console.error("Gagal load dashboard: ", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  useEffect(() => {
    // Calculate statistics
    const statusGroups = {};
    deviceData.forEach(d => {
      const s = (d.fields?.Status || "(KOSONG)").toUpperCase();
      if (!statusGroups[s]) statusGroups[s] = [];
      statusGroups[s].push(d);
    });

    const zeroStockPeripheral = peripheralData.filter(d => (d.fields?.field_2 ?? 1) <= 0);
    const licenseWarning = licenseData.filter(l => l.prepaidUnits?.warning > 0);
    const devicesNeedingRepair = statusGroups["PERBAIKAN"]?.length || 0;

    setStats({
      totalDevices: deviceData.length,
      totalPeripherals: peripheralData.length,
      totalLicenses: licenseData.length,
      devicesNeedingRepair,
      zeroStockItems: zeroStockPeripheral.length,
      licenseWarnings: licenseWarning.length
    });
  }, [deviceData, peripheralData, licenseData]);

  // ---- Devices multi status ----
  const statusGroups = {};
  deviceData.forEach(d => {
    const s = (d.fields?.Status || "(KOSONG)").toUpperCase();
    if (!statusGroups[s]) statusGroups[s] = [];
    statusGroups[s].push(d);
  });
  const allStatusKeys = Object.keys(statusGroups);

  // ---- Peripheral ----
  const totalPeripheral = peripheralData.length;
  const zeroStockPeripheral = peripheralData.filter(d => (d.fields?.field_2 ?? 1) <= 0);

  // ---- License ----
  const totalLicense = licenseData.length;
  const licenseWarning = licenseData.filter(l => l.prepaidUnits?.warning > 0);

  // ---- Pie chart data ----
  const pieData = allStatusKeys.map(st => ({
    key: st,
    name: statusMap[st]?.label || st,
    value: statusGroups[st].length,
    color: statusMap[st]?.color || defaultStatusColor,
    icon: statusMap[st]?.icon || "⚫"
  }));

  // ---- Notifikasi ----
  const notifPerluPerbaikan = statusGroups["PERBAIKAN"]?.map(d => d.fields.Title).join(", ") || "";
  const notifPeripheralHabis = zeroStockPeripheral.map(p => p.fields.Title).join(", ");
  const notifLicenseWarning = licenseWarning.map(l => l.skuPartNumber + " (" + l.prepaidUnits.warning + ")").join(", ");

  // ---- Aktivitas terakhir ----
  function getLatestActivity() {
    let activities = [
      ...deviceData.map(d => ({
        waktu: d.fields?.Modified,
        text: "Update device " + (d.fields?.Title || ""),
        type: "device"
      })),
      ...peripheralData.map(d => ({
        waktu: d.fields?.Modified,
        text: "Update peripheral " + (d.fields?.Title || ""),
        type: "peripheral"
      }))
    ];
    return activities
      .filter(a => a.waktu)
      .sort((a, b) => new Date(b.waktu) - new Date(a.waktu))
      .slice(0, 5);
  }
  const latestActivities = getLatestActivity();

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"
          ></motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-gray-600 dark:text-gray-300"
          >
            Memuat data...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'dark bg-gradient-to-br from-gray-900 to-gray-800 text-white' : 'bg-gradient-to-br from-blue-50 to-gray-100 text-gray-900'} px-2 sm:px-4 py-4`}>
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`px-4 py-3 sm:px-6 sm:py-4 rounded-xl mb-4 ${darkMode ? 'bg-gray-800' : 'bg-blue-600 text-white'} shadow-lg`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div className="mb-3 sm:mb-0">
            <h1 className="text-xl sm:text-2xl font-bold">IT Asset Dashboard</h1>
            <p className="text-xs sm:text-sm opacity-80">Manajemen aset TI terintegrasi</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 self-end sm:self-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={refreshing}
              className={`p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-white/20'} transition-colors flex items-center`}
            >
              <motion.div
                animate={{ rotate: refreshing ? 360 : 0 }}
                transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: "linear" }}
              >
                <FaSync className={refreshing ? "text-blue-400" : darkMode ? "text-gray-300" : "text-white"} size={16} />
              </motion.div>
            </motion.button>
            <div className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs ${darkMode ? 'bg-gray-700' : 'bg-white/20'}`}>
              {new Date().toLocaleDateString('id-ID', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-1 sm:px-2 py-2">
        {/* Overview Cards */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6"
        >
          <OverviewCard 
            title="Total Devices" 
            value={stats.totalDevices} 
            icon={<FaDesktop className="text-blue-500" size={16} />}
            color="blue"
            darkMode={darkMode}
          />
          <OverviewCard 
            title="Total Peripheral" 
            value={stats.totalPeripherals} 
            icon={<FaPlug className="text-green-500" size={16} />}
            color="green"
            darkMode={darkMode}
          />
          <OverviewCard 
            title="Total Licenses" 
            value={stats.totalLicenses} 
            icon={<FaIdBadge className="text-purple-500" size={16} />}
            color="purple"
            darkMode={darkMode}
          />
          <OverviewCard 
            title="Perbaikan" 
            value={stats.devicesNeedingRepair} 
            icon={<FaTools className="text-orange-500" size={16} />}
            color="orange"
            darkMode={darkMode}
          />
          <OverviewCard 
            title="Stok Habis" 
            value={stats.zeroStockItems} 
            icon={<FaBoxOpen className="text-red-500" size={16} />}
            color="red"
            darkMode={darkMode}
          />
          <OverviewCard 
            title="License Warning" 
            value={stats.licenseWarnings} 
            icon={<FaExclamationTriangle className="text-yellow-500" size={16} />}
            color="yellow"
            darkMode={darkMode}
          />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* Left Column */}
          <div className="space-y-3 sm:space-y-4">
            {/* Device Status Chart */}
            <GlassCard darkMode={darkMode} className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-semibold flex items-center">
                  <FaChartPie className="mr-2 text-blue-500" size={16} />
                  Status Perangkat
                </h2>
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{deviceData.length} perangkat</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center">
                <PieChart pieData={pieData} />
                <div className="mt-3 sm:mt-0 sm:ml-4 w-full space-y-2">
                  {pieData.map(s => (
                    <motion.div 
                      key={s.key} 
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center">
                        <span className="text-base mr-2">{s.icon}</span>
                        <span className="text-xs sm:text-sm">{s.name}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs sm:text-sm font-medium mr-1 sm:mr-2">{s.value}</span>
                        <span className={`px-1 sm:px-2 py-0.5 rounded-full text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          {Math.round((s.value / deviceData.length) * 100)}%
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </GlassCard>

            {/* Recent Activity */}
            <GlassCard darkMode={darkMode} className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-4">
                <FaListUl className="text-blue-500" size={16} />
                <h2 className="text-base sm:text-lg font-semibold">Aktivitas Terakhir</h2>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {latestActivities.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-3 text-sm">Belum ada aktivitas</p>
                ) : (
                  <AnimatePresence>
                    {latestActivities.map((act, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start p-2 sm:p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="flex-shrink-0 pt-1">
                          <div className={`h-2 w-2 sm:h-3 sm:w-3 rounded-full ${act.type === 'device' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">{act.text}</p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {act.waktu ? new Date(act.waktu).toLocaleString("id-ID") : "Waktu tidak tersedia"}
                          </p>
                        </div>
                        <FaChevronRight className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors self-center flex-shrink-0" size={12} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Right Column */}
          <div className="space-y-3 sm:space-y-4">
            {/* Notifications */}
            <GlassCard darkMode={darkMode} className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-4">
                <FaBell className="text-yellow-500" size={16} />
                <h2 className="text-base sm:text-lg font-semibold">Notifikasi</h2>
                {(notifPerluPerbaikan || notifLicenseWarning || notifPeripheralHabis) && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full"
                  >
                    {[notifPerluPerbaikan, notifLicenseWarning, notifPeripheralHabis].filter(Boolean).length}
                  </motion.span>
                )}
              </div>
              <div className="space-y-3">
                {notifPerluPerbaikan && (
                  <NotificationItem 
                    type="warning"
                    title="Device perlu perbaikan"
                    content={notifPerluPerbaikan}
                    darkMode={darkMode}
                  />
                )}
                
                {notifLicenseWarning && (
                  <NotificationItem 
                    type="danger"
                    title="License hampir habis"
                    content={notifLicenseWarning}
                    darkMode={darkMode}
                  />
                )}
                
                {notifPeripheralHabis && (
                  <NotificationItem 
                    type="info"
                    title="Peripheral stok habis"
                    content={notifPeripheralHabis}
                    darkMode={darkMode}
                  />
                )}
                
                {!notifPerluPerbaikan && !notifLicenseWarning && !notifPeripheralHabis && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-4 sm:py-6"
                  >
                    <div className="text-2xl sm:text-4xl mb-1 sm:mb-2">🎉</div>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Tidak ada notifikasi</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Semua sistem berjalan normal</p>
                  </motion.div>
                )}
              </div>
            </GlassCard>

            {/* Quick Actions */}
            <GlassCard darkMode={darkMode} className="p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-semibold mb-4">Akses Cepat</h2>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <QuickActionButton 
                  title="Devices"
                  icon={<FaDesktop size={14} />}
                  onClick={() => navigate("/devices")}
                  color="blue"
                  darkMode={darkMode}
                />
                <QuickActionButton 
                  title="Peripheral"
                  icon={<FaPlug size={14} />}
                  onClick={() => navigate("/peripheral")}
                  color="green"
                  darkMode={darkMode}
                />
                <QuickActionButton 
                  title="Licenses"
                  icon={<FaIdBadge size={14} />}
                  onClick={() => navigate("/licenses")}
                  color="purple"
                  darkMode={darkMode}
                />
                <QuickActionButton 
                  title="Helpdesk"
                  icon={<FaTools size={14} />}
                  onClick={() => navigate("/helpdesk/entry")}
                  color="orange"
                  darkMode={darkMode}
                />
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Overview Card Component
function OverviewCard({ title, value, icon, color, darkMode }) {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', darkBg: 'bg-blue-900/20', darkText: 'text-blue-400' },
    green: { bg: 'bg-green-100', text: 'text-green-600', darkBg: 'bg-green-900/20', darkText: 'text-green-400' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', darkBg: 'bg-purple-900/20', darkText: 'text-purple-400' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', darkBg: 'bg-orange-900/20', darkText: 'text-orange-400' },
    red: { bg: 'bg-red-100', text: 'text-red-600', darkBg: 'bg-red-900/20', darkText: 'text-red-400' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', darkBg: 'bg-yellow-900/20', darkText: 'text-yellow-400' }
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.05, y: -5 }}
      className={`p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-sm transition-all duration-300 ${
        darkMode 
          ? `bg-gray-800 hover:bg-gray-750 ${colorClasses[color].darkBg}` 
          : `bg-white hover:bg-gray-50 ${colorClasses[color].bg}`
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {title}
          </p>
          <p className={`text-lg sm:text-xl font-bold ${darkMode ? colorClasses[color].darkText : colorClasses[color].text}`}>
            {value}
          </p>
        </div>
        <motion.div 
          whileHover={{ rotate: 10 }}
          className={`p-1 sm:p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-white'}`}
        >
          {icon}
        </motion.div>
      </div>
    </motion.div>
  );
}

// --- Notification Item Component
function NotificationItem({ type, title, content, darkMode }) {
  const typeStyles = {
    warning: {
      icon: '🟠',
      bg: darkMode ? 'bg-orange-900/20' : 'bg-orange-50',
      border: darkMode ? 'border-orange-700' : 'border-orange-200',
      text: darkMode ? 'text-orange-300' : 'text-orange-800'
    },
    danger: {
      icon: '🔴',
      bg: darkMode ? 'bg-red-900/20' : 'bg-red-50',
      border: darkMode ? 'border-red-700' : 'border-red-200',
      text: darkMode ? 'text-red-300' : 'text-red-800'
    },
    info: {
      icon: '🔵',
      bg: darkMode ? 'bg-blue-900/20' : 'bg-blue-50',
      border: darkMode ? 'border-blue-700' : 'border-blue-200',
      text: darkMode ? 'text-blue-300' : 'text-blue-800'
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-3 rounded-lg border ${typeStyles[type].bg} ${typeStyles[type].border}`}
    >
      <div className="flex items-start">
        <span className="text-lg mr-2">{typeStyles[type].icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm ${typeStyles[type].text}`}>{title}</p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 truncate">{content}</p>
        </div>
      </div>
    </motion.div>
  );
}

// --- Quick Action Button Component
function QuickActionButton({ title, icon, onClick, color, darkMode }) {
  const colorClasses = {
    blue: { bg: 'bg-blue-500', hover: 'hover:bg-blue-600' },
    green: { bg: 'bg-green-500', hover: 'hover:bg-green-600' },
    purple: { bg: 'bg-purple-500', hover: 'hover:bg-purple-600' },
    orange: { bg: 'bg-orange-500', hover: 'hover:bg-orange-600' }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`p-2 sm:p-3 rounded-lg text-white ${colorClasses[color].bg} ${colorClasses[color].hover} transition-colors duration-200 flex flex-col items-center justify-center`}
    >
      <div className="text-lg sm:text-xl mb-1 sm:mb-2">{icon}</div>
      <span className="text-xs sm:text-sm font-medium">{title}</span>
    </motion.button>
  );
}

// --- Pie Chart Custom dengan Tooltip
function PieChart({ pieData }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const total = pieData.reduce((sum, s) => sum + s.value, 0) || 1;
  let cumulative = 0;
  const radius = 40, cx = 50, cy = 50;
  
  return (
    <div className="relative">
      <svg width={100} height={100} viewBox="0 0 100 100" className="flex-shrink-0">
        {pieData.map((s, i) => {
          if (s.value === 0) return null;
          
          const val = s.value / total;
          const start = cumulative;
          const end = cumulative + val;
          cumulative = end;
          
          const x1 = cx + radius * Math.cos(2 * Math.PI * start - Math.PI / 2);
          const y1 = cy + radius * Math.sin(2 * Math.PI * start - Math.PI / 2);
          const x2 = cx + radius * Math.cos(2 * Math.PI * end - Math.PI / 2);
          const y2 = cy + radius * Math.sin(2 * Math.PI * end - Math.PI / 2);
          
          const largeArc = val > 0.5 ? 1 : 0;
          const d = `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;
          
          return (
            <path 
              key={i} 
              d={d} 
              fill={s.color} 
              stroke="#fff" 
              strokeWidth={2}
              className="transition-all duration-300 cursor-pointer"
              style={{ opacity: activeIndex === null || activeIndex === i ? 1 : 0.7 }}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={2} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold" fill="currentColor">
          {total}
        </text>
      </svg>
      
      {/* Tooltip untuk pie chart */}
      {activeIndex !== null && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bg-gray-900 text-white p-2 rounded-lg text-xs shadow-lg z-10 hidden sm:block"
          style={{ 
            top: 0, 
            left: 110,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="font-semibold">{pieData[activeIndex].name}</div>
          <div>{pieData[activeIndex].value} perangkat</div>
          <div>{Math.round((pieData[activeIndex].value / total) * 100)}%</div>
        </motion.div>
      )}
    </div>
  );
}