// src/pages/user/ChatHost.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";
import "./ChatHost.css";

/* ===================== API URL HELPER ===================== */
export function apiUrl(path = "") {
  // Gunakan URL Railway sebagai default
  const base = process.env.REACT_APP_API_BASE || "https://it-backend-production.up.railway.app/api";
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

/* ===================== API Connection Test ===================== */
/**
 * Test koneksi ke server API dengan metode GET ke endpoint yang valid
 */
async function testApiConnection() {
  try {
    // Gunakan endpoint yang lebih umum untuk test koneksi
    const url = apiUrl(""); 
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout lebih lama untuk production

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });

    clearTimeout(timeoutId);

    // Anggap berhasil jika server merespon (bahkan 404 OK)
    return response.status !== 0 && response.status < 500;
  } catch (error) {
    console.warn('API connection test failed:', error);
    return false;
  }
}

/**
 * Test koneksi periodik dengan exponential backoff
 */
function useApiConnectionTest() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const testConnection = async () => {
    try {
      const isConnected = await testApiConnection();
      setIsOnline(isConnected);
      setLastChecked(new Date());
      if (isConnected) {
        setRetryCount(0); // Reset retry count jika berhasil
      } else {
        setRetryCount(prev => prev + 1);
      }
      return isConnected;
    } catch (error) {
      console.warn('Connection test error:', error);
      setIsOnline(false);
      setLastChecked(new Date());
      setRetryCount(prev => prev + 1);
      return false;
    }
  };

  // Test koneksi saat component mount
  useEffect(() => {
    console.log("API Base URL:", apiUrl());
    console.log("Environment:", process.env.NODE_ENV);
    console.log("REACT_APP_API_BASE:", process.env.REACT_APP_API_BASE);
    
    testConnection();

    // Test koneksi dengan interval yang adaptif
    const intervalTime = isOnline ? 60000 : Math.min(30000 * Math.pow(1.5, retryCount), 120000);
    
    const interval = setInterval(() => {
      testConnection();
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isOnline, retryCount]);

  return { isOnline, lastChecked, testConnection, retryCount };
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

/** Kirim tiket ke server */
async function createTicket({ name, division = "", description, photo }) {
  // Pastikan semua field required ada
  const ticketData = {
    name: String(name || "User").trim(),
    division: String(division || "Umum").trim(),
    description: String(description || "").trim(),
    priority: String(division).trim().toLowerCase().includes("bod (urgent)") ? "Urgent" : "Normal"
  };

  // Validasi field required
  if (!ticketData.name || !ticketData.division || !ticketData.description) {
    throw new Error(`Field yang diperlukan tidak lengkap: name="${ticketData.name}", division="${ticketData.division}", description="${ticketData.description}"`);
  }

  const fd = new FormData();
  fd.append("name", ticketData.name);
  fd.append("division", ticketData.division);
  fd.append("priority", ticketData.priority);
  fd.append("description", ticketData.description);
  
  if (photo) {
    fd.append("photo", photo);
  }

  // Debug: log data yang akan dikirim
  console.log("Mengirim tiket dengan data:", ticketData);
  console.log("Photo file:", photo);
  console.log("API URL:", apiUrl("/tickets"));

  const url = apiUrl("/tickets");
  
  try {
    const response = await fetch(url, {
      method: "POST",
      body: fd,
      credentials: 'include',
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      let errorText = "Unknown error";
      try {
        errorText = await response.text();
        // Coba parse sebagai JSON jika mungkin
        const errorJson = JSON.parse(errorText);
        errorText = errorJson.message || errorJson.error || errorText;
      } catch (e) {
        // Jika bukan JSON, gunakan text biasa
        errorText = `HTTP ${response.status} - ${response.statusText}`;
      }
      throw new Error(`Gagal membuat tiket (HTTP ${response.status}): ${errorText}`);
    }

    const contentType = response.headers.get("content-type");
    let result;
    
    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const textResult = await response.text();
      console.warn("Response bukan JSON:", textResult);
      result = { success: true, message: "Tiket berhasil dibuat" };
    }
    
    console.log("Ticket created successfully:", result);
    return result;
  } catch (error) {
    console.error("Error creating ticket:", error);
    
    // Handle CORS errors specifically
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error(`Gagal terhubung ke server. Pastikan backend di ${url} dapat diakses dan mengizinkan CORS.`);
    }
    
    throw new Error(`Gagal membuat tiket: ${error.message}`);
  }
}

/** Ambil nama & divisi dari MSAL claims (sinkron). */
function readProfileFromMsal(accounts) {
  const a = accounts?.[0];
  const c = a?.idTokenClaims || {};
  const name = a?.name || c.name || c.given_name || a?.username || c.preferred_username || "User";
  const division = c.department || c.division || c.jobTitle || "Umum";
  return { 
    name: String(name || "User").trim(), 
    division: String(division || "Umum").trim() 
  };
}

/* ===================== sub-komponen UI ===================== */
function HelpCTA({ onClick, disabled = false }) {
  return (
    <div className="help-cta">
      <button 
        className={`help-btn ${disabled ? "disabled" : "bounce"}`} 
        onClick={onClick}
        disabled={disabled}
      >
        🆘 Tolong
      </button>
      <div className="help-hint">
        {disabled 
          ? "Server sedang offline. Silakan coba lagi nanti." 
          : "Klik / Ketuk tombol di atas untuk membuat tiket"
        }
      </div>
    </div>
  );
}

function ConnectionStatus({ isOnline, lastChecked }) {
  return (
    <div className={`connection-status ${isOnline ? "online" : "offline"}`}>
      <span className="status-dot"></span>
      {isOnline ? "Server online" : "Server offline"}
      {lastChecked && (
        <span className="last-checked">
          • {lastChecked.toLocaleTimeString()}
        </span>
      )}
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

function UploadAsk({ onPick, hasPhoto, disabled = false }) {
  return (
    <div className="upload-ask enter-pop">
      <div>Silakan unggah foto kondisi keluhanmu ya.</div>
      <button 
        className={`pill-btn ${disabled ? "disabled" : ""}`} 
        onClick={onPick}
        disabled={disabled}
      >
        {hasPhoto ? "Ganti Foto" : "Pilih Foto"}
      </button>
    </div>
  );
}

function DivisionPicker({ current, options, onPick, disabled = false }) {
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
                    className={`division-option ${opt === current ? "active" : ""} ${disabled ? "disabled" : ""}`}
                    onClick={() => !disabled && onPick(opt)}
                    disabled={disabled}
                  >
                    {opt}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="division-note">
        {disabled ? (
          "Server offline - tidak dapat melanjutkan"
        ) : (
          <>Default: <b>{current || "Umum"}</b> — kamu bisa menggantinya di sini</>
        )}
      </div>
    </div>
  );
}

/* ===================== komponen utama ===================== */
export default function ChatHost() {
  const { instance, accounts } = useMsal();

  // Test koneksi API
  const { isOnline, lastChecked, testConnection } = useApiConnectionTest();

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

  // UI lock ketika tiket sudah dibuat atau server offline di awal
  const sessionLocked = stage === "done" || (!isOnline && stage === "start");

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
      
      if (!isOnline) {
        pushBot(
          <div className="warning-message">
            <strong>Peringatan:</strong> Server Helpdesk sedang offline. 
            Kamu masih bisa membuat tiket, tetapi akan dikirim ketika koneksi pulih.
          </div>
        );
      }
      
      pushBot(
        <div className="fade-in">
          {isOnline 
            ? "Klik / ketuk tombol di bawah ini untuk menyampaikan keluhanmu."
            : "Klik tombol di bawah untuk membuat tiket offline (akan dikirim nanti)."
          }
          <HelpCTA onClick={startFlow} disabled={sessionLocked} />
        </div>
      );
      setIsTyping(false);
      setStage("start");
      setShowChatInput(false);
      setError(null);
      scrollToBottom();
    }, 400);
  }, [displayName, isOnline]);

  function startFlow() {
    if (sessionLocked) return;

    if (!isOnline) {
      // Mode offline - tetap lanjut tapi dengan peringatan
      pushBot(
        <div className="warning-message">
          <strong>Mode Offline:</strong> Tiket akan disimpan secara lokal dan dikirim ketika server online.
        </div>
      );
    }

    setIsTyping(true);
    setTimeout(() => {
      pushUser("🆘 Tolong");
      pushBot(
        <span className="slide-up">
          {isOnline 
            ? "Siapkan detailnya ya. Silakan tulis keluhanmu."
            : "Mode offline. Silakan tulis keluhanmu (akan dikirim nanti)."
          }
        </span>
      );
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
                  pushBot(<RecapCard name={userName} complaint={complaint} division={val} datetime={nowStr()} />);
                  pushBot(
                    <UploadAsk 
                      onPick={() => fileInputRef.current?.click()} 
                      hasPhoto={!!photoFile}
                      disabled={!isOnline}
                    />
                  );
                  setStage("needPhoto");
                  setIsTyping(false);
                  
                  // Auto-show confirm jika offline (karena tidak perlu upload foto)
                  if (!isOnline) {
                    setShowConfirm(true);
                  }
                }, 200);
              }}
              disabled={!isOnline}
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
    if (sessionLocked) return;
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

  // Helper untuk convert file ke base64 (offline mode)
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  async function submitTicket() {
    if (submitting || stage === "done") return;

    try {
      setSubmitting(true);
      setError(null);
      
      // Validasi data sebelum mengirim - PASTIKAN SEMUA FIELD ADA
      const ticketData = {
        name: userName || "User",
        division: division || "Umum",
        description: complaint || "",
        photo: photoFile
      };

      console.log("Data tiket yang akan dikirim:", ticketData);

      if (!ticketData.name || !ticketData.division || !ticketData.description) {
        throw new Error(`Data tidak lengkap: name="${ticketData.name}", division="${ticketData.division}", description="${ticketData.description}"`);
      }

      if (isOnline) {
        pushBot(<TypingDots />);

        const res = await createTicket({
          name: ticketData.name,
          division: ticketData.division,
          description: ticketData.description,
          photo: ticketData.photo
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
            subtitle={`Nomor tiket: ${res?.ticket?.ticketNo || res?.ticketId || "-"}`}
          />
        );

        pushBot(
          <span className="enter-pop">
            Terima kasih telah menggunakan <b>IT Helpdesk</b>. Tim IT WKI akan segera menghubungimu. 🙌
          </span>
        );
      } else {
        // Mode offline - simpan ke localStorage
        const offlineTicket = {
          name: ticketData.name,
          division: ticketData.division,
          description: ticketData.description,
          photo: ticketData.photo ? await fileToBase64(ticketData.photo) : null,
          createdAt: new Date().toISOString(),
          status: 'pending'
        };

        const existingTickets = JSON.parse(localStorage.getItem('offlineTickets') || '[]');
        existingTickets.push(offlineTicket);
        localStorage.setItem('offlineTickets', JSON.stringify(existingTickets));

        setSubmitting(false);
        setShowConfirm(false);
        setStage("done");

        pushBot(
          <SuccessBig
            title="Tiket Disimpan (Offline)"
            subtitle="Tiket akan dikirim otomatis ketika server online"
          />
        );

        pushBot(
          <span className="enter-pop">
            Tiket telah disimpan secara offline. Akan dikirim otomatis ketika koneksi pulih. 🙌
          </span>
        );
      }
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

  const retryConnection = async () => {
    setIsTyping(true);
    pushBot(<span>Memeriksa koneksi server...</span>);
    
    try {
      const connected = await testConnection();
      
      setIsTyping(false);
      if (connected) {
        pushBot(<span className="success-message">Koneksi berhasil dipulihkan! 🎉</span>);
        
        // Jika sebelumnya offline dan sekarang online, refresh UI state
        if (!isOnline) {
          // Optional: reload page untuk reset state
          window.location.reload();
        }
      } else {
        pushBot(
          <div className="error-message">
            Server masih offline. 
            <div style={{ marginTop: "8px", fontSize: "12px" }}>
              Pastikan backend di <code>https://it-backend-production.up.railway.app</code> sedang berjalan.
            </div>
          </div>
        );
      }
    } catch (error) {
      setIsTyping(false);
      pushBot(
        <div className="error-message">
          Error saat test koneksi: {error.message}
        </div>
      );
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
            <ConnectionStatus isOnline={isOnline} lastChecked={lastChecked} />
          </div>
        </div>

        <div className="header-right">
          <div className="user-mini">
            <span className="user-name" title={`${userName} · ${division}`}>{userName}</span>
            <span className="user-division">{division}</span>
          </div>
          {!isOnline && (
            <button className="retry-btn" onClick={retryConnection} title="Coba koneksi lagi">
              🔄 Retry
            </button>
          )}
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
          disabled={!isOnline}
        />
      </div>

      {/* sticky Confirm bar (muncul setelah pilih foto), auto-hilang saat done */}
      {showConfirm && stage !== "done" && (
        <div className="confirm-sticky slide-up">
          <button
            className="confirm-btn"
            onClick={submitTicket}
            disabled={submitting}
            aria-disabled={submitting}
          >
            {submitting 
              ? "Mengirim…" 
              : isOnline 
                ? "Konfirmasi & Buat Tiket" 
                : "Simpan Tiket (Offline)"
            }
          </button>
        </div>
      )}

      {/* input bar — disable setelah tiket dibuat atau server offline */}
      <div className={`chat-inputbar ${!showChatInput || sessionLocked ? "hidden" : ""}`}>
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={sessionLocked || !showChatInput}
          placeholder={
            !isOnline && stage === "start" ? "Server offline - tunggu koneksi pulih" :
            sessionLocked ? "Sesi selesai. Terima kasih 🙏" : 
            "Tulis pesan… (Enter untuk kirim)"
          }
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