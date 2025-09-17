// src/pages/charts/ChartHelpdesk.jsx
import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  PieChart,
  Pie,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";
import { useMsal } from "@azure/msal-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaSync, 
  FaFilter, 
  FaChartBar, 
  FaChartPie, 
  FaChartLine, 
  FaChartArea,
  FaChevronDown,
  FaChevronUp
} from "react-icons/fa";

// Konfigurasi SharePoint
const siteId = "waskitainfra.sharepoint.com,32252c41-8aed-4ed2-ba35-b6e2731b0d4a,fb2ae80c-1283-4942-a3e8-0d47e8d004fb";
const TICKET_LIST_ID = "e4a152ba-ee6e-4e1d-9c74-04e8d32ea912";
const GRAPH_SCOPE = ["Sites.ReadWrite.All"];

// Warna untuk chart
const STATUS_COLORS = {
  "Open": "#FF8042",
  "In Progress": "#FFBB28", 
  "Resolved": "#00C49F",
  "Closed": "#0088FE",
  "Belum": "#FF8042",
  "Selesai": "#00C49F",
  "Pending": "#FFBB28"
};

const PRIORITY_COLORS = {
  "Low": "#00C49F",
  "Medium": "#FFBB28",
  "High": "#FF8042",
  "Urgent": "#FF0000",
  "Normal": "#FFBB28"
};

const CATEGORY_COLORS = {
  "Hardware": "#8884d8",
  "Software": "#82ca9d", 
  "Network": "#ffc658",
  "Other": "#ff8042"
};

// Custom shape untuk bar chart
const CustomBarShape = (props) => {
  const { fill, x, y, width, height } = props;
  
  return (
    <g>
      <rect 
        x={x} 
        y={y} 
        width={width} 
        height={height} 
        fill={fill}
        rx={6}
        ry={6}
        className="opacity-80 hover:opacity-100 transition-opacity"
      />
      <rect 
        x={x} 
        y={y} 
        width={width} 
        height={4} 
        fill={fill}
        filter="url(#lighten)"
      />
    </g>
  );
};

// Custom shape untuk pie chart
const CustomPieShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  
  const path = `
    M ${cx} ${cy}
    L ${cx + outerRadius * Math.cos(startAngle * Math.PI / 180)} ${cy + outerRadius * Math.sin(startAngle * Math.PI / 180)}
    A ${outerRadius} ${outerRadius} 0 ${endAngle - startAngle > 180 ? 1 : 0} 1 ${cx + outerRadius * Math.cos(endAngle * Math.PI / 180)} ${cy + outerRadius * Math.sin(endAngle * Math.PI / 180)}
    L ${cx} ${cy}
    Z
  `;
  
  return (
    <g>
      <path 
        d={path} 
        fill={fill}
        className="opacity-80 hover:opacity-100 transition-opacity"
        stroke="#fff"
        strokeWidth={2}
      />
    </g>
  );
};

export default function ChartHelpdesk() {
  const { instance, accounts } = useMsal();
  const [ticketData, setTicketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [chartType, setChartType] = useState("bar");
  const [timeRange, setTimeRange] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch data dari SharePoint
  useEffect(() => {
    fetchTicketData();
  }, []);

  async function fetchTicketData() {
    setLoading(true);
    try {
      const account = accounts?.[0];
      if (!account) throw new Error("Belum login MSAL");
      
      const tokenResp = await instance.acquireTokenSilent({ 
        scopes: GRAPH_SCOPE, 
        account 
      });
      const token = tokenResp.accessToken;

      // Query untuk mendapatkan data tiket
      const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${TICKET_LIST_ID}/items?expand=fields&$top=1000`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error("Gagal mengambil data tiket");
      
      const data = await response.json();
      const tickets = data.value || [];
      
      setTicketData(tickets.map(item => ({
        id: item.id,
        status: item.fields?.Status || "Unknown",
        priority: item.fields?.Priority || "Normal",
        category: item.fields?.TipeTicket || "Other",
        divisi: item.fields?.Divisi || "Umum",
        dateReported: item.fields?.DateReported,
        dateFinished: item.fields?.DateFinished,
        title: item.fields?.Title || "No Title"
      })));
      
    } catch (error) {
      console.error("Error fetching ticket data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Hitung statistik berdasarkan data
  const calculateStats = () => {
    const statusCount = {};
    const priorityCount = {};
    const categoryCount = {};
    const divisiCount = {};
    const monthlyData = {};

    // Filter data berdasarkan timeRange
    const filteredData = ticketData.filter(ticket => {
      if (timeRange === "month") {
        const ticketDate = new Date(ticket.dateReported);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return ticketDate >= monthAgo;
      } else if (timeRange === "week") {
        const ticketDate = new Date(ticket.dateReported);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return ticketDate >= weekAgo;
      }
      return true;
    });

    filteredData.forEach(ticket => {
      // Status count
      const status = ticket.status || "Unknown";
      statusCount[status] = (statusCount[status] || 0) + 1;

      // Priority count
      const priority = ticket.priority || "Normal";
      priorityCount[priority] = (priorityCount[priority] || 0) + 1;

      // Category count
      const category = ticket.category || "Other";
      categoryCount[category] = (categoryCount[category] || 0) + 1;

      // Divisi count
      const divisi = ticket.divisi || "Umum";
      divisiCount[divisi] = (divisiCount[divisi] || 0) + 1;

      // Monthly data
      if (ticket.dateReported) {
        const date = new Date(ticket.dateReported);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        monthlyData[monthYear] = (monthlyData[monthYear] || 0) + 1;
      }
    });

    // Format data untuk chart
    const statusData = Object.entries(statusCount).map(([name, value]) => ({
      name,
      value,
      color: STATUS_COLORS[name] || "#8884d8"
    }));

    const priorityData = Object.entries(priorityCount).map(([name, value]) => ({
      name,
      value,
      color: PRIORITY_COLORS[name] || "#8884d8"
    }));

    const categoryData = Object.entries(categoryCount).map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || "#8884d8"
    }));

    const monthlyChartData = Object.entries(monthlyData).map(([name, value]) => ({
      name,
      tickets: value
    }));

    // Data untuk radar chart (performance by division)
    const divisiPerformanceData = Object.entries(divisiCount).map(([name, value]) => ({
      subject: name.length > 10 ? name.substring(0, 10) + "..." : name,
      fullName: name,
      tickets: value,
      complete: Math.min(100, Math.round((value / filteredData.length) * 200))
    }));

    // Hitung statistik ringkas
    const totalTickets = filteredData.length;
    const resolvedTickets = statusCount["Selesai"] || 0;
    const inProgressTickets = statusCount["Pending"] || 0;
    const openTickets = statusCount["Belum"] || 0;
    const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;

    return {
      statusData,
      priorityData,
      categoryData,
      monthlyChartData,
      divisiPerformanceData,
      totalTickets,
      resolvedTickets,
      inProgressTickets,
      openTickets,
      resolutionRate
    };
  };

  const {
    statusData,
    priorityData,
    categoryData,
    monthlyChartData,
    divisiPerformanceData,
    totalTickets,
    resolvedTickets,
    inProgressTickets,
    openTickets,
    resolutionRate
  } = calculateStats();

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
        >
          <p className="font-bold text-gray-800 dark:text-white">{payload[0].payload.name || payload[0].payload.subject || label}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Jumlah: <span className="font-medium">{payload[0].value}</span>
          </p>
          {payload[0].payload.fullName && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Divisi: <span className="font-medium">{payload[0].payload.fullName}</span>
            </p>
          )}
        </motion.div>
      );
    }
    return null;
  };

  // Render chart berdasarkan tipe yang dipilih
  const renderCategoryChart = () => {
    switch(chartType) {
      case "bar":
        return (
          <BarChart data={categoryData}>
            <defs>
              <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="100%" stopColor="#8884d8" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" shape={<CustomBarShape />} radius={[6, 6, 0, 0]}>
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#colorBar)`} />
              ))}
            </Bar>
          </BarChart>
        );
      case "area":
        return (
          <AreaChart data={categoryData}>
            <defs>
              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="value" stroke="#8884d8" fill="url(#colorArea)" />
          </AreaChart>
        );
      case "radar":
        return (
          <RadarChart data={divisiPerformanceData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis />
            <Tooltip content={<CustomTooltip />} />
            <Radar name="Performance" dataKey="tickets" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
          </RadarChart>
        );
      default:
        return (
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value">
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        );
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex items-center justify-center h-96">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Memuat data tiket...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl"
    >
      {/* Header dengan kontrol */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#215ba6] dark:text-white mb-1">
            Helpdesk Analytics Dashboard
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Visualisasi data tiket helpdesk dari SharePoint
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchTicketData}
            className="px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center gap-2"
          >
            <FaSync className="text-xs" /> Refresh
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <FaFilter className="text-xs" /> Filter {showFilters ? <FaChevronUp /> : <FaChevronDown />}
          </motion.button>
        </div>
      </div>

      {/* Panel Filter */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Status</label>
                <select 
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Semua Status</option>
                  <option value="Belum">Belum Ditangani</option>
                  <option value="Pending">Dalam Proses</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Periode Waktu</label>
                <select 
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Semua Waktu</option>
                  <option value="month">1 Bulan Terakhir</option>
                  <option value="week">1 Minggu Terakhir</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Tipe Chart</label>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setChartType("bar")}
                    className={`p-2 rounded-lg text-sm flex items-center gap-1 ${chartType === "bar" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"}`}
                  >
                    <FaChartBar /> Bar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setChartType("area")}
                    className={`p-2 rounded-lg text-sm flex items-center gap-1 ${chartType === "area" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"}`}
                  >
                    <FaChartArea /> Area
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setChartType("radar")}
                    className={`p-2 rounded-lg text-sm flex items-center gap-1 ${chartType === "radar" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"}`}
                  >
                    <FaChartLine /> Radar
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Statistik Ringkas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-center text-white shadow-lg"
        >
          <p className="text-sm">Total Tiket</p>
          <p className="text-2xl font-bold">{totalTickets}</p>
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl text-center text-white shadow-lg"
        >
          <p className="text-sm">Terselesaikan</p>
          <p className="text-2xl font-bold">{resolvedTickets}</p>
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 rounded-xl text-center text-white shadow-lg"
        >
          <p className="text-sm">Dalam Proses</p>
          <p className="text-2xl font-bold">{inProgressTickets}</p>
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-gradient-to-r from-red-500 to-red-600 p-4 rounded-xl text-center text-white shadow-lg"
        >
          <p className="text-sm">Belum Ditangani</p>
          <p className="text-2xl font-bold">{openTickets}</p>
        </motion.div>
      </div>

      {/* Grid untuk charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status Tiket */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold mb-4 text-center text-gray-800 dark:text-white flex items-center justify-center gap-2">
            <FaChartPie /> Status Tiket
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Prioritas Tiket */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold mb-4 text-center text-gray-800 dark:text-white flex items-center justify-center gap-2">
            <FaChartBar /> Prioritas Tiket
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <defs>
                  <linearGradient id="priorityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Kategori Tiket - Full width */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-gray-700 mb-6"
      >
        <h3 className="text-lg font-semibold mb-4 text-center text-gray-800 dark:text-white flex items-center justify-center gap-2">
          {chartType === "radar" ? <FaChartLine /> : <FaChartArea />} 
          {chartType === "radar" ? "Performance by Division" : "Kategori Tiket"}
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {renderCategoryChart()}
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Trend Bulanan */}
      {monthlyChartData.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold mb-4 text-center text-gray-800 dark:text-white flex items-center justify-center gap-2">
            <FaChartLine /> Trend Tiket Bulanan
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="tickets" stroke="#8884d8" fill="url(#trendGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Informasi Data */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
      >
        <p>Data diambil dari SharePoint Helpdesk - {totalTickets} tiket ditemukan</p>
        <p>Terakhir diperbarui: {new Date().toLocaleString('id-ID')}</p>
        {resolutionRate > 0 && (
          <p className="mt-2 text-green-600 dark:text-green-400 font-medium">
            Tingkat penyelesaian: {resolutionRate}%
          </p>
        )}
      </motion.div>

      {/* SVG Filters */}
      <svg width="0" height="0">
        <defs>
          <filter id="lighten" x="0" y="0">
            <feComponentTransfer>
              <feFuncR type="linear" slope="1.5"/>
              <feFuncG type="linear" slope="1.5"/>
              <feFuncB type="linear" slope="1.5"/>
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
    </motion.div>
  );
}