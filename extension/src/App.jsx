import React, { useState, useEffect, useRef } from "react";
import { Camera, Monitor, Send, Trash2, Sparkles, AlertCircle } from "lucide-react";
import ChatMessage from "./components/ChatMessage";
import ScreenPreview from "./components/ScreenPreview";
import { captureCurrentTab, captureFullScreen } from "./services/screenCapture";
import { streamChatMessage, checkBackendHealth } from "./services/api";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hello! I can see your screen and help you solve coding errors, explain web pages, or assist with anything you are working on. Click **Capture Tab** or **Capture Desktop** and ask your question!",
    },
  ]);
  const [input, setInput] = useState("");
  const [screenImage, setScreenImage] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [model, setModel] = useState("gemini-3.6-flash");

  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Check if FastAPI is running
    const verifyBackend = async () => {
      const isUp = await checkBackendHealth();
      setBackendOnline(isUp);
    };
    verifyBackend();
    const interval = setInterval(verifyBackend, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCaptureTab = async () => {
    try {
      const dataUrl = await captureCurrentTab();
      setScreenImage(dataUrl);
    } catch (err) {
      alert("Tab Capture Error: " + err.message);
    }
  };

  const handleCaptureDesktop = async () => {
    try {
      const dataUrl = await captureFullScreen();
      setScreenImage(dataUrl);
    } catch (err) {
      if (!err.message.includes("canceled")) {
        alert("Screen Capture Error: " + err.message);
      }
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if ((!input.trim() && !screenImage) || isStreaming) return;

    let currentImg = screenImage;

    // Automatic Screen Capture: if no screenshot was manually selected, snap the active tab automatically
    if (!currentImg) {
      try {
        currentImg = await captureCurrentTab();
      } catch (err) {
        console.warn("Auto screen capture skipped:", err.message);
      }
    }

    const userPrompt = input.trim() || "What is on my screen? Please analyze and help.";

    // Append user message with image thumbnail
    const userMsg = { role: "user", content: userPrompt, image: currentImg };
    const botMsg = { role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
    setScreenImage(null);
    setIsStreaming(true);

    await streamChatMessage({
      prompt: userPrompt,
      imageBase64: currentImg,
      model,
      onChunk: (chunk) => {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: updated[lastIdx].content + chunk,
          };
          return updated;
        });
      },
      onDone: () => setIsStreaming(false),
      onError: (err) => {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: `⚠️ Error: ${err}`,
          };
          return updated;
        });
        setIsStreaming(false);
      },
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#0d1117" }}>
      {/* Header */}
      <header style={{
        padding: "10px 14px",
        backgroundColor: "#161b22",
        borderBottom: "1px solid #30363d",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={18} color="#58a6ff" />
          <span style={{ fontWeight: "bold", fontSize: "14px", color: "#f0f6fc" }}>Personal AI</span>
          <span style={{
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "10px",
            backgroundColor: backendOnline ? "rgba(46, 160, 67, 0.15)" : "rgba(248, 81, 73, 0.15)",
            color: backendOnline ? "#3fb950" : "#f85149",
            fontWeight: "600",
          }}>
            {backendOnline ? "Online" : "Backend Offline"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Model Selector */}
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{
              backgroundColor: "#21262d",
              color: "#c9d1d9",
              border: "1px solid #30363d",
              borderRadius: "6px",
              padding: "3px 6px",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            <option value="gemini-3.6-flash">Gemini 3.6 Flash (Latest)</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
          </select>

          {/* Reset Chat */}
          <button
            onClick={() => setMessages([messages[0]])}
            title="Clear Chat"
            style={{
              background: "transparent",
              border: "none",
              color: "#8b949e",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </header>

      {/* Backend Disconnected Warning */}
      {!backendOnline && (
        <div style={{
          backgroundColor: "#b62324",
          color: "#fff",
          padding: "6px 12px",
          fontSize: "11px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}>
          <AlertCircle size={14} />
          <span>Backend is not running. Start with: <code>python -m uvicorn app.main:app</code></span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Attached Screenshot Preview */}
      <ScreenPreview imageBase64={screenImage} onRemove={() => setScreenImage(null)} />

      {/* Bottom Action Bar & Input */}
      <div style={{
        padding: "10px",
        backgroundColor: "#161b22",
        borderTop: "1px solid #30363d",
      }}>
        {/* Screen Capture Buttons */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
          <button
            onClick={handleCaptureTab}
            style={{
              flex: 1,
              backgroundColor: "#21262d",
              border: "1px solid #30363d",
              color: "#c9d1d9",
              borderRadius: "6px",
              padding: "6px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <Camera size={14} color="#58a6ff" />
            <span>Capture Tab</span>
          </button>

          <button
            onClick={handleCaptureDesktop}
            style={{
              flex: 1,
              backgroundColor: "#21262d",
              border: "1px solid #30363d",
              color: "#c9d1d9",
              borderRadius: "6px",
              padding: "6px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <Monitor size={14} color="#a371f7" />
            <span>Capture Desktop</span>
          </button>
        </div>

        {/* Input box */}
        <form onSubmit={handleSend} style={{ display: "flex", gap: "6px" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={screenImage ? "Ask about this screen (e.g. 'Fix this code error')..." : "Ask a question or capture screen..."}
            rows={2}
            style={{
              flex: 1,
              backgroundColor: "#0d1117",
              border: "1px solid #30363d",
              borderRadius: "6px",
              color: "#e6edf3",
              padding: "8px",
              fontSize: "13px",
              resize: "none",
              outline: "none",
            }}
          />

          <button
            type="submit"
            disabled={(!input.trim() && !screenImage) || isStreaming}
            style={{
              backgroundColor: isStreaming || (!input.trim() && !screenImage) ? "#21262d" : "#238636",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              width: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isStreaming || (!input.trim() && !screenImage) ? "not-allowed" : "pointer",
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}