"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Save, Undo2, Eraser, Type, Pencil, Palette } from "lucide-react";
  
export type AnnotatorMode = "draw" | "text";

type Props = {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onSave: (annotatedFile: File) => void;
};

type StrokePoint = { x: number; y: number };

type Action =
  | {
      type: "stroke";
      color: string;
      size: number;
      points: StrokePoint[];
    }
  | {
      type: "text";
      color: string;
      size: number; // font size px
      text: string;
      x: number;
      y: number;
    };

export default function ImageAnnotatorModal({ open, file, onClose, onSave }: Props) {
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mode, setMode] = useState<AnnotatorMode>("draw");
  const [color, setColor] = useState<string>("#ef4444"); // rose-500
  const [size, setSize] = useState<number>(4);
  const [actions, setActions] = useState<Action[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[]>([]);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Track both canvas coords (for drawing) and CSS coords (for placing the input card)
  const [pendingTextCanvasPos, setPendingTextCanvasPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingTextCssPos, setPendingTextCssPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingText, setPendingText] = useState<string>("");
  // Edit existing text state
  const [editTextIndex, setEditTextIndex] = useState<number | null>(null);
  const [editTextColor, setEditTextColor] = useState<string>("#ef4444");
  const [editTextSize, setEditTextSize] = useState<number>(24);
  const [textEditorCssPos, setTextEditorCssPos] = useState<{ x: number; y: number } | null>(null);

  // Load image element when file changes
  useEffect(() => {
    if (!open || !file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      setImageLoaded(true);
    };
    img.onerror = () => {
      setImageLoaded(false);
    };
    img.src = url;
    return () => {
      URL.revokeObjectURL(url);
      setImgEl(null);
      setImageLoaded(false);
      setActions([]);
      setCurrentStroke([]);
      setPendingText("");
      setPendingTextCanvasPos(null);
      setPendingTextCssPos(null);
    };
  }, [open, file]);

  // Resize overlay canvas to image natural size
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || !imgEl) return;
    canvas.width = imgEl.naturalWidth || imgEl.width;
    canvas.height = imgEl.naturalHeight || imgEl.height;
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgEl]);

  // Redraw whenever actions change
  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  function redraw() {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // reapply actions
    for (const a of actions) {
      if (a.type === "stroke") {
        ctx.strokeStyle = a.color;
        ctx.lineWidth = a.size;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let i = 0; i < a.points.length; i++) {
          const p = a.points[i];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      } else if (a.type === "text") {
        ctx.fillStyle = a.color;
        ctx.font = `${a.size}px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
        ctx.textBaseline = "top";
        wrapText(ctx, a.text, a.x, a.y, Math.max(200, canvas.width * 0.5), a.size + 6);
      }
    }
  }

  function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) {
    const words = text.split(/\s+/);
    let line = "";
    let cursorY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, cursorY);
        line = words[n] + " ";
        cursorY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, cursorY);
  }

  function measureTextBlock(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    lineHeight: number
  ): { width: number; height: number; lines: string[] } {
    const words = text.split(/\s+/);
    let line = "";
    const lines: string[] = [];
    let maxLineWidth = 0;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(line.trimEnd());
        maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
        line = words[n] + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line.trimEnd());
    maxLineWidth = Math.max(maxLineWidth, ...lines.map((ln) => ctx.measureText(ln).width));
    const height = lines.length * lineHeight;
    return { width: maxLineWidth, height, lines };
  }

  function toCanvasCoords(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = overlayRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y };
  }

  function toCssCoords(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = overlayRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!overlayRef.current || !imgEl) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const ptCanvas = toCanvasCoords(e);
    const ptCss = toCssCoords(e);
    const canvas = overlayRef.current!;
    const ctx = canvas.getContext("2d");
    // Hit-test existing texts first (top-most)
    if (ctx) {
      for (let i = actions.length - 1; i >= 0; i--) {
        const a = actions[i];
        if (a.type !== "text") continue;
        ctx.font = `${a.size}px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
        const maxWidth = Math.max(200, canvas.width * 0.5);
        const lineHeight = a.size + 6;
        const m = measureTextBlock(ctx, a.text, maxWidth, lineHeight);
        const rect = { x: a.x, y: a.y, w: Math.ceil(m.width), h: Math.ceil(m.height) };
        if (
          ptCanvas.x >= rect.x &&
          ptCanvas.x <= rect.x + rect.w &&
          ptCanvas.y >= rect.y &&
          ptCanvas.y <= rect.y + rect.h
        ) {
          // Open editor for this text
          setEditTextIndex(i);
          setEditTextColor(a.color);
          setEditTextSize(a.size);
          const cRect = canvas.getBoundingClientRect();
          const scaleX = cRect.width / canvas.width;
          const scaleY = cRect.height / canvas.height;
          let cssLeft = rect.x * scaleX;
          let cssTop = Math.max(0, (rect.y - 32) * scaleY);
          // Clamp editor within container
          const contRect = containerRef.current?.getBoundingClientRect();
          const approxW = 280; const approxH = 90;
          if (contRect) {
            cssLeft = Math.max(8, Math.min(cssLeft, contRect.width - approxW - 8));
            cssTop = Math.max(8, Math.min(cssTop, contRect.height - approxH - 8));
          }
          setTextEditorCssPos({ x: cssLeft, y: cssTop });
          return;
        }
      }
    }
    // If not clicking on existing text
    if (mode === "draw") {
      setIsDrawing(true);
      setCurrentStroke([ptCanvas]);
      return;
    }
    // In text mode, open input card to add new text at tap location
    if (mode === "text") {
      // Clamp input card within container
      const contRect = containerRef.current?.getBoundingClientRect();
      let cssX = ptCss.x + 8;
      let cssY = ptCss.y + 8;
      const approxW = 280;
      const approxH = 80;
      if (contRect) {
        cssX = Math.max(8, Math.min(cssX, contRect.width - approxW - 8));
        cssY = Math.max(8, Math.min(cssY, contRect.height - approxH - 8));
      }
      setPendingTextCanvasPos(ptCanvas);
      setPendingTextCssPos({ x: cssX, y: cssY });
      setPendingText("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || mode !== "draw") return;
    const pt = toCanvasCoords(e);
    setCurrentStroke((prev) => [...prev, pt]);
    // draw incrementally for responsiveness
    const canvas = overlayRef.current!;
    const ctx = canvas.getContext("2d")!;
    const seg = currentStroke.concat([pt]);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = Math.max(0, seg.length - 3); i < seg.length; i++) {
      const p = seg[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (mode === "draw" && isDrawing && currentStroke.length > 0) {
      setActions((prev) => [
        ...prev,
        { type: "stroke", color, size, points: currentStroke },
      ]);
      setIsDrawing(false);
      setCurrentStroke([]);
    }
  }

  function undo() {
    setActions((prev) => prev.slice(0, -1));
  }

  function clearAll() {
    setActions([]);
    setCurrentStroke([]);
  }

  function commitText() {
    if (!pendingTextCanvasPos) return;
    const txt = (pendingText || "").trim();
    if (!txt) {
      setPendingText("");
      setPendingTextCanvasPos(null);
      setPendingTextCssPos(null);
      return;
    }
    setActions((prev) => [
      ...prev,
      { type: "text", color, size: Math.max(12, size * 4), text: txt, x: pendingTextCanvasPos.x, y: pendingTextCanvasPos.y },
    ]);
    setPendingText("");
    setPendingTextCanvasPos(null);
    setPendingTextCssPos(null);
  }

  async function saveAnnotated() {
    if (!imgEl) return;
    // Compose final image at natural size
    const out = document.createElement("canvas");
    out.width = imgEl.naturalWidth || imgEl.width;
    out.height = imgEl.naturalHeight || imgEl.height;
    const ctx = out.getContext("2d")!;
    // base image
    ctx.drawImage(imgEl, 0, 0, out.width, out.height);
    // overlay: redraw actions deterministically
    for (const a of actions) {
      if (a.type === "stroke") {
        ctx.strokeStyle = a.color;
        ctx.lineWidth = a.size;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let i = 0; i < a.points.length; i++) {
          const p = a.points[i];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      } else if (a.type === "text") {
        ctx.fillStyle = a.color;
        ctx.font = `${a.size}px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
        ctx.textBaseline = "top";
        wrapText(ctx, a.text, a.x, a.y, Math.max(200, out.width * 0.5), a.size + 6);
      }
    }
    const blob: Blob | null = await new Promise((resolve) => out.toBlob((b) => resolve(b), "image/jpeg", 0.92));
    if (!blob) return;
    const annotated = new File([blob], `${file?.name?.replace(/\.(jpg|jpeg|png)$/i, "") || "salvage"}-annotated.jpg`, { type: "image/jpeg" });
    onSave(annotated);
  }

  if (!open || !file) return null;

  // compute display sizing: fit within viewport (mobile friendly)
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl h-[96dvh] sm:h-[90vh] mx-0 sm:mx-2 rounded-none sm:rounded-2xl bg-white shadow-xl ring-1 ring-black/10 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ${mode === "draw" ? "bg-rose-600 text-white ring-rose-600" : "bg-white text-gray-700 ring-gray-200"}`}
              onClick={() => setMode("draw")}
              title="Draw"
            >
              <Pencil className="h-4 w-4" /> Draw
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ${mode === "text" ? "bg-rose-600 text-white ring-rose-600" : "bg-white text-gray-700 ring-gray-200"}`}
              onClick={() => setMode("text")}
              title="Add Text"
            >
              <Type className="h-4 w-4" /> Text
            </button>
            <div className="flex items-center gap-2 ml-2">
              <Palette className="h-4 w-4 text-gray-500" />
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-6 w-8 cursor-pointer" />
              <input type="range" min={1} max={20} step={1} value={size} onChange={(e) => setSize(parseInt(e.target.value))} className="w-28" />
              <span className="text-xs text-gray-600 w-8">{size}px</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={undo} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50" title="Undo">
              <Undo2 className="h-4 w-4" /> Undo
            </button>
            <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50" title="Clear">
              <Eraser className="h-4 w-4" /> Clear
            </button>
            <button type="button" onClick={saveAnnotated} className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white ring-1 ring-rose-600 hover:bg-rose-500" title="Save">
              <Save className="h-4 w-4" /> Save
            </button>
            <button type="button" onClick={onClose} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50" title="Close">
              <X className="h-4 w-4" /> Close
            </button>
          </div>
        </div>

        {/* Canvas area */}
        <div ref={containerRef} className="relative flex-1 bg-gray-900/5 overflow-auto p-2">
          <div className="relative mx-auto" style={{ maxWidth: "100%", width: "fit-content" }}>
            {/* Base image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {imgEl && (
              <img
                src={imgEl.src}
                alt={file?.name || "image"}
                className="block max-h-[70dvh] sm:max-h-[72vh] w-auto h-auto max-w-full select-none"
                draggable={false}
              />
            )}
            {/* Overlay canvas; sized to image's natural dimensions; scaled by CSS with the img */}
            <canvas
              ref={overlayRef}
              className="absolute inset-0 w-full h-full [image-rendering:pixelated] cursor-crosshair"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
            {/* Anchored text input overlay with Add/Cancel */}
            {pendingTextCssPos && (
              <div className="absolute z-20" style={{ left: pendingTextCssPos.x, top: pendingTextCssPos.y }}>
                <div className="rounded-lg border border-gray-200 bg-white/95 p-2 shadow-lg ring-1 ring-black/5 w-[240px] sm:w-[280px]">
                  <input
                    ref={inputRef}
                    value={pendingText}
                    onChange={(e) => setPendingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitText();
                      if (e.key === "Escape") {
                        setPendingText("");
                        setPendingTextCanvasPos(null);
                        setPendingTextCssPos(null);
                      }
                    }}
                    placeholder="Type here..."
                    className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs sm:text-sm shadow focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-gray-100 px-2 py-1 text-[11px] sm:text-xs text-gray-700 hover:bg-gray-200"
                      onClick={() => {
                        setPendingText("");
                        setPendingTextCanvasPos(null);
                        setPendingTextCssPos(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-rose-600 px-2 py-1 text-[11px] sm:text-xs font-semibold text-white hover:bg-rose-500"
                      onClick={commitText}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Per-text toolbar (eraser + X delete) anchored near each text */}
            {overlayRef.current && actions
              .map((a, i) => ({ a, i }))
              .filter(({ a }) => a.type === "text")
              .map(({ a, i }) => {
                const canvas = overlayRef.current!;
                const rect = canvas.getBoundingClientRect();
                const scaleX = rect.width / canvas.width;
                const scaleY = rect.height / canvas.height;
                const cssLeft = (a as any).x * scaleX;
                const cssTop = (a as any).y * scaleY;
                return (
                  <div key={`txtctl-${i}`} className="absolute z-20" style={{ left: cssLeft, top: Math.max(0, cssTop - 28) }}>
                    <div className="inline-flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-1 text-white shadow-lg">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActions((prev) => prev.filter((_, idx) => idx !== i));
                        }}
                        className="inline-flex items-center justify-center h-6 w-6 rounded-full hover:bg-black/60"
                        title="Erase text"
                      >
                        <Eraser className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          // X deletes the text as requested
                          setActions((prev) => prev.filter((_, idx) => idx !== i));
                        }}
                        className="inline-flex items-center justify-center h-6 w-6 rounded-full hover:bg-black/60"
                        title="Delete text"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

            {/* Text editor panel for changing color/size of selected text */}
            {textEditorCssPos != null && editTextIndex != null && actions[editTextIndex] && (actions[editTextIndex] as any).type === "text" && (
              <div className="absolute z-30" style={{ left: textEditorCssPos.x, top: textEditorCssPos.y }}>
                <div className="rounded-lg border border-gray-200 bg-white/95 p-2 shadow-lg ring-1 ring-black/5 w-[240px] sm:w-[280px]">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Color</label>
                    <input type="color" value={editTextColor} onChange={(e) => setEditTextColor(e.target.value)} className="h-6 w-8" />
                    <label className="ml-2 text-xs text-gray-600">Size</label>
                    <input type="range" min={12} max={72} step={1} value={editTextSize} onChange={(e) => setEditTextSize(parseInt(e.target.value))} className="flex-1" />
                    <div className="w-10 text-right text-xs text-gray-600">{editTextSize}px</div>
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-gray-100 px-2 py-1 text-[11px] sm:text-xs text-gray-700 hover:bg-gray-200"
                      onClick={() => {
                        setEditTextIndex(null);
                        setTextEditorCssPos(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-rose-600 px-2 py-1 text-[11px] sm:text-xs font-semibold text-white hover:bg-rose-500"
                      onClick={() => {
                        setActions((prev) => prev.map((a, i) => (i === editTextIndex && a.type === "text" ? { ...a, color: editTextColor, size: editTextSize } : a)));
                        setEditTextIndex(null);
                        setTextEditorCssPos(null);
                      }}
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-black text-white px-2 py-1 text-[11px] sm:text-xs hover:bg-black/90"
                      onClick={() => {
                        const idx = editTextIndex!;
                        setActions((prev) => prev.filter((_, i) => i !== idx));
                        setEditTextIndex(null);
                        setTextEditorCssPos(null);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
