// src/setupProxy.js
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  // Proxy semua endpoint API ke server Express (port 4000)
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:4000",
      changeOrigin: true,
      // opsional: untuk debug header
      // onProxyReq: (proxyReq, req) => console.log("[proxy:/api]", req.url),
    })
  );

  // Proxy static uploads juga, supaya /uploads/... di 8080 tetap jalan
  app.use(
    "/uploads",
    createProxyMiddleware({
      target: "http://localhost:4000",
      changeOrigin: true,
      // onProxyReq: (proxyReq, req) => console.log("[proxy:/uploads]", req.url),
    })
  );
};
