import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createTicket } from './api.js';
import './App.css';

function Bubble({ side = 'bot', text, imgSrc }) {
  return (
    <div className={`row ${side}`}>
      <div className={`bubble ${side}`}>
        {imgSrc ? <img className="bubble-img" src={imgSrc} alt="lampiran" /> : null}
        {text && <div className="bubble-text" dangerouslySetInnerHTML={{ __html: text }} />}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="row bot">
      <div className="bubble bot typing">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}

export default function App() {
  // form state
  const [name, setName] = useState('');
  const [division, setDivision] = useState('');
  const [desc, setDesc] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  // chat state
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState('greet'); // greet|askName|askDivision|askDesc|askPhoto|confirm|sending|done
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const divisions = ['IT', 'HR', 'Finance', 'Ops']; // sesuaikan
  const scroller = useRef(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
    });
  }

  useEffect(() => { scrollToBottom(); }, [messages, typing]);

  // util: simulasi ngetik
  function botSay(html, delayBase = 400) {
    const d = Math.min(1600, delayBase + (html?.length || 10) * 20);
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { side: 'bot', text: html }]);
      setTyping(false);
    }, d);
  }

  // initial greet
  useEffect(() => {
    if (step !== 'greet') return;
    setMessages([{ side: 'bot', text: 'Hai! Aku siap membantumu. 😊' }]);
    setTimeout(() => {
      botSay('Boleh kenalan? <b>Siapa namamu?</b>');
      setStep('askName');
    }, 350);
  }, [step]);

  function pushUser(text, opts = {}) {
    setMessages((m) => [...m, { side: 'user', text, ...opts }]);
  }

  // handle kirim di composer (untuk askName & askDesc)
  async function sendFromInput() {
    setError('');
    const value = input.trim();
    if (!value) return;

    if (step === 'askName') {
      pushUser(value);
      setName(value);
      setInput('');
      botSay(`Senang kenal kamu, <b>${value}</b>!`);
      setTimeout(() => {
        botSay('Divisi mana yang terkait?');
        setStep('askDivision');
      }, 600);
    } else if (step === 'askDesc') {
      pushUser(value);
      setDesc(value);
      setInput('');
      botSay('Terima kasih. Boleh kirim <b>foto</b> pendukung? (opsional)');
      setStep('askPhoto');
    }
  }

  function chooseDivision(d) {
    pushUser(d);
    setDivision(d);
    botSay('Baik. Sekarang ceritakan keluhanmu ya.');
    setStep('askDesc');
  }

  function handlePhotoChange(file) {
    if (!file) return;
    setPhoto(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    // tampilkan sebagai bubble user berisi foto
    setMessages((m) => [...m, { side: 'user', imgSrc: url }]);
    botSay('Oke, kuterima fotonya.');
  }

  function goConfirm() {
    const summary = `Mohon cek ya:<br/>• <b>Nama:</b> ${name}<br/>• <b>Divisi:</b> ${division}<br/>• <b>Keluhan:</b> ${desc}<br/>• <b>Foto:</b> ${photo ? 'terlampir' : '—'}`;
    botSay(summary);
    setStep('confirm');
  }

  async function submitTicket() {
    try {
      setStep('sending');
      setError('');
      const payload = { name, division, desc, photo };
      const res = await createTicket(payload);
      botSay(`Ticket <b>${res.ticketId}</b> berhasil dibuat. Admin akan segera menindaklanjuti. 🙌`);
      setStep('done');
    } catch (e) {
      setError('Gagal mengirim ticket. Pastikan server aktif & konfigurasi benar.');
      setStep('confirm');
    }
  }

  const composer = useMemo(() => {
    if (step === 'askDivision') {
      return (
        <div className="chips">
          {divisions.map((d) => (
            <button className="chip" key={d} onClick={() => chooseDivision(d)}>{d}</button>
          ))}
        </div>
      );
    }
    if (step === 'askPhoto') {
      return (
        <div className="photo-picker">
          <input type="file" accept="image/*" onChange={(e) => handlePhotoChange(e.target.files?.[0])} />
          <button className="ghost" onClick={goConfirm}>Lewati</button>
          <button className="primary" onClick={goConfirm}>Lanjut</button>
        </div>
      );
    }
    if (step === 'confirm') {
      return (
        <div className="confirm-bar">
          <button onClick={() => setStep('askPhoto')} className="ghost">Kembali</button>
          <button onClick={submitTicket} className="primary">Kirim Ticket</button>
        </div>
      );
    }
    if (step === 'sending' || step === 'done') return null;

    // default composer input (askName / askDesc)
    return (
      <div className="composer">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={step === 'askName' ? 'Ketik namamu…' : 'Tulis keluhanmu…'}
          onKeyDown={(e) => e.key === 'Enter' ? sendFromInput() : null}
        />
        <button className="primary" onClick={sendFromInput}>Kirim</button>
      </div>
    );
  }, [step, input, divisions, photo]);

  return (
    <div className="chat-shell">
      <header className="chat-header">
        <div className="title">🤖 Resepsionis AI</div>
        <div className="hint">Seperti WhatsApp • demo lokal</div>
      </header>

      <main ref={scroller} className="chat-area">
        {messages.map((m, i) => (
          <Bubble key={i} side={m.side} text={m.text} imgSrc={m.imgSrc} />
        ))}
        {typing && <Typing />}
      </main>

      {error && <div className="error">{error}</div>}

      <footer className="chat-footer">
        {composer}
      </footer>
    </div>
  );
}