import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";
import "./ChatHost.css";

/* ===================== helpers ===================== */
const yesWords = new Set([
  "ya","iya","y","yaaa","ok","oke","baik","siap","betul","benar","yup",
  "yaudah","silakan","lanjut"
]);
const nowStr = () => new Date().toLocaleString();

const DIVISION_OPTIONS = [
  "IT & System","Business Development","Direksi","Engineering","Finance & Accounting",
  "Human Capital","Legal","Marketing & Sales","Operation & Maintenance",
  "Procurement & Logistic","Project","QHSE","Sekper","Warehouse","Umum",
];

/** Kirim tiket ke server. Server akan simpan foto, generate TKT-xxx, dan kirim email admin. */
async function createTicket({ name, division = "", description, photo }) {
  const priority = String(division).trim().toLowerCase() === "direksi" ? "Urgent" : "Normal";
  const fd = new FormData();
  fd.append("name", name || "User");
  fd.append("division", division || "Umum");
  fd.append("priority", priority);
  fd.append("description", description || "");
  fd.append("desc", description || "");
  if (photo) fd.append("photo", photo);

  const r = await fetch("/api/tickets", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j?.error || "Gagal membuat tiket");
  return j; // { ok:true, itemId, ticketId, photoUrl }
}

/** Ambil nama & divisi dari MSAL claims (sinkron). */
function readProfileFromMsal(accounts) {
  const a = accounts?.[0];
  const c = a?.idTokenClaims || {};
  const name = a?.name || c.name || c.given_name || a?.username || c.preferred_username || "User";
  const division = c.department || c.division || c.jobTitle || "Umum";
  return { name: String(name), division: String(division) };
}

/* ===================== komponen utama ===================== */
export default function ChatHost() {
  const { instance, accounts } = useMsal();

  const displayName = useMemo(() => {
    const acc = accounts?.[0];
    const c = acc?.idTokenClaims || {};
    return acc?.name || c?.name || c?.preferred_username || acc?.username || "User";
  }, [accounts]);

  const { name: userName, division: userDivision } = useMemo(
    () => readProfileFromMsal(accounts), [accounts]
  );

  // stages: start -> needComplaint -> confirmComplaint -> needDivision -> needPhoto -> done
  const [stage, setStage] = useState("start");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [division, setDivision] = useState(userDivision || "Umum");

  // UI lock ketika tiket sudah dibuat
  const sessionLocked = stage === "done";

  // sticky confirm bar (bukan lagi bubble di chat)
  const [showConfirm, setShowConfirm] = useState(false);

  const scroller = useRef(null);
  const fileInputRef = useRef(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const pushBot  = (jsx) => {
    if (!mountedRef.current) return;
    setMessages((m) => Array.isArray(m) ? [...m, { side: "bot",  jsx }] : [{ side:"bot", jsx }]);
  };
  const pushUser = (text) => {
    if (!mountedRef.current) return;
    setMessages((m) => Array.isArray(m) ? [...m, { side: "user", jsx: <span>{text}</span> }] : [{ side:"user", jsx:<span>{text}</span>}]);
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
    });
  };
  useEffect(scrollToBottom, [messages, isTyping, showConfirm]);

  // greeting awal -> pakai tombol "🆘 Tolong"
  useEffect(() => {
    setMessages([]);
    setIsTyping(true);
    setTimeout(() => {
      pushBot(<span className="enter-pop">Halo, <b>{displayName}</b>! Aku siap membantumu 😊</span>);
      pushBot(
        <div className="fade-in">
          Klik / ketuk tombol di bawah ini untuk menyampaikan keluhanmu.
          <HelpCTA onClick={startFlow} />
        </div>
      );
      setIsTyping(false);
      setStage("start");
      scrollToBottom();
    }, 400);
    
  }, [displayName]);

  function startFlow() {
    setIsTyping(true);
    setTimeout(() => {
      pushUser("🆘 Tolong");
      pushBot(<span className="slide-up">Siapkan detailnya ya. Silakan tulis keluhanmu.</span>);
      setStage("needComplaint");
      setIsTyping(false);
    }, 200);
  }

  const handleSend = () => {
    if (sessionLocked) return; // sudah selesai
    const text = input.trim();
    if (!text) return;
    pushUser(text);
    setInput("");

    if (stage === "start") {
      setIsTyping(true);
      setTimeout(() => {
        pushBot(<span>Untuk membuat tiket, klik tombol <b>🆘 Tolong</b> ya.</span>);
        setIsTyping(false);
      }, 250);
      return;
    }

    if (stage === "needComplaint") {
      setComplaint(text);
      setIsTyping(true);
      setTimeout(() => {
        pushBot(
          <span>
            Oke, keluhan kamu: <b>{text}</b>. Apakah itu saja? Ketik <b>“ya”</b> untuk konfirmasi
            atau <b>“tidak”</b> untuk menambahkan.
          </span>
        );
        setStage("confirmComplaint");
        setIsTyping(false);
      }, 250);
      return;
    }

    if (stage === "confirmComplaint") {
      if (yesWords.has(text.toLowerCase())) {
        // minta pilih DIVISI dengan tombol
        setIsTyping(true);
        setTimeout(() => {
          pushBot(
            <DivisionPicker
              current={division}
              options={DIVISION_OPTIONS}
              onPick={(val) => {
                setDivision(val);
                pushUser(val);
                setIsTyping(true);
                setTimeout(() => {
                  pushBot(<RecapCard name={displayName} complaint={complaint} division={val} datetime={nowStr()} />);
                  pushBot(<UploadAsk onPick={() => fileInputRef.current?.click()} hasPhoto={!!photoFile} />);
                  setStage("needPhoto");
                  setIsTyping(false);
                }, 200);
              }}
            />
          );
          setStage("needDivision");
          setIsTyping(false);
        }, 250);
      } else {
        setIsTyping(true);
        setTimeout(() => {
          pushBot(<span>Oke, silakan tambahkan keluhanmu.</span>);
          setStage("needComplaint");
          setIsTyping(false);
        }, 250);
      }
      return;
    }

    if (stage === "needDivision") return; // pilih via tombol
    if (stage === "needPhoto") return;    // kirim foto via tombol
  };

  const onKeyDown = (e) => {
    if (sessionLocked) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);

    const url = URL.createObjectURL(f);
    pushBot(
      <div className="img-preview fade-in">
        <img src={url} alt="lampiran" onLoad={() => URL.revokeObjectURL(url)} />
        <div className="img-caption">Foto diterima: {f.name}</div>
      </div>
    );

    // tampilkan sticky confirm bar
    setShowConfirm(true);
  };

  async function submitTicket() {
    if (!photoFile || submitting || sessionLocked) return;
    try {
      setSubmitting(true);
      pushBot(<TypingDots />);
      const res = await createTicket({
        name: userName,
        division,
        description: complaint,
        photo: photoFile,
      });
      setSubmitting(false);

      // hapus bubble "typing"
      setMessages((m) => {
        const arr = m.slice();
        if (arr.length && String(arr[arr.length - 1]?.jsx?.type?.name || "") === "TypingDots") arr.pop();
        return arr;
      });

      // sukses → kunci UI, sembunyikan confirm bar, animasi sukses
      setShowConfirm(false);
      setStage("done");

      pushBot(
        <SuccessBig
          title="Tiket Berhasil Dibuat"
          subtitle={`Nomor tiket: ${res?.ticketId ?? res?.itemId ?? "-"}`}
        />
      );
      pushBot(
        <span className="enter-pop">
          Terima kasih telah menggunakan <b>IT Helpdesk</b>. Tim IT WKI akan segera menghubungimu. 🙌
        </span>
      );
    } catch (err) {
      setSubmitting(false);
      setMessages((m) => {
        const arr = m.slice();
        if (arr.length && String(arr[arr.length - 1]?.jsx?.type?.name || "") === "TypingDots") arr.pop();
        return arr;
      });
      pushBot(<span style={{ color: "#b91c1c" }}>Gagal membuat tiket: {String(err?.message || err)}.</span>);
    }
  }

  const handleLogout = async () => {
    try {
      await instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
    } catch {
      await instance.logoutPopup({ postLogoutRedirectUri: window.location.origin });
    }
  };

  return (
    <div className="chat-root">
      {/* header ala WhatsApp */}
      <div className="chat-header glass">
        <div className="chat-peer">
          <div className="avatar pop">{displayName?.[0]?.toUpperCase() || "U"}</div>
          <div className="peer-info">
            <div className="peer-name">Helpdesk Chatbot</div>
            <div className="peer-sub"><span className="dot pulse"></span> online</div>
          </div>
        </div>

        <div className="header-right">
          <div className="user-mini">
            <span className="user-name" title={`${userName} · ${division}`}>{userName}</span>
            <span className="user-division">{division}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} aria-label="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 17l5-5-5-5v3H9v4h7v3zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5z"/>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* area pesan */}
      <div className="chat-body" ref={scroller}>
        {messages.map((m, i) => (
          <div key={i} className={`row ${m.side} enter`}>
            <div className={`bubble ${m.side === "user" ? "me" : "bot"} enter-pop`}>{m.jsx}</div>
          </div>
        ))}
        {isTyping && (
          <div className="row bot enter">
            <div className="bubble bot">
              <TypingDots />
            </div>
          </div>
        )}

        {/* input file tersembunyi */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onPickFile}
          style={{ display: "none" }}
        />
      </div>

      {/* sticky Confirm bar (muncul setelah pilih foto), auto-hilang saat done */}
      {showConfirm && !sessionLocked && (
        <div className="confirm-sticky slide-up">
          <button
            className="confirm-btn"
            onClick={submitTicket}
            disabled={submitting}
            aria-disabled={submitting}
          >
            {submitting ? "Mengirim…" : "Konfirmasi & Buat Tiket"}
          </button>
        </div>
      )}

      {/* input bar — disable setelah tiket dibuat */}
      <div className={`chat-inputbar ${sessionLocked ? "locked" : ""}`}>
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={sessionLocked}
          placeholder={sessionLocked ? "Sesi selesai. Terima kasih 🙏" : "Tulis pesan… (Enter untuk kirim)"}
          aria-label="Ketik pesan"
        />
        <button
          className="send-btn"
          onClick={handleSend}
          aria-label="Kirim"
          disabled={sessionLocked}
        >
          Kirim
        </button>
      </div>
    </div>
  );
}

/* ===================== sub-komponen UI ===================== */
function HelpCTA({ onClick }) {
  return (
    <div className="help-cta">
      <button className="help-btn bounce" onClick={onClick}>
        🆘 Tolong
      </button>
      <div className="help-hint">Klik / Ketuk tombol di atas untuk membuat tiket</div>
    </div>
  );
}

function TypingDots() {
  return <span className="typing" aria-label="Sedang mengetik"><i></i><i></i><i></i></span>;
}

function SuccessBig({ title = "Berhasil", subtitle = "" }) {
  return (
    <div className="success-card pop-big">
      <div className="check-wrap">
        <svg className="check" viewBox="0 0 52 52">
          <circle className="check__circle" cx="26" cy="26" r="25" fill="none"/>
          <path className="check__check" fill="none" d="M14 27l7 7 17-17"/>
        </svg>
      </div>
      <div className="success-title">{title}</div>
      {subtitle && <div className="success-sub">{subtitle}</div>}
    </div>
  );
}

function RecapCard({ name, complaint, division, datetime }) {
  const priority = String(division).trim().toLowerCase() === "direksi" ? "Urgent" : "Normal";
  return (
    <div className="recap card-pop enter-pop">
      <div className="recap-title">Rekap Keluhan</div>
      <div className="recap-grid">
        <div className="k">Nama</div><div className="v">{name || "-"}</div>
        <div className="k">Divisi</div><div className="v">{division || "-"}</div>
        <div className="k">Prioritas</div><div className="v"><b>{priority}</b></div>
        <div className="k">Keluhan</div><div className="v">“{complaint || "-"}”</div>
        <div className="k">Tanggal & Waktu</div><div className="v">{datetime}</div>
      </div>
    </div>
  );
}

function UploadAsk({ onPick, hasPhoto }) {
  return (
    <div className="upload-ask enter-pop">
      <div>Silakan unggah foto kondisi keluhanmu ya.</div>
      <button className="pill-btn" onClick={onPick}>{hasPhoto ? "Ganti Foto" : "Pilih Foto"}</button>
    </div>
  );
}

function DivisionPicker({ current, options, onPick }) {
  return (
    <div className="recap card-pop enter-pop">
      <div className="recap-title">Pilih Divisi</div>
      <div className="flex flex-wrap gap-8">
        {options.map((opt) => (
          <button key={opt} className={`pill-btn ${opt === current ? "active" : ""}`} onClick={() => onPick(opt)}>
            {opt}
          </button>
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-2">
        (Default: <b>{current || "Umum"}</b> — kamu bisa menggantinya di sini)
      </div>
    </div>
  );
}
