import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check, Sparkles, User } from "lucide-react";

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      display: "flex",
      gap: "10px",
      padding: "12px 14px",
      backgroundColor: isUser ? "#161b22" : "#0d1117",
      borderBottom: "1px solid #21262d",
    }}>
      {/* Role Avatar */}
      <div style={{
        width: "26px",
        height: "26px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        backgroundColor: isUser ? "#238636" : "#1f6feb",
        color: "#fff",
      }}>
        {isUser ? <User size={15} /> : <Sparkles size={15} />}
      </div>

      {/* Message Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "4px"
        }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#8b949e" }}>
            {isUser ? "You" : "Gemini Assistant"}
          </span>

          {!isUser && message.content && (
            <button
              onClick={handleCopy}
              style={{
                background: "transparent",
                border: "none",
                color: copied ? "#3fb950" : "#8b949e",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
              }}
              title="Copy response"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          )}
        </div>

        {/* Thumbnail if user attached image */}
        {message.image && (
          <img
            src={message.image}
            alt="User Screen Context"
            style={{
              maxHeight: "120px",
              borderRadius: "6px",
              marginBottom: "8px",
              border: "1px solid #30363d",
              display: "block",
            }}
          />
        )}

        {/* Formatted Content */}
        <div className="markdown-body" style={{ fontSize: "13px", lineHeight: "1.5" }}>
          <ReactMarkdown>{message.content || "..."}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}