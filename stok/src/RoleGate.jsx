// src/RoleGate.jsx
import React, { useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import { ensureAdminListLoaded, isAdminEmail } from "./constants/admins";

export default function RoleGate() {
  const { accounts } = useMsal();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await ensureAdminListLoaded();
      if (cancelled) return;

      const acc = accounts?.[0];
      const email = (
        acc?.idTokenClaims?.preferred_username ||
        acc?.idTokenClaims?.email ||
        acc?.username ||
        ""
      ).toLowerCase();

      console.log("[RoleGate] resolved email:", email);

      if (!email) {
        navigate("/login", { replace: true });
        return;
      }

      if (isAdminEmail(email)) {
        // UBAH ke "/" bila dashboard kamu di root
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/chat", { replace: true });
      }
    })();

    return () => { cancelled = true; };
  }, [accounts, navigate]);

  return null;
}
