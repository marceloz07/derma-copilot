'use client';
// components/ui/Dropzone.tsx — Derma Copilot
// Componente de carga de imágenes con drag-and-drop nativo (sin librerías externas).

import { useRef, useState, useCallback } from 'react';
import type { DragEvent, ChangeEvent } from 'react';

interface DropzoneProps {
  onFileSelect:  (file: File) => void;
  onFileClear:   () => void;
  accept?:       string;   // MIME types, default: 'image/*'
  maxSizeMB?:    number;   // default: 10
  className?:    string;
  disabled?:     boolean;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function Dropzone({
  onFileSelect,
  onFileClear,
  accept       = 'image/*',
  maxSizeMB    = 10,
  className    = '',
  disabled     = false,
}: DropzoneProps) {
  const inputRef                      = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging]   = useState(false);
  const [preview,    setPreview]      = useState<string | null>(null);
  const [fileName,   setFileName]     = useState<string | null>(null);
  const [error,      setError]        = useState<string | null>(null);

  // ── Validación ─────────────────────────────────────────────────────────────

  function validate(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Formato no soportado. Use JPEG, PNG, WebP o GIF.`;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `La imagen no puede superar ${maxSizeMB} MB.`;
    }
    return null;
  }

  // ── Procesar archivo ────────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    onFileSelect(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFileSelect, maxSizeMB]);

  // ── Borrar ──────────────────────────────────────────────────────────────────

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    setPreview(null);
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    onFileClear();
  }

  // ── Drag & Drop ─────────────────────────────────────────────────────────────

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const baseClasses = `
    relative border-2 border-dashed rounded-xl transition-all cursor-pointer
    ${isDragging && !disabled  ? 'border-blue-500 bg-blue-50 scale-[1.01]' : ''}
    ${!isDragging && !preview  ? 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/40' : ''}
    ${preview                  ? 'border-green-400 bg-green-50/30' : ''}
    ${error                    ? 'border-red-400 bg-red-50/30' : ''}
    ${disabled                 ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Zona de carga de imagen"
      className={baseClasses}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) inputRef.current?.click(); }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />

      {/* Vista previa */}
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Vista previa"
            className="w-full max-h-72 object-contain rounded-xl"
          />
          {/* Overlay con nombre y botón de borrar */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white px-3 py-2 rounded-b-xl flex items-center justify-between">
            <span className="text-xs truncate max-w-[80%]">📎 {fileName}</span>
            <button
              type="button"
              onClick={clear}
              className="text-white/80 hover:text-white transition text-xs font-medium"
              aria-label="Eliminar imagen"
            >
              Cambiar ×
            </button>
          </div>
        </div>
      ) : (
        /* Área de carga vacía */
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <div className="text-4xl mb-3 select-none" aria-hidden="true">
            {isDragging ? '📥' : '🖼️'}
          </div>
          <p className="text-sm font-medium text-gray-700">
            {isDragging ? 'Suelta la imagen aquí' : 'Arrastra la foto o haz clic para seleccionar'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            JPEG, PNG, WebP, GIF · Máx. {maxSizeMB} MB
          </p>
          <div className="mt-3 px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium
                          hover:bg-blue-700 transition select-none">
            Seleccionar imagen
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <p className="text-xs text-red-600 text-center pb-3 px-4" role="alert">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}
