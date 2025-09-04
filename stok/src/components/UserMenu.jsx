// src/components/UserMenu.jsx
import React, { useMemo, useState } from "react";
import { useMsal } from "@azure/msal-react";

export default function UserMenu() {
  const { instance, accounts } = useMsal();
  const [open, setOpen] = useState(false);

  const { displayName, email } = useMemo(() => {
    const acc = accounts?.[0];
    const c = acc?.idTokenClaims || {};
    return {
      displayName: c.name || acc?.name || "Pengguna",
      email:
        (c.preferred_username || c.email || acc?.username || "").toLowerCase(),
    };
  }, [accounts]);

  const logout = () => {
    // redirect agar bersih di semua browser
    instance.logoutRedirect({ postLogoutRedirectUri: "/" });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
        title="Akun"
      >
        <div className="h-8 w-8 flex items-center justify-center rounded-full bg-indigo-600 text-white font-semibold">
          {displayName?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div className="text-left">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {displayName}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-300 truncate max-w-[160px]">
            {email}
          </div>
        </div>
        <svg
          className="ml-1 h-4 w-4 text-gray-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.1 1.02l-4.25 4.51a.75.75 0 01-1.1 0L5.21 8.25a.75.75 0 01.02-1.04z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-xl border bg-white dark:bg-gray-800 shadow-lg overflow-hidden z-20"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="px-4 py-3 border-b dark:border-gray-700">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {displayName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-300 break-all">
              {email}
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 font-medium"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
