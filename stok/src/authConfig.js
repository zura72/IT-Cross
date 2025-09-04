export function getMsalConfig(persistent = true) {
  return {
    auth: {
      clientId: "f536a53d-8a16-45cf-9acf-d8c77212b605",
      authority: "https://login.microsoftonline.com/94526da5-8783-4516-9eb7-8c58bbf66a2d",
      redirectUri: `${window.location.origin}/login`,
      postLogoutRedirectUri: `${window.location.origin}/login`,
      navigateToLoginRequestUrl: false,
    },
    cache: {
      cacheLocation: persistent ? "localStorage" : "sessionStorage",
      storeAuthStateInCookie: true,
    },
  };
}

export const loginRequest = {
  scopes: ["User.Read", "Sites.Read.All", "Sites.ReadWrite.All"],
};
