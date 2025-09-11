import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { AuthContext } from "../AppProvider";
import { useNavigate } from "react-router-dom";

/**
 * Login.jsx (clean console)
 * - Prioritaskan /config.json (public)
 * - Fallback: /api/config, /config, :3001, :3000
 * - Saat semua gagal → pakai default aman + tampilkan banner UI (bukan console)
 */

// ====== dev-only logger (otomatis diam di production) ======
const isDev =
  (typeof import.meta !== "undefined" && import.meta.env?.MODE === "development") ||
  process.env.NODE_ENV === "development";

const dev = {
  log: (...a) => isDev && console.log(...a),
  info: (...a) => isDev && console.info(...a),
  warn: (...a) => isDev && console.warn(...a),
  debug: (...a) => isDev && console.debug(...a),
};

export default function Login() {
  const { instance, accounts } = useMsal();
  const { rememberMe, setRememberMe } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const [configError, setConfigError] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const navigatedRef = useRef(false);

  // ============== helper: fetch JSON dengan timeout & silent 404 ==============
  const fetchJsonSilent = async (url, { timeoutMs = 3500 } = {}) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        // 404 dianggap tidak ada → jangan berisik
        if (res.status !== 404) dev.debug(`[config] ${url} -> ${res.status} ${res.statusText}`);
        return null;
      }
      return await res.json().catch(() => null);
    } catch (e) {
      // Connection refused / CORS / timeout → dev-only log
      dev.debug(`[config] ${url} gagal: ${e?.name || "Error"} ${e?.message || e}`);
      return null;
    } finally {
      clearTimeout(t);
    }
  };

  // =============================== load config =================================
  useEffect(() => {
    mountedRef.current = true;

    const loadConfig = async () => {
      setConfigError(null);

      const endpoints = [
        "/config.json", // public (disarankan)
        "/api/config",
        "/config",
        "http://localhost:3001/api/config",
        "http://localhost:3000/api/config",
      ];

      let found = null;
      for (const u of endpoints) {
        dev.debug("[config] mencoba:", u);
        const json = await fetchJsonSilent(u);
        if (json && typeof json === "object") {
          found = json;
          dev.info("[config] OK dari:", u);
          break;
        }
      }

      // Normalisasi & fallback
      const normalized =
        found && Array.isArray(found.adminEmails)
          ? { adminEmails: found.adminEmails }
          : null;

      if (!mountedRef.current) return;

      if (normalized) {
        setAdminList(normalized.adminEmails.map((e) => String(e).toLowerCase()));
        setConfigError(null);
      } else {
        // Fallback default aman (tanpa console.warn)
        setAdminList(["adminapp@waskitainfrastruktur.co.id"]);
        setConfigError("Server config tidak tersedia, menggunakan data default");
      }

      setConfigLoaded(true);
    };

    loadConfig();
    return () => {
      mountedRef.current = false;
    };
    // deps kosong → hanya sekali saat mount
  }, []);

  // =========================== derive current email ============================
  const currentEmail = useMemo(() => {
    const acc = accounts?.[0];
    if (!acc) return "";
    const claims = acc.idTokenClaims || {};
    return String(
      claims.preferred_username || claims.email || acc.username || ""
    ).toLowerCase();
  }, [accounts]);

  // =========================== auto-navigate ketika siap =======================
  useEffect(() => {
    if (navigatedRef.current) return; // cegah double navigate
    if (!configLoaded) return;        // tunggu config
    if (!currentEmail) return;        // tunggu akun MSAL

    const isAdmin = adminList.includes(currentEmail);
    dev.log(`[route] email=${currentEmail} admin=${isAdmin}`);

    navigatedRef.current = true;
    navigate(isAdmin ? "/helpdesk/entry" : "/chat", { replace: true });
  }, [currentEmail, adminList, navigate, configLoaded]);

  // ================================= login ====================================
  const handleLogin = async (e) => {
    e.preventDefault();
    localStorage.setItem("rememberMe", rememberMe ? "true" : "false");
    setLoading(true);
    try {
      // Coba silent login dulu
      try {
        await instance.ssoSilent({});
      } catch {
        // kalau gagal → popup
        await instance.loginPopup();
      }
    } catch (error) {
      // Tidak spam ke console—cukup alert UI
      alert("Login gagal! Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // =============================== UI states ==================================
  if (!configLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mx-auto"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <svg className="animate-pulse h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
          </div>
          <p className="mt-6 text-gray-700 font-medium">Memuat konfigurasi sistem...</p>
          <p className="mt-2 text-sm text-gray-500">Harap tunggu sebentar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <div className="max-w-4xl w-full flex flex-col md:flex-row rounded-3xl overflow-hidden shadow-2xl">
        {/* Panel Kiri - Informasi Perusahaan */}
        <div className="w-full md:w-2/5 bg-gradient-to-br from-[#7159d4] to-[#b681ff] text-white p-8 flex flex-col justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-6">IT Asset Management</h1>
            <p className="text-purple-100 mb-4">
              Sistem manajemen aset TI terintegrasi untuk PT Waskita Karya Infrastruktur
            </p>
            <div className="flex items-center mt-2 mb-4">
              <div className="w-8 h-0.5 bg-purple-300 mr-2"></div>
              <span className="text-sm text-purple-200">Akses terkontrol dan terjamin</span>
            </div>
            <div className="flex items-center mt-2 mb-4">
              <div className="w-8 h-0.5 bg-purple-300 mr-2"></div>
              <span className="text-sm text-purple-200">Manajemen aset yang efisien</span>
            </div>
          </div>
          
          <div className="mt-8">
            <div className="flex items-center justify-start space-x-4 mb-6">
              <img
                src="/Danantara-Indonesia-Logo-2025.png"
                alt="Danantara Indonesia Logo"
                className="h-12 w-auto object-contain opacity-90"
              />
              <img
                src="/logo-wki.png"
                alt="Waskita Infrastruktur Logo"
                className="h-10 w-auto object-contain opacity-90"
              />
            </div>
            <p className="text-xs text-purple-200">
              &copy; {new Date().getFullYear()} PT Waskita Karya Infrastruktur
            </p>
          </div>
        </div>
        
        {/* Panel Kanan - Form Login */}
        <div className="w-full md:w-3/5 bg-white p-8 md:p-10 flex flex-col justify-center">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Masuk ke Sistem</h2>
            <p className="text-gray-600">Gunakan akun Microsoft Anda untuk mengakses sistem</p>
          </div>
          
          {/* Banner peringatan saat pakai fallback */}
          {configError && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{configError}</span>
            </div>
          )}
          
          <div className="mb-6 flex justify-center">
            <div className="bg-gray-100 p-4 rounded-2xl inline-flex">
              <span className="text-gray-700 font-medium">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: 'long',
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          
          <form onSubmit={handleLogin} className="w-full">
            <div className="flex items-center mb-6">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`block w-12 h-6 rounded-full ${rememberMe ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${rememberMe ? 'transform translate-x-6' : ''}`}></div>
                </div>
                <span className="ml-3 text-gray-700 font-medium select-none">Ingat saya</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#7159d4] to-[#b681ff] hover:from-[#b681ff] hover:to-[#7159d4] text-white font-bold shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4C14.2 4 16 5.8 16 8C16 10.2 14.2 12 12 12C9.8 12 8 10.2 8 8C8 5.8 9.8 4 12 4ZM12 14C16.4 14 20 15.8 20 18V20H4V18C4 15.8 7.6 14 12 14Z" fill="currentColor"/>
                  </svg>
                  Login dengan Microsoft
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Butuh bantuan? Hubungi tim IT support
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}