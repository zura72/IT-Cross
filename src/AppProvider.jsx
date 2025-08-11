import React, { useState, useEffect, useMemo } from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { getMsalConfig } from "./authConfig";

export const AuthContext = React.createContext({});

export default function AppProvider({ children }) {
  // load preferensi "ingat aku" dari localStorage
  const [rememberMe, setRememberMe] = useState(
    localStorage.getItem("rememberMe") === "true"
  );

  // persist kalau user ubah preferensi
  useEffect(() => {
    localStorage.setItem("rememberMe", String(rememberMe));
  }, [rememberMe]);

  // buat MSAL instance cuma saat rememberMe berubah
  const msalInstance = useMemo(
    () => new PublicClientApplication(getMsalConfig(rememberMe)),
    [rememberMe]
  );

  return (
    <AuthContext.Provider value={{ rememberMe, setRememberMe }}>
      <MsalProvider instance={msalInstance}>{children}</MsalProvider>
    </AuthContext.Provider>
  );
}
