import React, { useState, useEffect } from 'react';

export default function Chatbot() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  // Fungsi untuk mengirim pesan
  const sendMessage = async () => {
    if (input.trim() === "") return;

    setMessages((prevMessages) => [...prevMessages, { side: 'user', text: input }]);
    setInput('');
    setIsTyping(true);

    try {
      // Kirim permintaan ke server untuk mendapatkan respons dari model
      const response = await fetch('http://localhost:4000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();
      setMessages((prevMessages) => [...prevMessages, { side: 'bot', text: data.reply }]);
    } catch (error) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { side: 'bot', text: 'Maaf, ada masalah dengan server.' },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Efek untuk scroll ke bawah ketika pesan baru diterima
  useEffect(() => {
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }, [messages]);

  return (
    <div className="chat-window" id="chatWindow" style={{ maxHeight: '80vh', overflowY: 'scroll' }}>
      {messages.map((msg, index) => (
        <div key={index} className={msg.side}>
          <div className="message">{msg.text}</div>
        </div>
      ))}
      {isTyping && <div>...</div>}

      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tulis pesan..."
        />
        <button onClick={sendMessage}>Kirim</button>
      </div>
    </div>
  );
}
