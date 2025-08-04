import React, { useState } from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { getMsalConfig } from "./authConfig";

export const AuthContext = React.createContext();

export default function AppProvider({ children }) {
  // state ingat aku, simpan di localStorage (supaya remembered setiap buka web)
  const [rememberMe, setRememberMe] = useState(
    localStorage.getItem("rememberMe") === "true"
  );

  // MSAL config berubah sesuai "ingat aku"
  const msalInstance = new PublicClientApplication(getMsalConfig(rememberMe));

  return (
    <AuthContext.Provider value={{ rememberMe, setRememberMe }}>
      <MsalProvider instance={msalInstance}>
        {children}
      </MsalProvider>
    </AuthContext.Provider>
  );
}
