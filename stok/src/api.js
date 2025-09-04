// web/src/api.js
export async function createTicket({ name, division, description, photoFile, priority }) {
  const fd = new FormData();
  if (name) fd.append('name', name);
  if (division) fd.append('division', division);
  if (priority) fd.append('priority', priority);
  // server menerima 'description' ATAU 'desc' → kirim 'description'
  fd.append('description', description || '');
  if (photoFile) fd.append('photo', photoFile);

  const r = await fetch('/api/tickets', {
    method: 'POST',
    body: fd,
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) {
    throw new Error(j?.error || `HTTP ${r.status}`);
  }
  return j; // { ok:true, row, ticketId }
}
