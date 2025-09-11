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
  FaBoxOpen
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";

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

export default function Dashboard() {
  const { dark: darkMode } = useTheme();
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();

  const [deviceData, setDeviceData] = useState([]);
  const [peripheralData, setPeripheralData] = useState([]);
  const [licenseData, setLicenseData] = useState([]);
  const [loading, setLoading] = useState(true);
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
    }
  }

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

  // ---- NAV ----
  const goTo = (url) => navigate(url);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`px-6 py-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">IT Asset Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Manajemen aset TI terintegrasi</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {new Date().toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <OverviewCard 
            title="Total Devices" 
            value={stats.totalDevices} 
            icon={<FaDesktop className="text-blue-500" />}
            color="blue"
            darkMode={darkMode}
          />
          <OverviewCard 
            title="Total Peripheral" 
            value={stats.totalPeripherals} 
            icon={<FaPlug className="text-green-500" />}
            color="green"
            darkMode={darkMode}
          />
          <OverviewCard 
            title="Total Licenses" 
            value={stats.totalLicenses} 
            icon={<FaIdBadge className="text-purple-500" />}
            color="purple"
            darkMode={darkMode}
          />
          <OverviewCard 
            title="Perbaikan" 
            value={stats.devicesNeedingRepair} 
            icon={<FaTools className="text-orange-500" />}
            color="orange"
            darkMode={darkMode}
          />
          <OverviewCard 
            title="Stok Habis" 
            value={stats.zeroStockItems} 
            icon={<FaBoxOpen className="text-red-500" />}
            color="red"
            darkMode={darkMode}
          />
          <OverviewCard 
            title="License Warning" 
            value={stats.licenseWarnings} 
            icon={<FaExclamationTriangle className="text-yellow-500" />}
            color="yellow"
            darkMode={darkMode}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Device Status Chart */}
            <div className={`rounded-xl p-6 shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center">
                  <FaChartPie className="mr-2 text-blue-500" />
                  Status Perangkat
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">{deviceData.length} perangkat</span>
              </div>
              <div className="flex flex-col md:flex-row items-center">
                <PieChart pieData={pieData} />
                <div className="mt-4 md:mt-0 md:ml-6 w-full space-y-3">
                  {pieData.map(s => (
                    <div key={s.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <div className="flex items-center">
                        <span className="text-lg mr-3">{s.icon}</span>
                        <span className="text-sm">{s.name}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium mr-2">{s.value}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          {Math.round((s.value / deviceData.length) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className={`rounded-xl p-6 shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center gap-2 mb-6">
                <FaListUl className="text-blue-500" />
                <h2 className="text-lg font-semibold">Aktivitas Terakhir</h2>
              </div>
              <div className="space-y-4">
                {latestActivities.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">Belum ada aktivitas</p>
                ) : (
                  latestActivities.map((act, i) => (
                    <div key={i} className="flex items-start p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <div className="flex-shrink-0 pt-1">
                        <div className={`h-3 w-3 rounded-full ${
                          act.type === 'device' ? 'bg-blue-500' : 'bg-green-500'
                        }`}></div>
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium">{act.text}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {act.waktu ? new Date(act.waktu).toLocaleString("id-ID") : "Waktu tidak tersedia"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Notifications */}
            <div className={`rounded-xl p-6 shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center gap-2 mb-6">
                <FaBell className="text-yellow-500" />
                <h2 className="text-lg font-semibold">Notifikasi</h2>
                {(notifPerluPerbaikan || notifLicenseWarning || notifPeripheralHabis) && (
                  <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                    {[notifPerluPerbaikan, notifLicenseWarning, notifPeripheralHabis].filter(Boolean).length}
                  </span>
                )}
              </div>
              <div className="space-y-4">
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
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="text-gray-500 dark:text-gray-400">Tidak ada notifikasi</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Semua sistem berjalan normal</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className={`rounded-xl p-6 shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-lg font-semibold mb-6">Akses Cepat</h2>
              <div className="grid grid-cols-2 gap-3">
                <QuickActionButton 
                  title="Devices"
                  icon={<FaDesktop />}
                  onClick={() => navigate("/devices")}
                  color="blue"
                  darkMode={darkMode}
                />
                <QuickActionButton 
                  title="Peripheral"
                  icon={<FaPlug />}
                  onClick={() => navigate("/peripheral")}
                  color="green"
                  darkMode={darkMode}
                />
                <QuickActionButton 
                  title="Licenses"
                  icon={<FaIdBadge />}
                  onClick={() => navigate("/licenses")}
                  color="purple"
                  darkMode={darkMode}
                />
                <QuickActionButton 
                  title="Helpdesk"
                  icon={<FaTools />}
                  onClick={() => navigate("/helpdesk/entry")}
                  color="orange"
                  darkMode={darkMode}
                />
              </div>
            </div>
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
    <div className={`p-4 rounded-xl shadow-sm ${
      darkMode 
        ? `bg-gray-800 hover:bg-gray-750 ${colorClasses[color].darkBg}` 
        : `bg-white hover:bg-gray-50 ${colorClasses[color].bg}`
    } transition-colors duration-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {title}
          </p>
          <p className={`text-2xl font-bold ${
            darkMode ? colorClasses[color].darkText : colorClasses[color].text
          }`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-full ${
          darkMode ? 'bg-gray-700' : 'bg-white'
        }`}>
          {icon}
        </div>
      </div>
    </div>
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
    <div className={`p-4 rounded-lg border ${typeStyles[type].bg} ${typeStyles[type].border}`}>
      <div className="flex items-start">
        <span className="text-xl mr-3">{typeStyles[type].icon}</span>
        <div className="flex-1">
          <p className={`font-medium ${typeStyles[type].text}`}>{title}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{content}</p>
        </div>
      </div>
    </div>
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
    <button
      onClick={onClick}
      className={`p-4 rounded-xl text-white ${colorClasses[color].bg} ${colorClasses[color].hover} transition-colors duration-200 flex flex-col items-center justify-center`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <span className="text-sm font-medium">{title}</span>
    </button>
  );
}

// --- Pie Chart Custom
function PieChart({ pieData }) {
  const total = pieData.reduce((sum, s) => sum + s.value, 0) || 1;
  let cumulative = 0;
  const radius = 50, cx = 60, cy = 60;
  
  return (
    <svg width={120} height={120} viewBox="0 0 120 120" className="flex-shrink-0">
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
          />
        );
      })}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={2} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="bold" fill="currentColor">
        {total}
      </text>
    </svg>
  );
}