// src/pages/user/ChatHost.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";
import "./ChatHost.css";

/* ===================== ENV SAFE (Vite & CRA) ===================== */
function readEnvSafe(viteKey, craKey) {
  let viteEnv = {};
  try {
    // hindari parser error pada CRA: akses via eval
    // eslint-disable-next-line no-eval
    viteEnv = eval("import.meta && import.meta.env") || {};
  } catch {
    viteEnv = {};
  }
  const craEnv = (typeof process !== "undefined" && process.env) || {};
  return viteEnv[viteKey] ?? craEnv[craKey] ?? "";
}

const API_BASE_RAW = (readEnvSafe("VITE_API_BASE", "REACT_APP_API_BASE") || "/api").trim();
const API_BASE = API_BASE_RAW.replace(/\/+$/, ""); // buang trailing slash
const IS_ABSOLUTE = /^https?:\/\//i.test(API_BASE);
const CREDENTIALS_MODE = IS_ABSOLUTE ? "include" : "same-origin";

function apiUrl(path) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/* ===================== helpers ===================== */
const yesWords = new Set([
  "ya","iya","y","yaaa","ok","oke","baik","siap","betul","benar","yup",
  "yaudah","silakan","lanjut"
]);
const nowStr = () => new Date().toLocaleString();

const DIVISION_OPTIONS = [
  "BOD (Urgent)",
  "Sekretarian Perusahaan",
  "Internal Audit",
  "Keuangan",
  "Akuntansi",
  "HCM",
  "Manajemen Risiko",
  "Legal",
  "Pemasaran",
  "Produksi & Peralatan",
  "Pengembangan Bisnis & Portofolio",
  "TI & System",
  "QHSE",
  "Pengendalian Proyek & SCM",
  "Produksi & Peralatan WS 1",
  "Produksi & Peralatan WS 2",
  "WS 1",
  "WS 2",
  "WWE",
  "WSE",
  "Project Coordinator",
  "Proyek"
];

/** Kirim tiket ke server — 1 base saja (mengikuti proxy / env) */
async function createTicket({ name, division = "", description, photo }) {
  const priority = String(division).trim().toLowerCase().includes("bod (urgent)") ? "Urgent" : "Normal";
  const fd = new FormData();
  fd.append("name", name || "User");
  fd.append("division", division || "Umum");
  fd.append("priority", priority);
  fd.append("description", description || "");
  fd.append("desc", description || "");
  if (photo) fd.append("photo", photo);

  const url = apiUrl("/api/tickets");
  const r = await fetch(url, { method: "POST", body: fd, credentials: CREDENTIALS_MODE }).catch((e) => {
    throw new Error("Network error: " + e.message);
  });

  const ct = r.headers.get("content-type") || "";
  const j = ct.includes("application/json") ? await r.json() : {};
  if (!r.ok || j?.ok === false) {
    // tampilkan sebagian isi body kalau non-JSON
    if (!ct.includes("application/json")) {
      const head = (await r.text().catch(() => "")).slice(0, 120).replace(/\s+/g, " ");
      throw new Error(`Gagal membuat tiket (HTTP ${r.status}): ${head}`);
    }
    throw new Error(j?.error || `Gagal membuat tiket (HTTP ${r.status})`);
  }
  return j; // { ok:true, ticketId, ... }
}

/** Ambil nama & divisi dari MSAL claims (sinkron). */
function readProfileFromMsal(accounts) {
  const a = accounts?.[0];
  const c = a?.idTokenClaims || {};
  const name = a?.name || c.name || c.given_name || a?.username || c.preferred_username || "User";
  const division = c.department || c.division || c.jobTitle || "Umum";
  return { name: String(name), division: String(division) };
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
  const priority = String(division).trim().toLowerCase().includes("bod (urgent)") ? "Urgent" : "Normal";
  return (
    <div className="recap card-pop enter-pop">
      <div className="recap-title">Rekap Keluhan</div>
      <div className="recap-grid">
        <div className="k">Nama</div><div className="v">{name || "-"}</div>
        <div className="k">Divisi</div><div className="v">{division || "-"}</div>
        <div className="k">Prioritas</div><div className="v"><b>{priority}</b></div>
        <div className="k">Keluhan</div><div className="v">"{complaint || "-"}"</div>
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
  const divisionGroups = {
    "Manajemen & Direksi": ["BOD (Urgent)", "Sekretarian Perusahaan", "Internal Audit"],
    "Keuangan & Akuntansi": ["Keuangan", "Akuntansi"],
    "Sumber Daya Manusia": ["HCM", "Manajemen Risiko"],
    "Bisnis & Hukum": ["Legal", "Pemasaran", "Pengembangan Bisnis & Portofolio"],
    "Teknologi & Sistem": ["TI & System", "Project Coordinator", "Proyek"],
    "Operasional & Produksi": [
      "Produksi & Peralatan", 
      "Produksi & Peralatan WS 1", 
      "Produksi & Peralatan WS 2",
      "WS 1",
      "WS 2",
      "WWE",
      "WSE"
    ],
    "Kualitas & Pengendalian": ["QHSE", "Pengendalian Proyek & SCM"]
  };

  return (
    <div className="division-picker card-pop enter-pop">
      <div className="division-picker-title">Pilih Divisi</div>
      <div className="division-grid">
        {Object.entries(divisionGroups).map(([groupName, groupOptions]) => (
          <div key={groupName} className="division-group">
            <div className="division-group-title">{groupName}</div>
            <div className="division-options">
              {groupOptions
                .filter(opt => options.includes(opt))
                .map((opt) => (
                  <button
                    key={opt}
                    className={`division-option ${opt === current ? "active" : ""}`}
                    onClick={() => onPick(opt)}
                  >
                    {opt}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="division-note">
        (Default: <b>{current || "Umum"}</b> — kamu bisa menggantinya di sini)
      </div>
    </div>
  );
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
  const [showChatInput, setShowChatInput] = useState(false);
  const [error, setError] = useState(null);

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
      setShowChatInput(false);
      setError(null);
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
      setShowChatInput(true);
      setError(null);
    }, 200);
  }

  const handleSend = () => {
    if (sessionLocked) return;
    const text = input.trim();
    if (!text) return;

    pushUser(text);
    setInput("");
    setError(null);

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
            Oke, keluhan kamu: <b>{text}</b>. Apakah itu saja? Ketik <b>"ya"</b> untuk konfirmasi
            atau <b>"tidak"</b> untuk menambahkan.
          </span>
        );
        setStage("confirmComplaint");
        setIsTyping(false);
      }, 250);
      return;
    }

    if (stage === "confirmComplaint") {
      if (yesWords.has(text.toLowerCase())) {
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

    if (stage === "needDivision") return;
    if (stage === "needPhoto") return;
  };

  const onKeyDown = (e) => {
    if (sessionLocked || !showChatInput) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > 5 * 1024 * 1024) {
      setError("Ukuran file terlalu besar. Maksimal 5MB.");
      return;
    }
    if (!f.type.startsWith("image/")) {
      setError("Hanya file gambar yang diizinkan.");
      return;
    }

    setPhotoFile(f);
    setError(null);

    const url = URL.createObjectURL(f);
    pushBot(
      <div className="img-preview fade-in">
        <img src={url} alt="lampiran" onLoad={() => URL.revokeObjectURL(url)} />
        <div className="img-caption">Foto diterima: {f.name}</div>
      </div>
    );

    setShowConfirm(true);
  };

  async function submitTicket() {
    if (!photoFile || submitting || sessionLocked) return;

    try {
      setSubmitting(true);
      setError(null);
      pushBot(<TypingDots />);

      const res = await createTicket({
        name: userName,
        division,
        description: complaint,
        photo: photoFile,
      });

      setSubmitting(false);

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
      setError(err.message);

      setMessages((m) => {
        const arr = m.slice();
        if (arr.length && String(arr[arr.length - 1]?.jsx?.type?.name || "") === "TypingDots") arr.pop();
        return arr;
      });

      pushBot(
        <div className="error-message">
          <strong>Gagal membuat tiket:</strong> {String(err?.message || "Terjadi kesalahan tidak terduga")}
          <div style={{ marginTop: "8px", fontSize: "12px" }}>
            Silakan hubungi IT support langsung atau coba lagi nanti.
          </div>
        </div>
      );
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
      <div className={`chat-inputbar ${!showChatInput || sessionLocked ? "hidden" : ""}`}>
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={sessionLocked || !showChatInput}
          placeholder={sessionLocked ? "Sesi selesai. Terima kasih 🙏" : "Tulis pesan… (Enter untuk kirim)"}
          aria-label="Ketik pesan"
        />
        <button
          className="send-btn"
          onClick={handleSend}
          aria-label="Kirim"
          disabled={sessionLocked || !showChatInput || !input.trim()}
        >
          Kirim
        </button>
      </div>
    </div>
  );
}