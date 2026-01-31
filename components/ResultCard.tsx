import React, { useState } from 'react';
import { GeneratedImage } from '../types';
import { RefreshIcon, DownloadIcon, AlertIcon, MagicIcon, EyeIcon } from './Icons';

interface ResultCardProps {
  data: GeneratedImage;
  onGenerateImage: () => void;
  onRetry: () => void; // This is for Analysis Retry (Phase 1)
  onViewDetails?: () => void;
  index: number;
}

const ResultCard: React.FC<ResultCardProps> = ({ data, onGenerateImage, onRetry, onViewDetails, index }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.imageUrl) {
      const link = document.createElement('a');
      link.href = data.imageUrl;
      link.download = `new-product-concept-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 1. Loading State (Initial Analysis Phase)
  if (data.analyzing) {
    return (
      <div className="w-full h-full min-h-[500px] bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center p-8 gap-6 animate-pulse shadow-sm">
        <div className="relative">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center relative z-10">
            <MagicIcon className="animate-spin text-indigo-500 w-8 h-8" />
          </div>
          <div className="absolute inset-0 bg-indigo-200 rounded-full animate-ping opacity-20"></div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="font-bold text-gray-800 text-lg">Đang Tổng Hợp Insight</h3>
          <p className="text-sm text-gray-500">Đang mix điểm mạnh & khắc phục điểm yếu...</p>
          <div className="flex gap-1 justify-center mt-2">
            <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
            <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
            <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Analysis Error State (Phase 1 Failed - No Concept Data)
  if (data.error && !data.analysis) {
    return (
      <div className="w-full h-full min-h-[500px] bg-red-50 border border-red-200 rounded-xl flex flex-col items-center justify-center p-6 gap-3">
        <AlertIcon className="w-10 h-10 text-red-500" />
        <p className="text-sm font-semibold text-red-700">Lỗi Phân Tích</p>
        <p className="text-xs text-gray-600 text-center max-w-[200px]">{data.error}</p>
        <button 
          onClick={(e) => { e.stopPropagation(); onRetry(); }} 
          className="mt-2 px-4 py-2 bg-white border border-red-200 rounded text-xs text-red-600 font-medium hover:bg-red-50"
        >
          Thử Lại Insight
        </button>
      </div>
    );
  }

  // 3. Main Content (Concept Available)
  return (
    <div 
      className="relative w-full h-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg flex flex-col group hover:shadow-xl transition-shadow duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex-1 overflow-hidden relative bg-gray-50 flex flex-col">
        
        {/* VIEW LOGIC: 
            1. Generation Error (Phase 2 Failed)
            2. Image Success
            3. Text Analysis (Before Gen or while Gen) 
        */}

        {data.error ? (
           /* --- GENERATION ERROR VIEW --- */
           <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-red-50/50 p-6 text-center animate-fadeIn">
               <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                   <AlertIcon className="w-8 h-8 text-red-500" />
               </div>
               <h3 className="text-red-700 font-bold text-sm">Tạo Ảnh Thất Bại</h3>
               <p className="text-xs text-gray-600 mt-2 mb-4 max-w-[220px] leading-relaxed">
                   {data.error}
               </p>
               <button 
                  onClick={(e) => { e.stopPropagation(); onGenerateImage(); }} // Use onGenerateImage to retry Phase 2
                  className="px-4 py-2 bg-white border border-red-200 rounded-lg text-xs font-bold text-red-600 shadow-sm hover:bg-red-50 hover:border-red-300 transition-all flex items-center gap-2"
               >
                  <RefreshIcon className="w-3 h-3" /> Thử Lại
               </button>
           </div>

        ) : data.imageUrl ? (
           /* --- IMAGE SUCCESS VIEW --- */
           <div className="relative w-full h-full min-h-[400px]">
             
             {/* Main Image */}
             <img 
               src={data.imageUrl} 
               alt="New Product Concept" 
               className={`w-full h-full object-contain bg-gray-100 transition-opacity duration-500 ${data.generatingImage ? 'opacity-50 blur-sm' : 'opacity-100'}`} 
             />
             
             {/* LOADING OVERLAY (Active when regenerating) */}
             {data.generatingImage && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px]">
                   <div className="bg-white p-3 rounded-full shadow-lg mb-2">
                      <RefreshIcon className="w-6 h-6 animate-spin text-indigo-600" />
                   </div>
                   <span className="px-3 py-1 bg-white/80 rounded-full text-xs font-bold text-indigo-800 shadow-sm border border-indigo-100">
                      Đang vẽ lại...
                   </span>
                </div>
             )}
             
             {/* Badge */}
             {!data.generatingImage && (
               <div className="absolute top-4 right-4 bg-black/70 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                 Biến thể {index + 1}
               </div>
             )}

             {/* Hover Overlay */}
             {!data.generatingImage && (
               <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 flex flex-col items-center justify-center gap-4 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                  <button 
                    onClick={handleDownload}
                    className="p-4 bg-white text-gray-900 rounded-full hover:bg-indigo-50 hover:text-indigo-600 shadow-xl transform hover:scale-105 transition-all"
                    title="Tải Xuống"
                  >
                    <DownloadIcon className="w-6 h-6" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onViewDetails && onViewDetails(); }}
                    className="px-5 py-2.5 bg-white/90 text-gray-900 text-xs font-bold rounded-full hover:bg-white transition-colors shadow-lg flex items-center gap-2"
                  >
                    <EyeIcon className="w-4 h-4" /> Xem Chiến Lược & Prompt
                  </button>
               </div>
             )}
           </div>

        ) : (
          /* --- ANALYSIS VIEW (Before Gen or Initial State) --- */
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar h-full relative bg-gradient-to-b from-white to-gray-50">
             
             {/* Details Button */}
             <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={(e) => { e.stopPropagation(); onViewDetails && onViewDetails(); }}
                  className="p-2 bg-white border border-gray-200 rounded-full hover:bg-indigo-50 hover:text-indigo-600 shadow-sm transition-colors"
                  title="Mở rộng chi tiết"
                >
                   <EyeIcon className="w-4 h-4" />
                </button>
             </div>

             {/* Concept Header */}
             <div className="text-center pb-4 border-b border-gray-100">
                <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded mb-2 uppercase tracking-wider">
                  Concept Đề Xuất
                </span>
                <h2 className="text-xl font-bold text-gray-800 leading-tight">
                  {data.analysis?.conceptName || "Sản Phẩm Mới"}
                </h2>
                <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">"{data.analysis?.keyMessage}"</p>
             </div>

             {/* Marketing Data */}
             <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                   <h5 className="text-[10px] font-bold text-gray-400 uppercase">Đối Tượng</h5>
                   <p className="text-xs font-medium text-gray-700 mt-1 line-clamp-2">{data.analysis?.targetAudience}</p>
                </div>
                <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                   <h5 className="text-[10px] font-bold text-gray-400 uppercase">Dịp Mua Sắm</h5>
                   <p className="text-xs font-medium text-gray-700 mt-1 line-clamp-2">{data.analysis?.occasion}</p>
                </div>
             </div>
             
             {/* Strengths List */}
             <div>
                <h4 className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-2 uppercase tracking-wide">
                    Tổng Hợp Điểm Mạnh
                </h4>
                <ul className="space-y-2">
                {data.analysis?.strengths?.slice(0, 3).map((s, i) => (
                    <li key={i} className="text-xs text-gray-600 pl-3 border-l-2 border-emerald-300 flex items-start line-clamp-2">
                    {s}
                    </li>
                ))}
                </ul>
             </div>
          </div>
        )}
      </div>

      {/* --- ACTION FOOTER --- */}
      <div className="p-4 bg-white border-t border-gray-100 z-10 flex-none">
         
         {data.error ? (
             <button
               onClick={(e) => { e.stopPropagation(); onGenerateImage(); }}
               className="w-full py-3 bg-red-50 border border-red-200 rounded-xl text-sm font-bold text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
             >
               <RefreshIcon className="w-4 h-4" /> Thử Lại
             </button>
         ) : !data.imageUrl ? (
            // Initial Generation Button
            <button
              onClick={(e) => { e.stopPropagation(); onGenerateImage(); }}
              disabled={data.generatingImage}
              className={`w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md
                ${data.generatingImage 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-indigo-200 hover:-translate-y-0.5'
                }
              `}
            >
              {data.generatingImage ? (
                <>
                  <RefreshIcon className="animate-spin w-4 h-4" /> Đang Tạo Concept...
                </>
              ) : (
                <>
                  <MagicIcon className="w-4 h-4" /> Tạo Sản Phẩm Này
                </>
              )}
            </button>
         ) : (
            // Regenerate Button
            <button
             onClick={(e) => { e.stopPropagation(); onGenerateImage(); }}
             disabled={data.generatingImage}
             className={`w-full py-3 border rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2
                ${data.generatingImage 
                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm'
                }
             `}
            >
              {data.generatingImage ? (
                 <>
                   <RefreshIcon className="w-4 h-4 animate-spin" /> Đang tạo lại...
                 </>
              ) : (
                 <>
                   <RefreshIcon className="w-4 h-4" /> Tạo Biến Thể Khác
                 </>
              )}
            </button>
         )}
      </div>
    </div>
  );
};

export default ResultCard;