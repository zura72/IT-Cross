// src/pages/Login.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { AuthContext } from "../AppProvider";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { instance, accounts } = useMsal();
  const { rememberMe, setRememberMe } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/config");
        const j = await r.json();
        if (mounted && Array.isArray(j?.adminEmails)) {
          setAdminList(j.adminEmails.map((e) => String(e).toLowerCase()));
        }
      } catch {
        if (mounted) setAdminList(["adminapp@waskitainfrastruktur.co.id"]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const currentEmail = useMemo(() => {
    const acc = accounts?.[0];
    if (!acc) return "";
    const claims = acc.idTokenClaims || {};
    return String(
      claims.preferred_username || claims.email || acc.username || ""
    ).toLowerCase();
  }, [accounts]);

  useEffect(() => {
    if (!currentEmail || adminList.length === 0) return;
    const isAdmin = adminList.includes(currentEmail);
    navigate(isAdmin ? "/helpdesk/entry" : "/chat", { replace: true });
  }, [currentEmail, adminList, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    localStorage.setItem("rememberMe", rememberMe ? "true" : "false");
    setLoading(true);
    try {
      await instance.loginPopup();
    } catch {
      alert("Login gagal!");
    }
    setLoading(false);
  };

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
          <img src="/Danantara-Indonesia-Logo-2025.png" alt="Danantara Indonesia Logo" className="h-[150px] w-auto object-contain" />
          <img src="/logo-wki.png" alt="Waskita Infrastruktur Logo" className="h-24 w-auto object-contain" />
        </div>
        <span className="text-3xl font-bold text-[#b681ff] mb-1 text-center whitespace-nowrap">Waskita Karya Infrastruktur</span>
        <span className="text-lg font-semibold text-[#7159d4] mb-0 text-center">IT Asset Management</span>
        <span className="text-xs mt-2 text-gray-700 font-medium text-center">
          Hari ini: {new Date().toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" })}
        </span>

        <form onSubmit={handleLogin} className="w-full mt-6">
          <div className="flex items-center justify-center mb-4">
            <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={(e)=>setRememberMe(e.target.checked)} className="mr-2 accent-[#7159d4]" />
            <label htmlFor="rememberMe" className="text-gray-700 font-medium select-none">Ingat saya</label>
          </div>
          <button type="submit" className="w-full mt-0 mb-2 py-3 rounded-xl bg-gradient-to-r from-[#7159d4] to-[#b681ff] hover:from-[#b681ff] hover:to-[#7159d4] text-white text-lg font-bold shadow-lg transition" disabled={loading}>
            {loading ? "Loading..." : "Login dengan Microsoft"}
          </button>
        </form>

        <div className="mt-4 text-sm text-center text-gray-500">
          &copy; {new Date().getFullYear()} PT Waskita Karya Infrastruktur<br/>IT Asset Management System
        </div>
      </div>
    </div>
  );
}
