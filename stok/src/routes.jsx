// src/routes.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";

/* ============= Layout & Pages ============= */
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import Licenses from "./pages/Licenses";
import Peripheral from "./pages/Peripheral";
import Settings from "./pages/Settings";
import ChartsLicense from "./pages/charts/ChartsLicense";
import ChartsPeripheral from "./pages/charts/ChartsPeripheral";
import ChartsDevice from "./pages/charts/ChartsDevice";
import ChartHelpdesk from "./pages/charts/ChartHelpdesk";
import TicketEntry from "./pages/helpdesk/TicketEntry";
import TicketSolved from "./pages/helpdesk/TicketSolved";
import DataSharepoint from "./pages/helpdesk/DataSharepoint";
import ChatHost from "./pages/user/ChatHost";

/* ============= Admin helpers (pakai constants/admins) ============= */
import {
  getAdminSetCached,
  resolveMsalEmail,
  FALLBACK_ADMIN_EMAIL,
} from "./constants/admin";

/* ============= dev-only logger ============= */
const isDev =
  (typeof import.meta !== "undefined" && import.meta.env?.MODE === "development") ||
  process.env.NODE_ENV === "development";
const dev = {
  log: (...a) => isDev && console.log(...a),
  warn: (...a) => isDev && console.warn(...a),
};

/* ============= Admin Gate Hook ============= */
function useAdminGate() {
  const { accounts } = useMsal();
  const [adminSet, setAdminSet] = useState(null); // Set<string>

  const email = useMemo(() => resolveMsalEmail(accounts?.[0]), [accounts]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const set = await getAdminSetCached();
      if (alive) setAdminSet(set);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const ready = adminSet !== null;
  const isAdmin =
    ready &&
    !!email &&
    (adminSet.has(email) || email === FALLBACK_ADMIN_EMAIL);

  return { ready, isAdmin, email };
}

/* ============= Guards & Layout ============= */
function RequireAdmin({ children }) {
  const { ready, isAdmin /*, email*/ } = useAdminGate();
  if (!ready) return <div className="p-6">Loading…</div>;
  if (!isAdmin) {
    // jangan spam console, langsung redirect saja
    return <Navigate to="/chat" replace />;
  }
  return children;
}

function ThemedLayout({ children }) {
  const [dark, setDark] = useState(() => {
    const t = localStorage.getItem("theme");
    return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <div className="flex bg-gray-100 dark:bg-gray-900 min-h-screen">
      <Sidebar dark={dark} toggleDark={() => setDark((v) => !v)} />
      <div className="flex-1 p-6 md:p-10">{children}</div>
    </div>
  );
}

/* ============= Landing decider ============= */
function LandingRouter() {
  const { ready, isAdmin, email } = useAdminGate();
  const nav = useNavigate();

  useEffect(() => {
    if (!ready) return;
    const target = isAdmin ? "/dashboard" : "/chat";
    dev.log("[LandingRouter] email:", email, "→", target);
    nav(target, { replace: true }); // gunakan replace agar tidak ada history back ke "/"
  }, [ready, isAdmin, nav, email]);

  return <div className="p-6">Mengarahkan…</div>;
}

/* ============= Routes ============= */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Setelah login mendarat ke sini */}
      <Route path="/" element={<LandingRouter />} />

      {/* CHAT fullscreen (tanpa sidebar) */}
      <Route path="/chat" element={<ChatHost />} />

      {/* ADMIN layout */}
      <Route
        path="/dashboard"
        element={
          <RequireAdmin>
            <ThemedLayout>
              <Dashboard />
            </ThemedLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/devices"
        element={
          <RequireAdmin>
            <ThemedLayout>
              <Devices />
            </ThemedLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/peripheral"
        element={
          <RequireAdmin>
            <ThemedLayout>
              <Peripheral />
            </ThemedLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/licenses"
        element={
          <RequireAdmin>
            <ThemedLayout>
              <Licenses />
            </ThemedLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAdmin>
            <ThemedLayout>
              <Settings />
            </ThemedLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/charts/license"
        element={
          <RequireAdmin>
            <ThemedLayout>
              <ChartsLicense />
            </ThemedLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/charts/peripheral"
        element={
          <RequireAdmin>
            <ThemedLayout>
              <ChartsPeripheral />
            </ThemedLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/charts/device"
        element={
          <RequireAdmin>
            <ThemedLayout>
              <ChartsDevice />
            </ThemedLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/charts/helpdesk"
        element={
          <RequireAdmin>
            <ThemedLayout>
              <ChartHelpdesk />
            </ThemedLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/helpdesk/entry"
        element={
          <RequireAdmin>
            <ThemedLayout>
              <TicketEntry />
            </ThemedLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/helpdesk/solved"
        element={
          <RequireAdmin>
            <ThemedLayout>
              <TicketSolved />
            </ThemedLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/helpdesk/sharepoint"
        element={
          <RequireAdmin>
            <ThemedLayout>
              <DataSharepoint />
            </ThemedLayout>
          </RequireAdmin>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}