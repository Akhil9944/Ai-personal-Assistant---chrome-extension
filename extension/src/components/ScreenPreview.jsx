import React from "react";
import { X, Image as ImageIcon } from "lucide-react";

export default function ScreenPreview({ imageBase64, onRemove }) {
  if (!imageBase64) return null;

  return (
    <div style={{
      position: "relative",
      display: "inline-block",
      margin: "8px 12px",
      borderRadius: "8px",
      border: "1px solid #388bfd",
      overflow: "hidden",
      backgroundColor: "#161b22",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "4px 8px",
        fontSize: "11px",
        color: "#58a6ff",
        backgroundColor: "rgba(56, 139, 253, 0.1)",
        gap: "4px",
      }}>
        <ImageIcon size={13} />
        <span>Screen Attached</span>
      </div>

      <img
        src={imageBase64}
        alt="Screen Capture Preview"
        style={{
          display: "block",
          maxHeight: "90px",
          width: "auto",
          objectFit: "contain",
        }}
      />

      <button
        onClick={onRemove}
        title="Remove screenshot"
        style={{
          position: "absolute",
          top: "4px",
          right: "4px",
          background: "rgba(13, 17, 23, 0.8)",
          border: "none",
          borderRadius: "50%",
          width: "20px",
          height: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#f85149",
        }}
      >
        <X size={13} />
      </button>
    </div>
  );
}