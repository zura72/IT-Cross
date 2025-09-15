// src/pages/charts/ChartsLicense.jsx
import React, { useState, useEffect } from "react";
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area 
} from "recharts";

// Data dummy untuk berbagai visualisasi
const pieData = [
  { name: "Active", value: 23 },
  { name: "Warning", value: 3 },
  { name: "Expired", value: 1 },
];

const barData = [
  { name: "Office 365 E3", active: 18, warning: 2, expired: 0 },
  { name: "Power BI Pro", active: 12, warning: 1, expired: 0 },
  { name: "Power Automate", active: 8, warning: 0, expired: 0 },
  { name: "Copilot Studio", active: 5, warning: 0, expired: 1 },
  { name: "Windows Store", active: 3, warning: 0, expired: 0 },
];

const trendData = [
  { month: "Jan", licenses: 18 },
  { month: "Feb", licenses: 22 },
  { month: "Mar", licenses: 25 },
  { month: "Apr", licenses: 24 },
  { month: "May", licenses: 27 },
  { month: "Jun", licenses: 26 },
];

const COLORS = ["#10B981", "#F59E0B", "#EF4444"];

export default function ChartsLicense() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);

  // Simulasi loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-800 dark:text-white">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="w-full h-[400px] bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading license data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#215ba6] dark:text-white">License Analytics</h2>
        
        <div className="flex mt-4 md:mt-0 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {["overview", "distribution", "trends"].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">License Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  iconType="circle" 
                  iconSize={10}
                  formatter={(value) => <span className="text-sm text-gray-600 dark:text-gray-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Overview */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">License Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Licenses</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">27</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">23</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Warning</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">3</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Expired</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">1</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Utilization</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">85%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "distribution" && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">License Distribution by Product</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={barData}
              margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" strokeOpacity={0.3} />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="active" stackId="a" fill="#10B981" name="Active" />
              <Bar dataKey="warning" stackId="a" fill="#F59E0B" name="Warning" />
              <Bar dataKey="expired" stackId="a" fill="#EF4444" name="Expired" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === "trends" && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">License Growth Trends</h3>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart
              data={trendData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorLicenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" strokeOpacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="licenses" stroke="#3B82F6" fillOpacity={1} fill="url(#colorLicenses)" name="Total Licenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quick Stats Footer */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">5</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Products</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">23</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Active Licenses</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">3</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Need Attention</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">1</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Expired</p>
          </div>
        </div>
      </div>
    </div>
  );
}