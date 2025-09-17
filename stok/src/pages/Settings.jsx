import React, { useContext, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../AppProvider";
import { 
  FiMail, 
  FiLogOut, 
  FiUser, 
  FiSettings, 
  FiBell,
  FiShield,
  FiDatabase,
  FiHelpCircle,
  FiGlobe,
  FiKey,
  FiEye,
  FiEyeOff,
  FiCopy,
  FiCheck,
  FiStar,
  FiAward
} from "react-icons/fi";

export default function Settings() {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const { isAdminLoggedIn, adminEmail, logoutAdmin, dark } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("account");
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // Data profil user
  let initials = "US", email = "user@email.com", name = "Master";
  if (accounts && accounts.length > 0) {
    initials = accounts[0]?.username?.slice(0, 2).toUpperCase()
      || accounts[0]?.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "US";
    email = accounts[0]?.username || "user@email.com";
    name = accounts[0]?.name || "Microsoft User";
  } else if (isAdminLoggedIn) {
    initials = adminEmail.slice(0, 2).toUpperCase();
    email = adminEmail;
    name = "Master";
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

  // Copy API Key
  const copyApiKey = () => {
    navigator.clipboard.writeText("wk1_4p1k3y_5ecur1ty");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Tab konten
  const renderTabContent = () => {
    switch(activeTab) {
      case "account":
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-2 mb-5">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-[#7e57c2] to-[#5e35b1] rounded-full flex items-center justify-center shadow-lg mb-2 border-4 border-white dark:border-gray-900">
                  <span className="text-3xl text-white font-bold tracking-widest select-none">{initials}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-[#ff6b6b] to-[#ff9e7d] rounded-full p-1.5 border-2 border-white dark:border-gray-900">
                  <FiAward className="text-white text-xs" />
                </div>
              </div>
              <div className="text-center">
                <span className="text-lg font-semibold text-gray-800 dark:text-white">{name}</span>
                <div className="mt-1 bg-gradient-to-r from-[#7e57c2] to-[#5e35b1] text-white text-xs font-medium px-2 py-1 rounded-full inline-flex items-center">
                  <FiStar className="mr-1" size={12} />
                  Master Account
                </div>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FiMail className="inline text-base" />
                {email}
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-full">
                    <FiUser className="text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Role</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Master Administrator
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-gradient-to-r from-[#7e57c2] to-[#5e35b1] text-white text-xs font-medium rounded-full">
                  Full Access
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-full">
                    <FiDatabase className="text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Status Akun</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Aktif dan Terverifikasi</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-sm text-green-500">Online</span>
                </div>
              </div>
              
              <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-full">
                      <FiKey className="text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">API Key</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Gunakan untuk integrasi sistem
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-gray-500 hover:text-purple-500 transition-colors"
                  >
                    {showApiKey ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-3 font-mono text-sm text-gray-800 dark:text-white">
                    {showApiKey ? "wk1_4p1k3y_5ecur1ty" : "••••••••••••••••••••••"}
                  </div>
                  <button 
                    onClick={copyApiKey}
                    className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                    title="Salin API Key"
                  >
                    {copied ? <FiCheck className="text-green-500" /> : <FiCopy />}
                  </button>
                </div>
                
                <button className="text-sm text-blue-500 hover:text-blue-700 font-medium">
                  Regenerate Key
                </button>
              </div>
            </div>
          </div>
        );
      
      case "preferences":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Preferensi Aplikasi</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-full">
                    <FiBell className="text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Notifikasi</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Email & push notification
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-full">
                    <FiGlobe className="text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Bahasa</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Pilih bahasa preferensi
                    </p>
                  </div>
                </div>
                <select className="text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg px-3 py-1.5">
                  <option>Indonesia</option>
                  <option>English</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-full">
                    <FiSettings className="text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Tampilan Antarmuka</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Pilih tema antarmuka
                    </p>
                  </div>
                </div>
                <select className="text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg px-3 py-1.5">
                  <option>Default</option>
                  <option>Modern</option>
                  <option>Classic</option>
                </select>
              </div>
            </div>
          </div>
        );
      
      case "security":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Keamanan & Privasi</h3>
            
            <div className="space-y-4">
              <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-500/10 rounded-full">
                    <FiShield className="text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Autentikasi Dua Faktor</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Tambahkan lapisan keamanan ekstra
                    </p>
                  </div>
                </div>
                <button className="w-full py-2.5 bg-gradient-to-r from-[#7e57c2] to-[#5e35b1] text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
                  Aktifkan 2FA
                </button>
              </div>
              
              <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-full">
                    <FiKey className="text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Sesi Aktif</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      1 perangkat aktif
                    </p>
                  </div>
                </div>
                <button className="w-full py-2.5 bg-blue-500/10 text-blue-500 rounded-lg font-medium hover:bg-blue-500/20 transition-colors">
                  Kelola Sesi
                </button>
              </div>
              
              <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/10 rounded-full">
                    <FiDatabase className="text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Data & Privasi</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Kelola data pribadi Anda
                    </p>
                  </div>
                </div>
                <button className="w-full py-2.5 bg-purple-500/10 text-purple-500 rounded-lg font-medium hover:bg-purple-500/20 transition-colors">
                  Unduh Data
                </button>
              </div>
            </div>
          </div>
        );
      
      case "support":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Bantuan & Dukungan</h3>
            
            <div className="space-y-4">
              <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-full">
                    <FiHelpCircle className="text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Pusat Bantuan</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Temukan jawaban untuk pertanyaan umum
                    </p>
                  </div>
                </div>
                <button className="w-full py-2.5 bg-gradient-to-r from-[#7e57c2] to-[#5e35b1] text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
                  Kunjungi Pusat Bantuan
                </button>
              </div>
              
              <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/10 rounded-full">
                    <FiMail className="text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Hubungi Dukungan</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Tim kami siap membantu 24/7
                    </p>
                  </div>
                </div>
                <button className="w-full py-2.5 bg-green-500/10 text-green-500 rounded-lg font-medium hover:bg-green-500/20 transition-colors">
                  Kirim Tiket Dukungan
                </button>
              </div>
              
              <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/10 rounded-full">
                    <FiSettings className="text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Informasi Aplikasi</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Versi: <span className="font-medium text-gray-800 dark:text-white">1.0.0</span>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Build: <span className="font-medium text-gray-800 dark:text-white">{new Date().toISOString().split("T")[0]}</span>
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Support:
                  <a
                    href="mailto:wiqolby@gmail.com"
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    wiqolby@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Pengaturan</h3>
            <p className="text-gray-500 dark:text-gray-400">Pilih menu pengaturan di sebelah kiri.</p>
          </div>
        );
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden py-8">
      {/* Background Gradient Modern */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
      
      {/* Efek Background Tambahan */}
      <div className="fixed inset-0 z-0 opacity-40">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Efek Geometris */}
      <div className="fixed inset-0 z-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400 rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full"></div>
      </div>

      {/* Content Card */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-5xl mx-4">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/60 shadow-2xl rounded-3xl p-6 w-full">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar Navigasi */}
            <div className="md:w-1/4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <FiSettings className="text-[#7e57c2] dark:text-[#b681ff]" />
                Pengaturan
              </h2>
              
              <nav className="space-y-1">
                {[
                  { id: "account", label: "Akun Saya", icon: <FiUser /> },
                  { id: "preferences", label: "Preferensi", icon: <FiSettings /> },
                  { id: "security", label: "Keamanan", icon: <FiShield /> },
                  { id: "support", label: "Bantuan", icon: <FiHelpCircle /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      activeTab === item.id
                        ? "bg-gradient-to-r from-[#7e57c2] to-[#5e35b1] text-white shadow-md"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
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
            
            {/* Konten Utama - Diberikan tinggi dan lebar tetap */}
            <div className="md:w-3/4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/60 dark:border-gray-700/60 shadow-sm min-h-[600px] overflow-y-auto">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Tambahkan style untuk animasi blob */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}