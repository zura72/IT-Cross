import React, { useContext } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../AppProvider";
import { FiMail, FiLogOut, FiUser } from "react-icons/fi";

// Ganti path gambar sesuai lokasi kamu!
const bgImage = "/bg-login.jpg";

export default function Settings() {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const { isAdminLoggedIn, adminEmail, logoutAdmin } = useContext(AuthContext);

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

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
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
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen w-full">
        <div className="backdrop-blur-lg bg-white/70 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-3xl p-8 min-w-[340px] w-full max-w-[400px]">
          {/* Avatar + nama */}
          <div className="flex flex-col items-center gap-2 mb-7">
            <div className="w-20 h-20 bg-gradient-to-br from-[#b681ff] to-[#7159d4] rounded-full flex items-center justify-center shadow-lg mb-2 border-4 border-white dark:border-gray-900">
              <span className="text-3xl text-white font-bold tracking-widest select-none">{initials}</span>
            </div>
            <span className="text-base font-semibold text-[#7159d4] dark:text-[#b681ff]">{name}</span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <FiMail className="inline text-base" />
              {email}
            </span>
          </div>
          {/* Info App */}
          <div className="space-y-2 text-gray-700 dark:text-gray-200 text-sm mb-8">
            <div className="flex items-center gap-2">
              <FiUser className="text-[#b681ff]" />
              <span className="font-medium whitespace-pre-line leading-tight">
                Waskita Karya Infrastruktur
                <br />
                IT Asset Management
              </span>
            </div>

            <div>
              Versi: <span className="font-medium">1.0.0</span>
            </div>
            <div>
              Build: <span className="font-medium">{new Date().toISOString().split("T")[0]}</span>
            </div>
            <div>
              Support:
              <a
                href="mailto:wiqolby@gmail.com"
                className="ml-1 text-[#7159d4] underline hover:text-[#b681ff]"
              >
                wiqolby@gmail.com
              </a>
            </div>
          </div>
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#b681ff] to-[#7159d4] hover:from-[#7159d4] hover:to-[#b681ff] text-white font-bold rounded-xl shadow-lg transition-all duration-200 active:scale-95"
          >
            <FiLogOut className="text-lg" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
