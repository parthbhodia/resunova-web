import React, { useEffect, useRef, useState } from "react";
import { CLData, CLRecipient, CLAuthor, CLContent } from "./types";

interface Props {
  field: string;
  data: CLData;
  rect: DOMRect | null;
  onClose: () => void;
  onUpdate: (cat: 'recipient'|'author'|'content', key: string, val: string) => void;
}

export function CoverLetterEditOverlay({ field, data, rect, onClose, onUpdate }: Props) {
  const [val, setVal] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const parts = field.split(".");
    if (parts.length === 2) {
      const cat = parts[0] as keyof CLData;
      const key = parts[1];
      const categoryData = data[cat] as unknown as Record<string, string>;
      setVal(categoryData?.[key] || "");
    }
  }, [field, data]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      // Initial height adjustment
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = inputRef.current.scrollHeight + "px";
    }
  }, []);

  if (!rect) return null;

  const handleBlur = () => {
    const parts = field.split(".");
    if (parts.length === 2) {
      onUpdate(parts[0] as 'recipient'|'author'|'content', parts[1], val);
    }
    onClose();
  };

  // Clamp position so overlay never goes off-screen
  // Cap the overlay width to prevent it from spanning the whole screen
  const OVERLAY_W = Math.min(Math.max(rect.width + 16, 260), 500);
  const OVERLAY_H = 160; // approximate max height
  
  const rawTop = rect.top - 8;
  const rawLeft = rect.left - 8;
  const clampedTop = Math.min(rawTop, window.innerHeight - OVERLAY_H - 24);
  
  // Because the app shell has a sidebar, 'position: fixed' might be relative to a transformed parent.
  // To absolutely ensure it doesn't go off the right side of the screen, we forcefully cap its max left position.
  const clampedLeft = Math.min(rawLeft, 250); 
  
  const finalTop = Math.max(12, clampedTop);
  const finalLeft = Math.max(12, clampedLeft);

  return (
    <>
      {/* Invisible backdrop to capture clicks outside */}
      <div 
        style={{ position: "fixed", inset: 0, zIndex: 40 }} 
        onMouseDown={handleBlur}
      />
      <div 
        style={{
          position: "fixed",
          top: finalTop,
          left: finalLeft,
          width: OVERLAY_W,
          zIndex: 50,
          background: "var(--surface)",
          border: "1px solid var(--accent)",
          borderRadius: "8px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          padding: "8px",
        }}
      >
        <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", marginBottom: "4px", fontWeight: "bold" }}>
          Editing {(field.split(".")[1] || field).replace(/([A-Z])/g, ' $1').trim()}
        </div>
        {field.includes(".") ? (
          <textarea
            ref={inputRef}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = target.scrollHeight + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") handleBlur();
            }}
            style={{
              width: "100%",
              background: "var(--bg)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "8px",
              fontSize: "13px",
              minHeight: "60px",
              maxHeight: "400px",
              outline: "none",
              resize: "none",
              fontFamily: "inherit",
              boxSizing: "border-box"
            }}
          />
        ) : (
          <div style={{ padding: "8px", fontSize: "13px", color: "var(--muted)" }}>
            Please use the left panel to edit this grouped section.
          </div>
        )}
        <div style={{ fontSize: "10px", color: "var(--dim)", marginTop: "4px", textAlign: "right" }}>
          Click away to close • Esc to close
        </div>
      </div>
    </>
  );
}
