const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export async function createTicket({ name, division, desc, photo }) {
  const fd = new FormData();
  fd.set('name', name);
  fd.set('division', division);
  fd.set('desc', desc);
  if (photo) fd.append('photo', photo);
  const res = await fetch(`${API}/api/tickets`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listTickets() {
  const res = await fetch(`${API}/api/tickets`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function resolveTicket(itemId, { photo, notes }) {
  const fd = new FormData();
  if (photo) fd.append('photo', photo);
  if (notes) fd.set('notes', notes);
  const res = await fetch(`${API}/api/tickets/${itemId}/resolve`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}