// src/authConfig.js
export function getMsalConfig(persistent = false) {
  return {
    auth: {
      clientId: "f536a53d-8a16-45cf-9acf-d8c77212b605",
      authority: "https://login.microsoftonline.com/94526da5-8783-4516-9eb7-8c58bbf66a2d",
      redirectUri: "http://localhost:8080/login",
    },
    cache: {
      cacheLocation: persistent ? "localStorage" : "sessionStorage",
      storeAuthStateInCookie: false,
    },
  };
}

export const loginRequest = {
  scopes: ["User.Read", "Sites.Read.All", "Sites.ReadWrite.All"],
};
