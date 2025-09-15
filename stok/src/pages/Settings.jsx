import React, { useContext, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../AppProvider";
import { 
  FiMail, 
  FiLogOut, 
  FiUser, 
  FiSettings, 
  FiMoon, 
  FiSun, 
  FiBell,
  FiShield,
  FiDatabase,
  FiHelpCircle,
  FiCreditCard,
  FiGlobe,
  FiKey,
  FiEye,
  FiEyeOff
} from "react-icons/fi";

// Ganti path gambar sesuai lokasi kamu!
const bgImage = "/bg-login.jpg";

export default function Settings() {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const { isAdminLoggedIn, adminEmail, logoutAdmin, dark, toggleDarkMode } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("account");
  const [showApiKey, setShowApiKey] = useState(false);

  // Data profil user
  let initials = "US", email = "user@email.com", name = "Admin";
  if (accounts && accounts.length > 0) {
    initials = accounts[0]?.username?.slice(0, 2).toUpperCase()
      || accounts[0]?.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "US";
    email = accounts[0]?.username || "user@email.com";
    name = accounts[0]?.name || "Microsoft User";
  } else if (isAdminLoggedIn) {
    initials = adminEmail.slice(0, 2).toUpperCase();
    email = adminEmail;
    name = "Admin";
  }

  // Logout
  const handleLogout = () => {
    if (accounts && accounts.length > 0) {
      instance.logoutPopup().then(() => {
        navigate("/login", { replace: true });
        window.location.reload();
      });
    } else if (isAdminLoggedIn) {
      logoutAdmin();
      navigate("/login", { replace: true });
      window.location.reload();
    }
  };

  // Tab konten
  const renderTabContent = () => {
    switch(activeTab) {
      case "account":
        return (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-2 mb-5">
              <div className="w-24 h-24 bg-gradient-to-br from-[#b681ff] to-[#7159d4] rounded-full flex items-center justify-center shadow-lg mb-2 border-4 border-white dark:border-gray-900">
                <span className="text-3xl text-white font-bold tracking-widest select-none">{initials}</span>
              </div>
              <span className="text-lg font-semibold text-[#7159d4] dark:text-[#b681ff]">{name}</span>
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <FiMail className="inline text-base" />
                {email}
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <FiUser className="text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <p className="font-medium">Role</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {isAdminLoggedIn ? "Administrator" : "User"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                    <FiDatabase className="text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <p className="font-medium">Status Akun</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Aktif</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <FiKey className="text-purple-600 dark:text-purple-300" />
                  </div>
                  <div>
                    <p className="font-medium">API Key</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      {showApiKey ? "wk1_4p1k3y_5ecur1ty" : "••••••••••••••••"}
                      <button 
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        {showApiKey ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </p>
                  </div>
                </div>
                <button className="text-sm text-blue-500 hover:text-blue-700 font-medium">
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        );
      
      case "preferences":
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Preferensi Aplikasi</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                    {dark ? (
                      <FiMoon className="text-indigo-600 dark:text-indigo-300" />
                    ) : (
                      <FiSun className="text-yellow-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Mode Gelap</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {dark ? "Diaktifkan" : "Dinonaktifkan"}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={dark}
                    onChange={toggleDarkMode}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <FiBell className="text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <p className="font-medium">Notifikasi</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Email & push notification
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                    <FiGlobe className="text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <p className="font-medium">Bahasa</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Indonesia
                    </p>
                  </div>
                </div>
                <select className="text-sm bg-gray-100 dark:bg-gray-700 border-none rounded-md px-3 py-1">
                  <option>Indonesia</option>
                  <option>English</option>
                </select>
              </div>
            </div>
          </div>
        );
      
      case "security":
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Keamanan & Privasi</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full">
                    <FiShield className="text-red-600 dark:text-red-300" />
                  </div>
                  <div>
                    <p className="font-medium">Autentikasi Dua Faktor</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Tambahkan lapisan keamanan ekstra
                    </p>
                  </div>
                </div>
                <button className="w-full py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-md font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                  Aktifkan 2FA
                </button>
              </div>
              
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <FiKey className="text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <p className="font-medium">Sesi Aktif</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      1 perangkat aktif
                    </p>
                  </div>
                </div>
                <button className="w-full py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-md font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                  Kelola Sesi
                </button>
              </div>
              
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <FiDatabase className="text-purple-600 dark:text-purple-300" />
                  </div>
                  <div>
                    <p className="font-medium">Data & Privasi</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Kelola data pribadi Anda
                    </p>
                  </div>
                </div>
                <button className="w-full py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-md font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
                  Unduh Data
                </button>
              </div>
            </div>
          </div>
        );
      
      case "billing":
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Langganan & Tagihan</h3>
            
            <div className="p-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Paket Enterprise</h4>
                <span className="px-2 py-1 bg-white/20 text-xs rounded-full">Aktif</span>
              </div>
              <p className="text-sm opacity-90 mb-4">Akses penuh ke semua fitur platform</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold">Rp 499.000<span className="text-sm font-normal">/bulan</span></p>
                  <p className="text-xs opacity-80">Berakhir pada 12 Des 2023</p>
                </div>
                <button className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors">
                  Kelola
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">Metode Pembayaran</h4>
              
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <FiCreditCard className="text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <p className="font-medium">Kartu Kredit</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      •••• •••• •••• 1234
                    </p>
                  </div>
                </div>
                <span className="text-sm text-green-600 font-medium">Utama</span>
              </div>
              
              <button className="w-full py-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
                <FiCreditCard />
                Tambah Metode Pembayaran
              </button>
            </div>
          </div>
        );
      
      case "support":
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Bantuan & Dukungan</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <FiHelpCircle className="text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <p className="font-medium">Pusat Bantuan</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Temukan jawaban untuk pertanyaan umum
                    </p>
                  </div>
                </div>
                <button className="w-full py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-md font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                  Kunjungi Pusat Bantuan
                </button>
              </div>
              
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                    <FiMail className="text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <p className="font-medium">Hubungi Dukungan</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Tim kami siap membantu 24/7
                    </p>
                  </div>
                </div>
                <button className="w-full py-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300 rounded-md font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
                  Kirim Tiket Dukungan
                </button>
              </div>
              
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <FiSettings className="text-purple-600 dark:text-purple-300" />
                  </div>
                  <div>
                    <p className="font-medium">Informasi Aplikasi</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Versi: <span className="font-medium">1.0.0</span>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Build: <span className="font-medium">{new Date().toISOString().split("T")[0]}</span>
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Support:
                  <a
                    href="mailto:wiqolby@gmail.com"
                    className="ml-1 text-blue-500 underline hover:text-blue-700"
                  >
                    wiqolby@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden py-8">
      {/* Background Fullscreen */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: `
            linear-gradient(rgba(251, 250, 253, 0.32),rgba(70,45,120,0.27)),
            url('${bgImage}') center center / cover no-repeat
          `
        }}
      />

      {/* Content Card */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-5xl mx-4">
        <div className="backdrop-blur-lg bg-white/70 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-3xl p-6 w-full">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar Navigasi */}
            <div className="md:w-1/4 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <FiSettings className="text-[#7159d4] dark:text-[#b681ff]" />
                Pengaturan
              </h2>
              
              <nav className="space-y-1">
                {[
                  { id: "account", label: "Akun Saya", icon: <FiUser /> },
                  { id: "preferences", label: "Preferensi", icon: <FiSun /> },
                  { id: "security", label: "Keamanan", icon: <FiShield /> },
                  { id: "billing", label: "Langganan", icon: <FiCreditCard /> },
                  { id: "support", label: "Bantuan", icon: <FiHelpCircle /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      activeTab === item.id
                        ? "bg-[#7159d4] text-white"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-6"
                >
                  <FiLogOut />
                  Keluar
                </button>
              </nav>
            </div>
            
            {/* Konten Utama */}
            <div className="md:w-3/4 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}