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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Memuat konfigurasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background:
          "url('/bg-login.jpg') center center/cover no-repeat, linear-gradient(135deg, #f2ddacff 0%, #f8f7f9ff 60%, #b5a4f9ff 100%)",
        backgroundBlendMode: "multiply",
      }}
    >
      <div
        className="bg-white shadow-2xl rounded-3xl px-12 py-8 flex flex-col items-center max-w-xl w-full"
        style={{ minWidth: 440, marginTop: 40, marginBottom: 40 }}
      >
        <div className="flex flex-row items-center justify-center gap-5 mb-2 w-full">
          <img
            src="/Danantara-Indonesia-Logo-2025.png"
            alt="Danantara Indonesia Logo"
            className="h-[150px] w-auto object-contain"
          />
          <img
            src="/logo-wki.png"
            alt="Waskita Infrastruktur Logo"
            className="h-24 w-auto object-contain"
          />
        </div>

        <span className="text-3xl font-bold text-[#b681ff] mb-1 text-center whitespace-nowrap">
          Waskita Karya Infrastruktur
        </span>
        <span className="text-lg font-semibold text-[#7159d4] mb-0 text-center">
          IT Asset Management
        </span>
        <span className="text-xs mt-2 text-gray-700 font-medium text-center">
          Hari ini:{" "}
          {new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>

        {/* Banner peringatan saat pakai fallback */}
        {configError && (
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded-lg text-yellow-800 text-sm max-w-full">
            ⚠️ {configError}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full mt-6">
          <div className="flex items-center justify-center mb-4">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="mr-2 accent-[#7159d4]"
            />
            <label htmlFor="rememberMe" className="text-gray-700 font-medium select-none">
              Ingat saya
            </label>
          </div>

          <button
            type="submit"
            className="w-full mt-0 mb-2 py-3 rounded-xl bg-gradient-to-r from-[#7159d4] to-[#b681ff] hover:from-[#b681ff] hover:to-[#7159d4] text-white text-lg font-bold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Loading..." : "Login dengan Microsoft"}
          </button>
        </form>

        <div className="mt-4 text-sm text-center text-gray-500">
          &copy; {new Date().getFullYear()} PT Waskita Karya Infrastruktur
          <br />
          IT Asset Management System
        </div>
      </div>
    </div>
  );
}
