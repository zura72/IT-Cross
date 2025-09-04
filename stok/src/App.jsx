// stok-inventory/src/App.jsx
import React from "react";
import { useIsAuthenticated } from "@azure/msal-react";
import Login from "./pages/Login";
import AppRoutes from "./routes";

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  if (!isAuthenticated) return <Login />;
  return <AppRoutes />;
}
