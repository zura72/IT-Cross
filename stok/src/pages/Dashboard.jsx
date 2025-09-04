import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import { FaDesktop, FaPlug, FaIdBadge, FaBell, FaListUl } from "react-icons/fa";

// Mapping warna untuk status device (custom, tambahkan jika ada status baru)
const statusMap = {
  "DIPAKAI": { color: "#4ade80", label: "Dipakai" },
  "SPARE": { color: "#facc15", label: "Spare" },
  "RUSAK": { color: "#f87171", label: "Rusak" },
  "HILANG": { color: "#a78bfa", label: "Hilang" },
  "TERSEDIA": { color: "#60a5fa", label: "Tersedia" },
  "PERBAIKAN": { color: "#fb923c", label: "Perbaikan" },
  "(KOSONG)": { color: "#9ca3af", label: "Unknown" }
};
// Add warna default
const defaultStatusColor = "#d1d5db";

// Config
const deviceSiteId = "waskitainfra.sharepoint.com,32252c41-8aed-4ed2-ba35-b6e2731b0d4a,fb2ae80c-1283-4942-a3e8-0d47e8d004fb";
const deviceListId = "95880dbf-54dc-4bbb-a438-d6519941a409";
const peripheralSiteId = "waskitainfra.sharepoint.com,82f98496-0de9-45f8-9b3e-30bbfd2838fe,a097be9c-086d-41bd-9afb-5b1a095f2705";
const peripheralListId = "dae749d2-2fd1-4a05-bd16-a69194eb0341";
const GRAPH_SCOPE = ["Sites.Read.All", "Directory.Read.All"];

export default function Dashboard() {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();

  const [deviceData, setDeviceData] = useState([]);
  const [peripheralData, setPeripheralData] = useState([]);
  const [licenseData, setLicenseData] = useState([]);

  useEffect(() => {
    if (accounts.length) fetchAll();
    // eslint-disable-next-line
  }, [accounts.length]);

  async function fetchAll() {
    try {
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
      alert("Gagal load dashboard: " + err.message);
    }
  }

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
    color: statusMap[st]?.color || defaultStatusColor
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
        text: "Update device " + (d.fields?.Title || "")
      })),
      ...peripheralData.map(d => ({
        waktu: d.fields?.Modified,
        text: "Update peripheral " + (d.fields?.Title || "")
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

  return (
    <div className="relative min-h-screen flex flex-col items-center py-8">
      {/* --- BACKGROUND IMAGE FULL SCREEN --- */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: `
            linear-gradient(rgba(255, 255, 255, 0.36),rgba(45,30,90,0.27)),
            url('/dashboard-bg.jpg') center center / cover no-repeat
          `
        }}
      />
      {/* --- CONTENT di atas background --- */}
      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mb-6">
          {/* ...stat box & info, sama persis punyamu */}
          {/* Device Stats */}
          <StatBox
            icon={<FaDesktop />}
            value={deviceData.length}
            label="Devices"
            onClick={() => goTo("/devices")}
            sub={allStatusKeys.map(st => ({
              label: statusMap[st]?.label || st,
              value: statusGroups[st].length,
              color: statusMap[st]?.color || defaultStatusColor,
              box: statusGroups[st].length > 0 ? (
                <BoxList
                  items={statusGroups[st].map(d => d.fields.Title)}
                  title={`Daftar: ${statusMap[st]?.label || st}`}
                  color={statusMap[st]?.color || defaultStatusColor}
                />
              ) : null
            }))}
          />
          {/* Peripheral */}
          <StatBox
            icon={<FaPlug />}
            value={totalPeripheral}
            label="Peripheral"
            onClick={() => goTo("/peripheral")}
            sub={zeroStockPeripheral.length > 0 ? [
              {
                label: "Stok 0",
                value: zeroStockPeripheral.length,
                color: "#f87171",
                box: <BoxList items={zeroStockPeripheral.map(p => p.fields.Title)} title="Peripheral dengan stok 0" color="#f87171" />
              }
            ] : []}
          />
          {/* License */}
          <StatBox
            icon={<FaIdBadge />}
            value={totalLicense}
            label="Licenses"
            onClick={() => goTo("/licenses")}
            sub={licenseWarning.length > 0 ? [
              {
                label: "Warning",
                value: licenseWarning.length,
                color: "#f59e42",
                box: <BoxList items={licenseWarning.map(l => `${l.skuPartNumber} (sisa warning: ${l.prepaidUnits.warning})`)} title="License Hampir Habis" color="#f59e42" />
              }
            ] : []}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
          {/* Pie Chart */}
          <div className="col-span-1 bg-white/90 dark:bg-gray-900/90 rounded-2xl shadow-xl p-6 flex flex-col items-center">
            <div className="text-lg font-bold mb-2 text-[#215ba6] dark:text-white">Status Perangkat</div>
            <PieChart pieData={pieData} />
            <div className="mt-4 w-full">
              {pieData.map(s => (
                <div key={s.key} className="flex items-center mb-1">
                  <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ background: s.color }}></span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold mr-2" style={{ background: s.color + "22", color: s.color }}>
                    {s.name} ({s.value})
                  </span>
                  {s.value > 0 && (
                    <span className="ml-1 truncate text-xs text-gray-400 dark:text-gray-200">
                      {(statusGroups[s.key] || []).map(d => d.fields.Title).join(", ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Notifikasi */}
          <div className="col-span-1 bg-white/90 dark:bg-gray-900/90 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-2 text-lg font-bold mb-3 text-[#215ba6] dark:text-white">
              <FaBell /> Notifikasi
            </div>
            <ul className="list-disc ml-5 text-gray-700 dark:text-gray-200">
              {notifPerluPerbaikan && <li><b className="text-orange-500">Device perlu perbaikan:</b> {notifPerluPerbaikan}</li>}
              {notifLicenseWarning && <li><b className="text-orange-500">License hampir habis:</b> {notifLicenseWarning}</li>}
              {notifPeripheralHabis && <li><b className="text-red-500">Peripheral stok habis:</b> {notifPeripheralHabis}</li>}
              {!notifPerluPerbaikan && !notifLicenseWarning && !notifPeripheralHabis && (
                <li>Tidak ada notifikasi khusus.</li>
              )}
            </ul>
          </div>
          {/* Aktivitas Terakhir */}
          <div className="col-span-1 bg-white/90 dark:bg-gray-900/90 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-2 text-lg font-bold mb-3 text-[#215ba6] dark:text-white">
              <FaListUl /> Aktivitas Terakhir
            </div>
            {latestActivities.length === 0 ? (
              <div className="text-gray-400">Belum ada aktivitas.</div>
            ) : (
              <ul>
                {latestActivities.map((act, i) => (
                  <li key={i} className="mb-1 flex items-center">
                    <span className="inline-block bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100 px-2 py-0.5 rounded mr-2 text-xs font-bold">
                      {act.waktu ? new Date(act.waktu).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) : "--"}
                    </span>
                    {act.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Stat Box with Badge
function StatBox({ icon, value, label, sub = [], onClick }) {
  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 flex flex-col gap-2 items-start min-h-[170px] cursor-pointer border-2 border-transparent hover:border-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 transition"
      onClick={onClick}
      tabIndex={0}
      title={`Lihat detail ${label}`}
    >
      <div className="flex items-center gap-4">
        <span className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200 rounded-full p-3 text-3xl">{icon}</span>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-gray-600 dark:text-gray-200">{label}</div>
        </div>
      </div>
      {sub.length > 0 && (
        <div className="mt-2 w-full flex flex-col gap-2">
          {sub.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-1">
              <span className="inline-block min-w-[80px] text-xs font-bold px-2 py-0.5 rounded"
                style={{ background: (s.color || "#d1d5db") + "22", color: s.color || "#444" }}>
                {s.label}: {s.value}
              </span>
              {s.box && <div className="flex-1">{s.box}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Box List (scrollable)
function BoxList({ items, title, color }) {
  if (!items || !items.length) return null;
  return (
    <div className="rounded-xl p-3 mt-2 max-h-32 overflow-y-auto"
      style={{
        background: (color || "#d1d5db") + "13",
        border: `1.5px solid ${color || "#d1d5db"}`
      }}
    >
      <div className="text-xs font-bold mb-1" style={{ color: color || "#444" }}>{title}</div>
      <ul className="text-xs space-y-1" style={{ color: color || "#222" }}>
        {items.map((it, i) => (
          <li key={i}>• {it}</li>
        ))}
      </ul>
    </div>
  );
}

// --- Pie Chart Custom
function PieChart({ pieData }) {
  const total = pieData.reduce((sum, s) => sum + s.value, 0) || 1;
  let cumulative = 0;
  const radius = 50, cx = 60, cy = 60;
  return (
    <svg width={120} height={120}>
      {pieData.map((s, i) => {
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
          <path key={i} d={d} fill={s.color} stroke="#fff" strokeWidth={2}></path>
        );
      })}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#d1d5db" strokeWidth={2} />
    </svg>
  );
}
