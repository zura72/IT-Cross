import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useTheme } from "../../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

// API Configuration
const API_BASE = import.meta.env?.VITE_API_BASE || process.env.REACT_APP_API_BASE || "/api";
const CREDENTIALS_MODE = API_BASE.startsWith("http") ? "include" : "same-origin";

// API Helper Functions
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE.replace(/\/+$/, "")}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    credentials: CREDENTIALS_MODE,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerChildren = {
  visible: { transition: { staggerChildren: 0.1 } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
};

const slideIn = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } }
};

// Component untuk menampilkan statistik
const StatCard = ({ title, value, color, darkMode, index }) => {
  const colorClasses = {
    blue: darkMode ? "bg-blue-900/20 text-blue-400" : "bg-blue-100 text-blue-600",
    red: darkMode ? "bg-red-900/20 text-red-400" : "bg-red-100 text-red-600",
    orange: darkMode ? "bg-orange-900/20 text-orange-400" : "bg-orange-100 text-orange-600",
    green: darkMode ? "bg-green-900/20 text-green-400" : "bg-green-100 text-green-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`p-4 rounded-xl ${colorClasses[color]} shadow-lg hover:shadow-xl transition-shadow duration-300`}
      whileHover={{ scale: 1.05 }}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{title}</div>
    </motion.div>
  );
};

// Component untuk menampilkan priority badge
const PriorityBadge = ({ priority, darkMode }) => {
  const priorityConfig = {
    urgent: { color: "red", icon: "🔥" },
    high: { color: "orange", icon: "⚠️" },
    normal: { color: "blue", icon: "ℹ️" },
    low: { color: "green", icon: "💤" },
  };

  const config = priorityConfig[priority.toLowerCase()] || priorityConfig.normal;
  
  return (
    <motion.span 
      className={`px-3 py-1 rounded-full text-sm font-medium ${
        darkMode ? `bg-${config.color}-900/30 text-${config.color}-300` : `bg-${config.color}-100 text-${config.color}-800`
      }`}
      whileHover={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      {config.icon} {priority}
    </motion.span>
  );
};

// Component untuk modal
const Modal = ({ title, children, onClose, darkMode }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`rounded-2xl w-full max-w-md ${darkMode ? "bg-gray-800" : "bg-white"} shadow-2xl`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`p-6 border-b ${darkMode ? "border-gray-700" : "border-gray-200"} flex justify-between items-center`}>
        <h3 className="text-xl font-semibold">{title}</h3>
        <motion.button 
          onClick={onClose} 
          className="text-2xl hover:opacity-70"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          ×
        </motion.button>
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  </motion.div>
);

// Main Component
export default function TicketEntry() {
  const { dark: darkMode } = useTheme();
  const { accounts } = useMsal();
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeModal, setActiveModal] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const user = accounts[0];
  const userName = user?.name || "Admin";

  // Stats calculation
  const stats = {
    total: tickets.length,
    urgent: tickets.filter(t => t.priority.toLowerCase() === "urgent").length,
    high: tickets.filter(t => t.priority.toLowerCase() === "high").length,
    normal: tickets.filter(t => t.priority.toLowerCase() === "normal").length,
  };

  // Load tickets
  useEffect(() => {
    loadTickets();
  }, []);

  // Filter tickets based on search query
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = tickets.filter(ticket => 
      ticket.ticketNo.toLowerCase().includes(query) ||
      ticket.user.toLowerCase().includes(query) ||
      ticket.department.toLowerCase().includes(query) ||
      ticket.description.toLowerCase().includes(query)
    );
    setFilteredTickets(filtered);
  }, [searchQuery, tickets]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await apiRequest("/api/tickets?status=Belum");
      setTickets(data.rows || []);
    } catch (err) {
      setError("Gagal memuat tiket: " + err.message);
      setTickets([
        {
          id: 1,
          ticketNo: "TKT-001",
          createdAt: new Date().toISOString(),
          user: "John Doe",
          department: "IT",
          priority: "Urgent",
          description: "Keyboard tidak berfungsi",
          assignee: userName,
          attachment: null
        },
        {
          id: 2,
          ticketNo: "TKT-002",
          createdAt: new Date().toISOString(),
          user: "Jane Smith",
          department: "HR",
          priority: "High",
          description: "Printer bermasalah",
          assignee: userName,
          attachment: null
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (ticketId, notes, file) => {
    try {
      const formData = new FormData();
      if (file) formData.append("photo", file);
      if (notes) formData.append("notes", notes);
      formData.append("operator", userName);

      await apiRequest(`/api/tickets/${ticketId}/resolve`, {
        method: "POST",
        body: formData,
        headers: {}
      });

      setSuccess("Ticket berhasil diselesaikan");
      setActiveModal(null);
      loadTickets();
    } catch (err) {
      setError("Gagal menyelesaikan tiket: " + err.message);
    }
  };

  const handleDecline = async (ticketId, reason) => {
    try {
      await apiRequest(`/api/tickets/${ticketId}/decline`, {
        method: "POST",
        body: JSON.stringify({ notes: reason, operator: userName })
      });

      setSuccess("Ticket berhasil ditolak");
      setActiveModal(null);
      loadTickets();
    } catch (err) {
      setError("Gagal menolak tiket: " + err.message);
    }
  };

  const handleDelete = async (ticketId) => {
    try {
      await apiRequest(`/api/tickets/${ticketId}`, { method: "DELETE" });
      setSuccess("Ticket berhasil dihapus");
      setActiveModal(null);
      loadTickets();
    } catch (err) {
      setError("Gagal menghapus tiket: " + err.message);
    }
  };

  const openModal = (modalType, ticket) => {
    setActiveModal(modalType);
    setSelectedTicket(ticket);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`min-h-screen p-6 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
    >
      {/* Header Section */}
      <motion.div 
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className={`rounded-2xl p-6 mb-6 ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <motion.div variants={slideIn}>
            <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              Ticket Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Kelola tiket yang belum diproses
            </p>
          </motion.div>
          
          <motion.div 
            className="flex gap-3"
            variants={staggerChildren}
            initial="hidden"
            animate="visible"
          >
            <StatCard title="Total" value={stats.total} color="blue" darkMode={darkMode} index={0} />
            <StatCard title="Urgent" value={stats.urgent} color="red" darkMode={darkMode} index={1} />
            <StatCard title="High" value={stats.high} color="orange" darkMode={darkMode} index={2} />
          </motion.div>
        </div>

        {/* Search and Actions */}
        <motion.div 
          className="flex flex-col md:flex-row gap-4"
          variants={fadeIn}
        >
          <div className="flex-1">
            <motion.div 
              className="relative"
              whileFocus={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <input
                type="text"
                placeholder="Cari tiket..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${
                  darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300`}
              />
              <span className="absolute right-3 top-3 text-gray-400">🔍</span>
            </motion.div>
          </div>
          
          <motion.div 
            className="flex gap-2"
            variants={staggerChildren}
          >
            <motion.button
              onClick={loadTickets}
              disabled={loading}
              className={`px-4 py-3 rounded-xl font-medium flex items-center gap-2 ${
                loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              } text-white`}
              whileHover={{ scale: loading ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? "⏳" : "🔄"} {loading ? "Loading..." : "Refresh"}
            </motion.button>
            
            <motion.button
              onClick={() => window.print()}
              className={`px-4 py-3 rounded-xl border ${
                darkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100"
              } flex items-center gap-2`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🖨️ Print
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Notifications */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`mb-6 p-4 rounded-xl ${
              darkMode ? "bg-red-900/30 border-red-700" : "bg-red-50 border-red-200"
            } border`}
          >
            <div className="flex justify-between items-center">
              <span>❌ {error}</span>
              <button onClick={() => setError("")} className="text-sm underline">Tutup</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`mb-6 p-4 rounded-xl ${
              darkMode ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200"
            } border`}
          >
            <div className="flex justify-between items-center">
              <span>✅ {success}</span>
              <button onClick={() => setSuccess("")} className="text-sm underline">Tutup</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tickets Table */}
      <motion.div 
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className={`rounded-2xl overflow-hidden ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={darkMode ? "bg-gray-700" : "bg-gray-100"}>
                <th className="p-4 text-left">Ticket #</th>
                <th className="p-4 text-left">User</th>
                <th className="p-4 text-left">Department</th>
                <th className="p-4 text-left">Priority</th>
                <th className="p-4 text-left">Description</th>
                <th className="p-4 text-left">Assignee</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"
                    />
                    <p className="mt-2 text-gray-500">Memuat tiket...</p>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    {searchQuery ? "Tidak ada tiket yang cocok dengan pencarian" : "Tidak ada tiket"}
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {filteredTickets.map((ticket, index) => (
                    <motion.tr 
                      key={ticket.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={index % 2 === 0 ? (darkMode ? "bg-gray-800" : "bg-white") : (darkMode ? "bg-gray-700" : "bg-gray-50")}
                      whileHover={{ backgroundColor: darkMode ? "rgba(55, 65, 81, 0.5)" : "rgba(243, 244, 246, 0.5)" }}
                    >
                      <td className="p-4 font-mono">{ticket.ticketNo}</td>
                      <td className="p-4">{ticket.user}</td>
                      <td className="p-4">{ticket.department}</td>
                      <td className="p-4">
                        <PriorityBadge priority={ticket.priority} darkMode={darkMode} />
                      </td>
                      <td className="p-4 max-w-xs">{ticket.description}</td>
                      <td className="p-4">{ticket.assignee}</td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-center">
                          <motion.button
                            onClick={() => openModal("resolve", ticket)}
                            className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm"
                            whileHover={{ scale: 1.1, boxShadow: "0 0 8px rgba(34, 197, 94, 0.5)" }}
                            whileTap={{ scale: 0.9 }}
                          >
                            ✅
                          </motion.button>
                          <motion.button
                            onClick={() => openModal("decline", ticket)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-sm"
                            whileHover={{ scale: 1.1, boxShadow: "0 0 8px rgba(234, 179, 8, 0.5)" }}
                            whileTap={{ scale: 0.9 }}
                          >
                            ❌
                          </motion.button>
                          <motion.button
                            onClick={() => openModal("delete", ticket)}
                            className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                            whileHover={{ scale: 1.1, boxShadow: "0 0 8px rgba(239, 68, 68, 0.5)" }}
                            whileTap={{ scale: 0.9 }}
                          >
                            🗑️
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === "resolve" && selectedTicket && (
          <ResolveModal
            ticket={selectedTicket}
            onClose={() => setActiveModal(null)}
            onSubmit={handleResolve}
            darkMode={darkMode}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal === "decline" && selectedTicket && (
          <DeclineModal
            ticket={selectedTicket}
            onClose={() => setActiveModal(null)}
            onSubmit={handleDecline}
            darkMode={darkMode}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal === "delete" && selectedTicket && (
          <DeleteModal
            ticket={selectedTicket}
            onClose={() => setActiveModal(null)}
            onSubmit={handleDelete}
            darkMode={darkMode}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Modal Components
const ResolveModal = ({ ticket, onClose, onSubmit, darkMode }) => {
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);

  return (
    <Modal title={`Selesaikan Ticket ${ticket.ticketNo}`} onClose={onClose} darkMode={darkMode}>
      <div className="space-y-4">
        <div>
          <label className="block mb-2 font-medium">Upload Bukti (Opsional)</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Catatan</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`w-full p-2 border rounded ${
              darkMode ? "bg-gray-700 border-gray-600" : "border-gray-300"
            }`}
            placeholder="Tambahkan catatan penyelesaian..."
          />
        </div>
        <div className="flex gap-2 justify-end">
          <motion.button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Batal
          </motion.button>
          <motion.button
            onClick={() => onSubmit(ticket.id, notes, file)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Konfirmasi Selesai
          </motion.button>
        </div>
      </div>
    </Modal>
  );
};

const DeclineModal = ({ ticket, onClose, onSubmit, darkMode }) => {
  const [reason, setReason] = useState("");

  return (
    <Modal title={`Tolak Ticket ${ticket.ticketNo}`} onClose={onClose} darkMode={darkMode}>
      <div className="space-y-4">
        <div>
          <label className="block mb-2 font-medium">Alasan Penolakan</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className={`w-full p-2 border rounded ${
              darkMode ? "bg-gray-700 border-gray-600" : "border-gray-300"
            }`}
            placeholder="Berikan alasan penolakan..."
            required
          />
        </div>
        <div className="flex gap-2 justify-end">
          <motion.button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Batal
          </motion.button>
          <motion.button
            onClick={() => onSubmit(ticket.id, reason)}
            disabled={!reason.trim()}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Tolak Ticket
          </motion.button>
        </div>
      </div>
    </Modal>
  );
};

const DeleteModal = ({ ticket, onClose, onSubmit, darkMode }) => {
  return (
    <Modal title={`Hapus Ticket ${ticket.ticketNo}`} onClose={onClose} darkMode={darkMode}>
      <div className="space-y-4">
        <p>Apakah Anda yakin ingin menghapus ticket ini? Tindakan ini tidak dapat dibatalkan.</p>
        <div className="flex gap-2 justify-end">
          <motion.button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Batal
          </motion.button>
          <motion.button
            onClick={() => onSubmit(ticket.id)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Hapus
          </motion.button>
        </div>
      </div>
    </Modal>
  );
};