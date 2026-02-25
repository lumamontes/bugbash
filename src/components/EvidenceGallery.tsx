import { useState } from 'react';
import ImageLightbox from './ImageLightbox';

interface Evidence {
  id: string;
  type: 'screenshot' | 'video' | 'file';
  url: string;
  filename: string;
}

interface Props {
  items: Evidence[];
  bugTitle?: string;
  severity?: string;
  reporterName?: string;
}

export default function EvidenceGallery({ items, bugTitle, severity, reporterName }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((ev, index) => (
          <button
            key={ev.id}
            onClick={() => setLightboxIndex(index)}
            className="group relative block text-left w-full"
          >
            {ev.type === 'screenshot' ? (
              <img
                src={ev.url}
                alt={ev.filename}
                className="w-full h-32 object-cover rounded-lg border border-[#242430] group-hover:border-[#6366f1] transition-colors"
              />
            ) : (
              <div className="w-full h-32 bg-[#1a1a24] rounded-lg border border-[#242430] group-hover:border-[#6366f1] transition-colors flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl">&#127909;</p>
                  <p className="text-xs text-[#64748b] mt-1">{ev.filename}</p>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          items={items}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          bugTitle={bugTitle}
          severity={severity}
          reporterName={reporterName}
        />
      )}
    </>
  );
}
