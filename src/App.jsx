import React from "react";
import { useIsAuthenticated } from "@azure/msal-react";
import Login from "./pages/Login";
import AppRoutes from "./routes"; // App utama (sidebar, page dsb)

export default function App() {
  const isAuthenticated = useIsAuthenticated();

  // Jika belum login, tampilkan halaman login saja (FULL SCREEN, tanpa sidebar/menu)
  if (!isAuthenticated) return <Login />;

  // Jika sudah login, tampilkan seluruh aplikasi (sidebar dsb)
  return <AppRoutes />;
}
