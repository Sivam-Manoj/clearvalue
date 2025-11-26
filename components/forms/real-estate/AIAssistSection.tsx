"use client";

import { useRef } from "react";
import { Sparkles, X, Mic, Square } from "lucide-react";
import CollapsibleSection from "./CollapsibleSection";

interface AIAssistSectionProps {
  specFiles: File[];
  onSpecChange: (files: FileList | null) => void;
  onRemoveSpecFile: (index: number) => void;
  onAnalyzeSpec: () => void;
  notesText: string;
  onNotesChange: (text: string) => void;
  onFillFromText: () => void;
  audioBlob: Blob | null;
  audioUrl: string | null;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onUseRecording: () => void;
  onClearRecording: () => void;
  aiLoading: boolean;
}

export default function AIAssistSection({
  specFiles,
  onSpecChange,
  onRemoveSpecFile,
  onAnalyzeSpec,
  notesText,
  onNotesChange,
  onFillFromText,
  audioBlob,
  audioUrl,
  isRecording,
  onStartRecording,
  onStopRecording,
  onUseRecording,
  onClearRecording,
  aiLoading,
}: AIAssistSectionProps) {
  const specInputRef = useRef<HTMLInputElement>(null);

  const btnClass = "rounded-lg bg-gradient-to-b from-gray-800 to-gray-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] hover:from-gray-700 hover:to-gray-800 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] disabled:opacity-50 transition-all cursor-pointer";
  const btnOutlineClass = "rounded-lg border border-gray-300 bg-gradient-to-b from-white to-gray-50 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 shadow-[0_1px_3px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] hover:from-gray-50 hover:to-gray-100 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] disabled:opacity-50 transition-all cursor-pointer";

  return (
    <CollapsibleSection title="AI Form Fill" icon={<Sparkles className="text-purple-600" />} variant="info">
      <div className="space-y-2">
        {/* Row 1: Spec + Notes */}
        <div className="grid gap-2 grid-cols-2">
          {/* Spec */}
          <div>
            <input ref={specInputRef} type="file" accept="image/*" multiple onChange={(e) => onSpecChange(e.target.files)} className="sr-only" />
            <div className="rounded-lg border border-gray-300 bg-gradient-to-b from-white to-gray-50 p-2 text-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)]">
              {specFiles.length > 0 ? (
                <div className="flex flex-wrap gap-1 justify-center mb-1">
                  {specFiles.map((file, idx) => (
                    <span key={idx} className="flex items-center gap-0.5 text-[10px] bg-gray-100 px-1 py-0.5 rounded">
                      {file.name.slice(0, 10)}...
                      <button type="button" onClick={() => onRemoveSpecFile(idx)} className="text-gray-400 hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 mb-1">Spec sheets</p>
              )}
              <div className="flex gap-1 justify-center">
                <button type="button" onClick={() => specInputRef.current?.click()} className={btnOutlineClass}>
                  {specFiles.length > 0 ? "+" : "Select"}
                </button>
                <button type="button" onClick={onAnalyzeSpec} disabled={specFiles.length === 0 || aiLoading} className={btnClass}>
                  {aiLoading ? "..." : "Analyze"}
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <textarea
              className="h-14 w-full rounded-lg border border-blue-300 bg-gradient-to-b from-white to-blue-50/30 px-2.5 py-2 text-xs text-gray-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_1px_2px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all resize-none placeholder:text-gray-400"
              value={notesText}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Notes/transcript..."
            />
            <button type="button" onClick={onFillFromText} disabled={!notesText.trim() || aiLoading} className={btnClass + " mt-1"}>
              {aiLoading ? "..." : "Fill"}
            </button>
          </div>
        </div>

        {/* Voice */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-500">Voice:</span>
          {!isRecording ? (
            <button type="button" onClick={onStartRecording} className={btnClass}><Mic className="h-2.5 w-2.5 inline mr-0.5" />Rec</button>
          ) : (
            <button type="button" onClick={onStopRecording} className="rounded-lg bg-gradient-to-b from-red-500 to-red-600 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] hover:from-red-400 hover:to-red-500 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] cursor-pointer"><Square className="h-2.5 w-2.5 inline mr-0.5" />Stop</button>
          )}
          <button type="button" onClick={onUseRecording} disabled={!audioBlob || aiLoading} className={btnClass}>{aiLoading ? "..." : "Use"}</button>
          <button type="button" onClick={onClearRecording} disabled={!audioBlob} className={btnOutlineClass}>Clear</button>
          {audioUrl && <audio src={audioUrl} controls className="h-6 max-w-[150px]" />}
        </div>
      </div>
    </CollapsibleSection>
  );
}
