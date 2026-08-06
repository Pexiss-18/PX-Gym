"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileDrop({
  onFileSelected,
  disabled,
}: {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setFileName(file.name);
    onFileSelected(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFiles(event.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "glass flex flex-col items-center gap-3 rounded-[1.75rem] border-2 border-dashed px-6 py-14 text-center transition-colors",
        dragging ? "border-primary/50 bg-primary/[0.04]" : "border-white/10",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-white/20",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/[0.12] text-primary">
        {fileName ? <FileText className="h-6 w-6" strokeWidth={2} /> : <UploadCloud className="h-6 w-6" strokeWidth={2} />}
      </span>
      <div>
        <p className="text-sm font-medium">
          {fileName ?? "Arraste o PDF da sua avaliação aqui"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {fileName ? "Clique para trocar o arquivo" : "ou clique para selecionar (PDF, até 15MB)"}
        </p>
      </div>
    </div>
  );
}
