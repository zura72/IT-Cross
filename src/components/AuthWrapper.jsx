import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";

const GRAPH_SCOPE = ["Sites.Read.All"];

export default function AuthWrapper({ children }) {
  const { instance, accounts } = useMsal();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Jika belum login, trigger login popup
    if (accounts.length === 0 && !loading) {
      setLoading(true);
      instance.loginPopup({ scopes: GRAPH_SCOPE })
        .catch(err => alert("Login gagal: " + err.message))
        .finally(() => setLoading(false));
    }
  }, [accounts, instance, loading]);

  if (accounts.length === 0) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl px-12 py-10 flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-4 text-blue-900 dark:text-blue-100">Login Microsoft</h2>
          <button
            onClick={() => instance.loginPopup({ scopes: GRAPH_SCOPE })}
            className="bg-gradient-to-r from-blue-600 to-cyan-400 text-white px-8 py-3 rounded-lg font-bold shadow-lg text-lg"
            disabled={loading}
          >
            {loading ? "Loading..." : "Login Microsoft"}
          </button>
        </div>
      </div>
    );
  }

  // Sudah login, tampilkan children (seluruh web)
  return children;
}
