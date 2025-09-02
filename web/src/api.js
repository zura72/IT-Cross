// web/src/api.js
// Facade pemanggilan backend yang sama seperti di stok-inventory.
// Endpoint-nya tetap /api/* karena sudah diproxy ke server port 4000.

export async function getConfig() {
  const r = await fetch("/api/config");
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const t = await r.text();
    throw new Error("Server mengirim non-JSON: " + t.slice(0, 120));
  }
  return r.json();
}

export async function createTicket({ name, division, description, photo }) {
  const fd = new FormData();
  fd.append("name", name || "User");
  fd.append("division", division || "Umum");
  fd.append("description", description || "");
  fd.append("desc", description || "");
  if (photo) fd.append("photo", photo);

  const r = await fetch("/api/tickets", { method: "POST", body: fd });
  const ct = r.headers.get("content-type") || "";
  const j = ct.includes("application/json") ? await r.json() : {};
  if (!r.ok || !j.ok) throw new Error(j?.error || "Gagal membuat tiket");
  return j; // { ok, itemId, ticketId }
}

export async function getTickets(status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  const r = await fetch(`/api/tickets${q}`);
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const t = await r.text();
    throw new Error("Server mengirim non-JSON: " + t.slice(0, 120));
  }
  return r.json(); // { ok, rows: [...] }
}
