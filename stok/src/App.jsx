// src/App.jsx
import React from "react";
import { useIsAuthenticated } from "@azure/msal-react";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./pages/Login";
import AppRoutes from "./routes";

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  
  return (
    <ThemeProvider>
      {!isAuthenticated ? <Login /> : <AppRoutes />}
    </ThemeProvider>
  );
}