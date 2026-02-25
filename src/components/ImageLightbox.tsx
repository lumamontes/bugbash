import { useEffect, useRef, useState, useCallback } from 'react';

interface Evidence {
  id: string;
  type: 'screenshot' | 'video' | 'file';
  url: string;
  filename: string;
}

interface LightboxProps {
  items: Evidence[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  bugTitle?: string;
  severity?: string;
  reporterName?: string;
}

const severityColors: Record<string, string> = {
  blocker: '#ef4444',
  major: '#f97316',
  minor: '#eab308',
  enhancement: '#22c55e',
};

const severityLabels: Record<string, string> = {
  blocker: 'Bloqueante',
  major: 'Grave',
  minor: 'Menor',
  enhancement: 'Melhoria',
};

export default function ImageLightbox({
  items,
  currentIndex,
  onClose,
  onNavigate,
  bugTitle,
  severity,
  reporterName,
}: LightboxProps) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const current = items[currentIndex];
  const isVideo = current?.type === 'video';

  const resetTransform = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      onNavigate(currentIndex + 1);
      resetTransform();
    }
  }, [currentIndex, items.length, onNavigate, resetTransform]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
      resetTransform();
    }
  }, [currentIndex, onNavigate, resetTransform]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, goNext, goPrev]);

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    setScale(prev => {
      const next = Math.min(5, Math.max(1, prev + delta));
      if (next === 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTranslate({
      x: translateStart.current.x + dx,
      y: translateStart.current.y + dy,
    });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleDownload() {
    const a = document.createElement('a');
    a.href = current.url;
    a.download = current.filename;
    a.click();
  }

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onClick={handleBackdropClick}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50">
        <span className="text-white/70 text-sm">
          {currentIndex + 1} de {items.length}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="text-white/70 hover:text-white text-sm px-3 py-1 rounded transition-colors"
            title="Download"
          >
            Download
          </button>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl px-2 leading-none transition-colors"
            title="Fechar (Esc)"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Main content */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center relative overflow-hidden select-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 z-10 text-white/60 hover:text-white text-4xl transition-colors"
          >
            &#8249;
          </button>
        )}
        {currentIndex < items.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 z-10 text-white/60 hover:text-white text-4xl transition-colors"
          >
            &#8250;
          </button>
        )}

        {isVideo ? (
          <video
            key={current.id}
            src={current.url}
            controls
            autoPlay
            className="max-w-[90vw] max-h-[75vh] rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <img
            key={current.id}
            src={current.url}
            alt={current.filename}
            className="max-w-[90vw] max-h-[75vh] object-contain transition-transform"
            style={{
              transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            }}
            draggable={false}
            onClick={e => e.stopPropagation()}
          />
        )}
      </div>

      {/* Bottom context bar */}
      {(bugTitle || severity || reporterName) && (
        <div className="flex items-center gap-4 px-4 py-3 bg-black/50">
          {severity && (
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: `${severityColors[severity]}20`, color: severityColors[severity] }}
            >
              {severityLabels[severity] || severity}
            </span>
          )}
          {bugTitle && <span className="text-white text-sm font-medium truncate">{bugTitle}</span>}
          {reporterName && <span className="text-white/50 text-xs ml-auto">{reporterName}</span>}
        </div>
      )}
    </div>
  );
}
