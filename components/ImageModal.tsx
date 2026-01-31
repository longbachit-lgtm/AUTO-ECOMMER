import React, { useEffect } from 'react';
import { XIcon } from './Icons';

interface ImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
  title?: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose, title }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
      >
        <XIcon className="w-6 h-6" />
      </button>
      
      <div className="relative max-w-full max-h-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
        {title && (
            <div className="mb-2 px-3 py-1 bg-black/50 text-white text-xs rounded-full backdrop-blur font-medium">
                {title}
            </div>
        )}
        <img 
          src={imageUrl} 
          alt="Zoom" 
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/10"
        />
      </div>
    </div>
  );
};

export default ImageModal;