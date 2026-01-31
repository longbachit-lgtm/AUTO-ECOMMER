import React, { useEffect, useState } from 'react';
import { GeneratedImage } from '../types';
import { XIcon, CopyIcon, CheckIcon, DownloadIcon } from './Icons';

interface DetailModalProps {
  data: GeneratedImage | null;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ data, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!data || !data.analysis) return null;

  const handleCopyPrompt = () => {
    if (data.analysis?.optimizedPrompt) {
      navigator.clipboard.writeText(data.analysis.optimizedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (data.imageUrl) {
      const link = document.createElement('a');
      link.href = data.imageUrl;
      link.download = `design-concept-${data.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      
      {/* Modal Container */}
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col md:flex-row overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        
        {/* LEFT: Image Section (or Concept Placeholder) */}
        <div className="w-full md:w-1/2 bg-gray-100 flex items-center justify-center relative overflow-hidden border-b md:border-b-0 md:border-r border-gray-200">
           {data.imageUrl ? (
              <>
                 <img 
                   src={data.imageUrl} 
                   alt="Concept" 
                   className="w-full h-full object-contain p-4"
                 />
                 <button 
                   onClick={handleDownload}
                   className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-gray-800 p-2.5 rounded-full shadow-lg transition-transform hover:scale-105"
                   title="Tải ảnh về"
                 >
                   <DownloadIcon className="w-5 h-5" />
                 </button>
              </>
           ) : (
              <div className="p-8 text-center text-gray-400">
                  <div className="text-6xl mb-4">🎨</div>
                  <p className="font-medium">Chưa tạo ảnh</p>
                  <p className="text-sm">Đây là bảng kế hoạch chi tiết.</p>
              </div>
           )}
        </div>

        {/* RIGHT: Content Section */}
        <div className="w-full md:w-1/2 flex flex-col h-full bg-white">
           
           {/* Header */}
           <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-white sticky top-0 z-10">
              <div>
                  <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider mb-2">
                    Chiến Lược Sản Phẩm
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                    {data.analysis.conceptName}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 italic font-medium">
                    "{data.analysis.keyMessage}"
                  </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XIcon className="w-6 h-6" />
              </button>
           </div>

           {/* Scrollable Body */}
           <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              
              {/* 1. Marketing Info */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                    <h4 className="text-[10px] uppercase font-bold text-blue-500 mb-1">Thị Trường & Đối Tượng</h4>
                    <p className="text-sm font-semibold text-blue-900">{data.analysis.targetAudience}</p>
                 </div>
                 <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100">
                    <h4 className="text-[10px] uppercase font-bold text-purple-500 mb-1">Dịp & Bối Cảnh</h4>
                    <p className="text-sm font-semibold text-purple-900">{data.analysis.occasion}</p>
                 </div>
              </div>

              {/* 2. REASONING / STRATEGY (NEW) */}
              {data.analysis.reasoning && (
                  <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-amber-100 rounded-bl-full -mr-8 -mt-8 opacity-50"></div>
                      <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide flex items-center gap-2 mb-2 relative z-10">
                          💡 Lý Do Tạo Sản Phẩm (Strategy)
                      </h3>
                      <p className="text-sm text-amber-900/90 leading-relaxed italic relative z-10">
                          "{data.analysis.reasoning}"
                      </p>
                  </div>
              )}

              {/* 3. STRENGTHS & WEAKNESSES */}
              <div className="space-y-4">
                 {/* Strengths */}
                 <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2 mb-3">
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Điểm Mạnh (Key Visuals)
                    </h3>
                    <ul className="grid grid-cols-1 gap-2">
                      {data.analysis.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-gray-700 bg-emerald-50/50 px-3 py-2 rounded-lg border border-emerald-100 flex items-start gap-2">
                           <span className="text-emerald-500 mt-0.5">✓</span> {s}
                        </li>
                      ))}
                    </ul>
                 </div>
                 
                 {/* Weaknesses */}
                 <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2 mb-3">
                       <span className="w-2 h-2 rounded-full bg-rose-500"></span> Điều Cần Tránh
                    </h3>
                    <ul className="grid grid-cols-1 gap-2">
                      {data.analysis.weaknesses.map((w, i) => (
                        <li key={i} className="text-sm text-gray-700 bg-rose-50/50 px-3 py-2 rounded-lg border border-rose-100 flex items-start gap-2">
                           <span className="text-rose-500 mt-0.5">✕</span> {w}
                        </li>
                      ))}
                    </ul>
                 </div>
              </div>

              {/* 4. PROMPT SECTION */}
              <div className="pt-6 border-t border-gray-100">
                 <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                       Optimized Prompt (English)
                    </h3>
                    <button 
                      onClick={handleCopyPrompt}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        copied 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                      }`}
                    >
                      {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                      {copied ? 'Đã Copy' : 'Copy Prompt'}
                    </button>
                 </div>
                 <div className="relative group">
                    <div className="bg-gray-800 text-gray-300 p-4 rounded-xl text-xs font-mono leading-relaxed overflow-x-auto border border-gray-700 shadow-inner">
                       {data.analysis.optimizedPrompt}
                    </div>
                 </div>
                 <p className="text-[10px] text-gray-400 mt-2">
                   * Đây là câu lệnh chi tiết được AI tạo ra để sinh ảnh. Bạn có thể dùng nó để tinh chỉnh thêm.
                 </p>
              </div>

           </div>
        </div>

      </div>
    </div>
  );
};

export default DetailModal;