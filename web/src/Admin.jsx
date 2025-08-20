import React, { useEffect, useState } from 'react';
import { listTickets, resolveTicket } from './api.js';

export default function Admin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(null);
  const [notes, setNotes] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const { items } = await listTickets();
      setItems(items);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function markDone(item) {
    await resolveTicket(item.id, { photo, notes });
    setPhoto(null); setNotes('');
    await load();
  }

  return (
    <div style={{ maxWidth: 960, margin: '24px auto', padding: 16 }}>
      <h1>Admin Tickets</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color:'crimson' }}>{error}</p>}

      <div style={{ marginBottom: 16 }}>
        <label>Foto penyelesaian (opsional): </label>
        <input type="file" accept="image/*" onChange={(e)=>setPhoto(e.target.files?.[0]||null)} />
        <br />
        <label>Catatan penyelesaian: </label>
        <input value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Opsional" />
      </div>

      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Ticket ID</th>
            <th>Nama</th>
            <th>Divisi</th>
            <th>Keluhan</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>{it.fields?.Title}</td>
              <td>{it.fields?.RequesterName}</td>
              <td>{it.fields?.Division}</td>
              <td>{it.fields?.Description}</td>
              <td>{it.fields?.Status}</td>
              <td>
                {it.fields?.Status !== 'Selesai' ? (
                  <button onClick={() => markDone(it)}>Tandai Selesai</button>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}