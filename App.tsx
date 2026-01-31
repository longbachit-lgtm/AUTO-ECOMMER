import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import { GeneratedImage, UploadedImage, AppSettings, AspectRatio, Resolution } from './types';
import { analyzeDesignConcept, generateDesignVariation, generateImageFromReference, analyzeCustomConcepts, getApiKey, setApiKey } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import ResultCard from './components/ResultCard';
import { UploadIcon, MagicIcon, TrashIcon, AlertIcon, RefreshIcon, PasteIcon, PlusIcon, CheckIcon } from './components/Icons';
import { DESIGN_STYLES } from './constants';
import ImageModal from './components/ImageModal';
import DetailModal from './components/DetailModal';

type AppMode = 'insight' | 'custom';
type UploadSection = 'subject' | 'design';

const App: React.FC = () => {
  // --- State ---
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Mode State
  const [appMode, setAppMode] = useState<AppMode>('insight');

  // Input State
  const [inputImages, setInputImages] = useState<UploadedImage[]>([]);
  // NEW: State for Design Reference Image (Custom Mode Only)
  const [designRefImage, setDesignRefImage] = useState<UploadedImage | null>(null);

  // PASTE LOGIC: Track which section is active for pasting
  const [activeUploadSection, setActiveUploadSection] = useState<UploadSection>('subject');

  const [marketContext, setMarketContext] = useState<string>("");

  // Custom Mode State
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);

  // Config State
  const [settings, setSettings] = useState<AppSettings>({
    aspectRatio: '1:1',
    resolution: '1K'
  });

  // Output State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<GeneratedImage[]>([]);

  // Zoom / Detail State
  const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<GeneratedImage | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const designRefInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        // Check localStorage first
        const storedKey = getApiKey();
        if (storedKey && storedKey !== '') {
          setApiKeyReady(true);
          setApiKeyInput(storedKey);
          return;
        }

        // Fallback to window.aistudio
        if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          setApiKeyReady(hasKey);
        } else if (process.env.API_KEY) {
          setApiKeyReady(true);
        }
      } catch (e) {
        console.error("Error checking API key", e);
      }
    };
    checkApiKey();
  }, []);

  // --- Handlers ---

  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) {
      setGlobalError("Vui lòng nhập API Key!");
      setTimeout(() => setGlobalError(null), 2000);
      return;
    }

    try {
      setApiKey(apiKeyInput);
      setApiKeyReady(true);
      setGlobalError("Đã lưu API Key thành công!");
      setTimeout(() => setGlobalError(null), 2000);
    } catch (e) {
      setGlobalError("Lỗi khi lưu API Key.");
    }
  };

  const handleApiKeySelect = async () => {
    try {
      if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
        setApiKeyReady(true);
        setGlobalError(null);
      }
    } catch (e) {
      setGlobalError("Failed to select API key.");
    }
  };

  const processFiles = useCallback(async (files: FileList | null, isDesignRef: boolean = false) => {
    if (!files || files.length === 0) return;

    if (!isDesignRef && appMode === 'custom' && inputImages.length >= 1) {
      // Single image logic handled below
    }

    const newImages: UploadedImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const reader = new FileReader();
      const promise = new Promise<void>((resolve) => {
        reader.onload = (e) => {
          newImages.push({
            id: Math.random().toString(36).substr(2, 9),
            file: file,
            previewUrl: e.target?.result as string
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
      await promise;
    }

    if (newImages.length === 0) return;

    if (isDesignRef) {
      setDesignRefImage(newImages[0]);
    } else {
      if (appMode === 'custom') {
        setInputImages([newImages[0]]);
      } else {
        setInputImages(prev => [...prev, ...newImages]);
      }
    }
  }, [appMode, inputImages.length]);

  // Global Paste Listener
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        e.preventDefault();

        // Determine target based on Active Section State
        const isTargetingDesign = activeUploadSection === 'design' && appMode === 'custom';

        processFiles(e.clipboardData.files, isTargetingDesign);

        // Visual feedback
        const targetName = isTargetingDesign ? "Thiết Kế Mẫu" : "Chủ Thể";
        setGlobalError(`Đã dán ảnh vào mục: ${targetName}`);
        setTimeout(() => setGlobalError(null), 2000);
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [processFiles, activeUploadSection, appMode]);

  const handleManualPasteClick = (targetSection: UploadSection) => {
    // 1. Set the active section so global paste works if manual fails
    setActiveUploadSection(targetSection);

    // 2. Try the API (it might fail on some browsers)
    navigator.clipboard.read().then(items => {
      for (const item of items) {
        const type = item.types.find(t => t.startsWith('image/'));
        if (type) {
          item.getType(type).then(blob => {
            const file = new File([blob], "pasted-image.png", { type });
            const dt = new DataTransfer();
            dt.items.add(file);
            processFiles(dt.files, targetSection === 'design');
          });
        }
      }
    }).catch(err => {
      // 3. Fallback: Instruct user
      console.warn("Clipboard API blocked, using fallback UI.", err);
      const targetName = targetSection === 'design' ? "Thiết Kế Mẫu (Mục 1.2)" : "Chủ Thể (Mục 1)";
      setGlobalError(`Đã chọn ${targetName}. Hãy nhấn Ctrl+V để dán.`);
      setTimeout(() => setGlobalError(null), 4000);
    });
  };

  const removeImage = (id: string) => {
    setInputImages(prev => prev.filter(img => img.id !== id));
  };

  const removeDesignRefImage = () => {
    setDesignRefImage(null);
  };

  const handleZoom = (url: string | null) => {
    setSelectedZoomImage(url);
  };

  // Switch Mode Logic
  const handleSwitchMode = (mode: AppMode) => {
    setAppMode(mode);
    setInputImages([]);
    setDesignRefImage(null);
    setGeneratedResults([]);
    setGlobalError(null);
    setSelectedStyleId(null);
    setActiveUploadSection('subject'); // Reset to subject
  };

  // --- MAIN ACTIONS ---

  // 1. INSIGHT MODE: Analyze & Suggest
  const handleAnalyze = async () => {
    if (inputImages.length === 0) {
      setGlobalError("Vui lòng tải lên ít nhất một ảnh sản phẩm.");
      setTimeout(() => setGlobalError(null), 3000);
      return;
    }
    if (!apiKeyReady) {
      await handleApiKeySelect();
      return;
    }

    setIsAnalyzing(true);
    setGlobalError(null);
    setGeneratedResults([]);

    // Create placeholders
    const placeholders: GeneratedImage[] = Array(5).fill(null).map((_, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      analyzing: true,
      analysis: null,
      imageUrl: null,
      generatingImage: false,
      error: null
    }));
    setGeneratedResults(placeholders);

    try {
      const base64Promises = inputImages.map(img => fileToBase64(img.file));
      const imagesBase64 = await Promise.all(base64Promises);
      const analysisResults = await analyzeDesignConcept(imagesBase64, marketContext);

      setGeneratedResults(prev => prev.map((item, index) => {
        const concept = analysisResults[index] || analysisResults[0];
        return { ...item, analyzing: false, analysis: concept };
      }));
    } catch (e: any) {
      setGlobalError(e.message);
      setGeneratedResults(prev => prev.map(item => ({ ...item, analyzing: false, error: "Lỗi phân tích." })));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 2. CUSTOM MODE: Direct Generation -> NOW WITH ANALYSIS FIRST
  const handleCustomGenerate = async () => {
    if (inputImages.length === 0) {
      setGlobalError("Vui lòng tải lên 1 ảnh mẫu (Chủ thể).");
      return;
    }


    if (!apiKeyReady) {
      await handleApiKeySelect();
      return;
    }

    setIsAnalyzing(true);
    setGlobalError(null);

    const selectedStyle = DESIGN_STYLES.find(s => s.id === selectedStyleId);

    // Combine prompt
    let effectivePrompt = customPrompt;
    if (selectedStyle) {
      if (customPrompt.trim()) {
        effectivePrompt = `${customPrompt}. Style Directive: ${selectedStyle.promptModifier}`;
      } else {
        effectivePrompt = `Create a creative concept based on this input image. Style Directive: ${selectedStyle.promptModifier}`;
      }
    } else if (!customPrompt.trim()) {
      // No style and no prompt -> Default Mode
      effectivePrompt = "Analyze this product image and generate 5 creative design variations. Focus on improving lighting, background, and overall aesthetic while keeping the core product identity.";
    }

    // Create 5 placeholders for Custom Mode
    const placeholders: GeneratedImage[] = Array(5).fill(null).map((_, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      analyzing: true,
      analysis: null,
      imageUrl: null,
      generatingImage: false,
      error: null
    }));
    setGeneratedResults(placeholders);

    try {
      const base64Ref = await fileToBase64(inputImages[0].file);

      let base64Design: string | null = null;
      if (designRefImage) {
        base64Design = await fileToBase64(designRefImage.file);
      }

      // Call the NEW specialized analysis function for Custom Mode
      const analysisResults = await analyzeCustomConcepts(
        base64Ref,
        effectivePrompt,
        selectedStyle ? selectedStyle.name : undefined,
        base64Design
      );

      setGeneratedResults(prev => prev.map((item, index) => {
        const concept = analysisResults[index] || analysisResults[0];
        return { ...item, analyzing: false, analysis: concept };
      }));

    } catch (e: any) {
      setGlobalError(e.message);
      setGeneratedResults(prev => prev.map(item => ({ ...item, analyzing: false, error: "Lỗi phân tích ý tưởng: " + e.message })));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate Image from Analysis
  const handleGenerateImageForCard = async (index: number) => {
    const item = generatedResults[index];
    if (!item.analysis || !item.analysis.optimizedPrompt) return;

    setGeneratedResults(prev => {
      const newArr = [...prev];
      newArr[index] = { ...newArr[index], generatingImage: true, error: null };
      return newArr;
    });

    try {
      let url = '';

      if (appMode === 'insight') {
        // Insight Mode: Text-to-Image (Concept led)
        url = await generateDesignVariation(
          item.analysis.optimizedPrompt,
          settings
        );
      } else {
        // Custom Mode: Image-to-Image (Strict adherence to reference + Specific Prompt variation)
        if (inputImages.length > 0) {
          const base64Ref = await fileToBase64(inputImages[0].file);

          let base64Design: string | null = null;
          if (designRefImage) {
            base64Design = await fileToBase64(designRefImage.file);
          }

          url = await generateImageFromReference(
            base64Ref,
            item.analysis.optimizedPrompt,
            settings,
            base64Design
          );
        } else {
          throw new Error("Missing source image");
        }
      }

      setGeneratedResults(prev => {
        const newArr = [...prev];
        newArr[index] = { ...newArr[index], generatingImage: false, imageUrl: url };
        return newArr;
      });

    } catch (e: any) {
      setGeneratedResults(prev => {
        const newArr = [...prev];
        newArr[index] = { ...newArr[index], generatingImage: false, error: "Tạo ảnh thất bại: " + e.message };
        return newArr;
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 overflow-auto md:overflow-hidden font-sans">
      <Header
        apiKeyInput={apiKeyInput}
        apiKeyReady={apiKeyReady}
        onApiKeyChange={setApiKeyInput}
        onSaveApiKey={handleSaveApiKey}
      />

      {/* ZOOM MODAL */}
      <ImageModal
        imageUrl={selectedZoomImage}
        onClose={() => setSelectedZoomImage(null)}
        title="Xem Chi Tiết"
      />

      {/* DETAIL MODAL (Strategy & Prompt) */}
      <DetailModal
        data={selectedDetailItem}
        onClose={() => setSelectedDetailItem(null)}
      />

      <div className="flex flex-col md:flex-row flex-1 overflow-visible md:overflow-hidden">

        {/* --- LEFT PANEL: INPUTS --- */}
        <aside className="w-full md:w-[400px] lg:w-[450px] bg-white border-r border-gray-200 flex flex-col z-20 shadow-xl shrink-0 h-auto md:h-full">

          {/* TABS */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleSwitchMode('insight')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${appMode === 'insight' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Phân Tích Insight
            </button>
            <button
              onClick={() => handleSwitchMode('custom')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${appMode === 'custom' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sáng Tạo Theo Lệnh
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-visible md:overflow-y-auto custom-scrollbar p-6 space-y-6">

            {/* Description Box */}
            {appMode === 'insight' ? (
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                <h3 className="font-bold text-indigo-900 text-sm mb-2 flex items-center gap-2">
                  <MagicIcon className="w-4 h-4" /> Deep Insight AI (v4)
                </h3>
                <p className="text-xs text-indigo-800 leading-relaxed">
                  Tải lên bộ sưu tập ảnh, AI sẽ tự động phân tích đối tượng, tâm lý khách hàng và đề xuất 5 concept phù hợp nhất.
                </p>
              </div>
            ) : (
              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 shadow-sm">
                <h3 className="font-bold text-purple-900 text-sm mb-2 flex items-center gap-2">
                  <MagicIcon className="w-4 h-4" /> Mix Chủ Thể & Thiết Kế
                </h3>
                <p className="text-xs text-purple-800 leading-relaxed">
                  AI sẽ <strong>"Học" ngôn ngữ thiết kế</strong> từ ảnh mẫu (Bố cục, Màu sắc, Vibe) và áp dụng lên Chủ Thể để tạo ra 5 Concept nâng cấp.
                </p>
              </div>
            )}

            {!apiKeyReady && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-amber-700 font-semibold">
                  <AlertIcon /> Nhập Gemini API Key
                </div>
                <input
                  type="text"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveApiKey();
                    }
                  }}
                  placeholder="Dán API Key của bạn vào đây..."
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <button
                  onClick={handleSaveApiKey}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Lưu API Key
                </button>
                <p className="text-xs text-amber-600 text-center">
                  Lấy API Key tại: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-semibold">AI Studio</a>
                </p>
              </div>
            )}

            {/* BLOCK 1: SUBJECT */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className={`text-sm font-bold uppercase tracking-wider ${activeUploadSection === 'subject' ? 'text-indigo-700' : 'text-gray-500'}`}>
                  1. {appMode === 'insight' ? 'Bộ sưu tập mẫu' : 'Ảnh Chủ Thể'}
                </h2>
              </div>
              <section
                className={`transition-all duration-300 p-4 rounded-xl border-2 cursor-pointer relative ${activeUploadSection === 'subject' ? 'border-indigo-500 bg-indigo-50/40 shadow-md ring-2 ring-indigo-100' : 'border-gray-200 hover:border-indigo-300 bg-white'}`}
                onMouseEnter={() => setActiveUploadSection('subject')}
                onClick={() => setActiveUploadSection('subject')}
              >
                {/* Badge Label */}
                <div className={`absolute -top-3 left-4 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${activeUploadSection === 'subject' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  Nguồn (Source)
                </div>

                <div className="flex items-center justify-end mb-3">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleManualPasteClick('subject'); }}
                      className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-100 rounded transition-colors" title="Dán (Ctrl+V)"
                    >
                      <PasteIcon />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-100 rounded transition-colors" title="Tải Ảnh Lên"
                    >
                      <PlusIcon />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {inputImages.map((img) => (
                      <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group bg-gray-50 shadow-sm hover:ring-2 ring-indigo-500 transition-all cursor-zoom-in" onClick={(e) => { e.stopPropagation(); handleZoom(img.previewUrl); }}>
                        <img src={img.previewUrl} className="w-full h-full object-contain p-1" alt="Input" />
                        <button
                          onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                          className="absolute top-1 right-1 bg-white p-1 rounded-full text-gray-500 hover:text-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <TrashIcon className="w-3 h-3" />
                        </button>
                        {appMode === 'custom' && <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-1">SUBJECT</div>}
                      </div>
                    ))}
                    {(appMode === 'insight' || inputImages.length === 0) && (
                      <div
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/30 cursor-pointer transition-all gap-1"
                      >
                        <UploadIcon className="w-5 h-5" />
                        <span className="text-[9px] font-bold uppercase">Thêm Ảnh</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple={appMode === 'insight'}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      processFiles(e.target.files, false);
                      e.target.value = ''; // Reset to allow re-selection
                    }}
                  />
                </div>
              </section>
            </div>

            {/* BLOCK 1.2: DESIGN REF (SEPARATED VISUALLY) */}
            {appMode === 'custom' && (
              <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h2 className={`text-sm font-bold uppercase tracking-wider ${activeUploadSection === 'design' ? 'text-purple-700' : 'text-gray-500'}`}>
                    1.2 Thiết Kế Mẫu
                  </h2>
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">Học Phong Cách</span>
                </div>

                <section
                  className={`transition-all duration-300 p-4 rounded-xl border-2 cursor-pointer relative ${activeUploadSection === 'design' ? 'border-purple-500 bg-purple-50/40 shadow-md ring-2 ring-purple-100' : 'border-gray-200 hover:border-purple-300 bg-white'}`}
                  onMouseEnter={() => setActiveUploadSection('design')}
                  onClick={() => setActiveUploadSection('design')}
                >
                  {/* Badge Label */}
                  <div className={`absolute -top-3 left-4 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${activeUploadSection === 'design' ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    Style Reference
                  </div>

                  <div className="flex items-center justify-between mb-3 pt-2">
                    <p className="text-[10px] text-gray-400">
                      {activeUploadSection === 'design' ? <span className="text-purple-600 font-bold">Đang chọn. Nhấn Ctrl+V để dán ảnh.</span> : 'AI sẽ học bố cục & màu sắc của ảnh này.'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleManualPasteClick('design'); }}
                        className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-100 rounded transition-colors" title="Dán (Ctrl+V)"
                      >
                        <PasteIcon />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); designRefInputRef.current?.click(); }}
                        className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-100 rounded transition-colors" title="Tải Lên"
                      >
                        <PlusIcon />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {designRefImage ? (
                      <div className="relative aspect-square rounded-lg overflow-hidden border border-purple-200 group bg-purple-50 shadow-sm hover:ring-2 ring-purple-500 transition-all cursor-zoom-in" onClick={(e) => { e.stopPropagation(); handleZoom(designRefImage.previewUrl); }}>
                        <img src={designRefImage.previewUrl} className="w-full h-full object-contain p-1" alt="Design Ref" />
                        <button
                          onClick={(e) => { e.stopPropagation(); removeDesignRefImage(); }}
                          className="absolute top-1 right-1 bg-white p-1 rounded-full text-gray-500 hover:text-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <TrashIcon className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-purple-900/80 text-white text-[9px] text-center py-1">STYLE REF</div>
                      </div>
                    ) : (
                      <div
                        onClick={(e) => { e.stopPropagation(); designRefInputRef.current?.click(); }}
                        className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-purple-400 hover:text-purple-500 hover:bg-purple-50/30 cursor-pointer transition-all gap-1"
                      >
                        <UploadIcon className="w-5 h-5" />
                        <span className="text-[9px] font-bold uppercase text-center leading-tight">Banner/Layout<br />Mẫu</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={designRefInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      processFiles(e.target.files, true);
                      e.target.value = '';
                    }}
                  />
                </section>
              </div>
            )}

            {/* 2. CONTEXT / PROMPT */}
            <section className="mt-8 pt-6 border-t border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                {appMode === 'insight' ? '2. Nhu cầu & Bối cảnh' : '2. Lệnh Sáng Tạo (Prompt)'}
              </h2>

              {appMode === 'insight' ? (
                <>
                  <textarea
                    value={marketContext}
                    onChange={(e) => setMarketContext(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAnalyze();
                      }
                    }}
                    placeholder="VD: Làm tượng thờ Lễ Phục Sinh, hoặc Nhân vật Game phong cách Cyberpunk..."
                    className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-inner"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 text-right">Nhấn Enter để phân tích Insight</p>
                </>
              ) : (
                <div className="space-y-4">
                  {/* STYLE SELECTOR */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-2 block">Phong Cách Bổ Trợ (Tùy chọn)</label>
                    <div className="space-y-2">
                      {DESIGN_STYLES.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedStyleId(selectedStyleId === style.id ? null : style.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 group relative overflow-hidden
                                          ${selectedStyleId === style.id
                              ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600'
                              : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                            }
                                      `}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm shrink-0 ${style.colorClass}`}>
                            {style.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className={`text-sm font-bold ${selectedStyleId === style.id ? 'text-purple-900' : 'text-gray-700'}`}>
                              {style.name}
                            </div>
                            <div className="text-[10px] text-gray-500 line-clamp-1">{style.description}</div>
                          </div>
                          {selectedStyleId === style.id && <CheckIcon className="text-purple-600 w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* TEXTAREA */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-2 block">Chi Tiết Lệnh (Prompt)</label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleCustomGenerate();
                        }
                      }}
                      placeholder={designRefImage
                        ? "VD: Làm Banner quảng cáo cho giới trẻ, giữ sự sang trọng nhưng thêm chút Neon..."
                        : "VD: Thay đổi chất liệu sang gỗ trầm hương, đặt trong bối cảnh nhà thờ cổ..."
                      }
                      className="w-full h-24 p-3 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none shadow-inner text-gray-800"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 text-right">Nhấn Enter để tạo 5 ý tưởng</p>
                  </div>
                </div>
              )}
            </section>

            {/* 3. SETTINGS */}
            <section className="mt-8 pt-6 border-t border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">3. Cấu hình đầu ra</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Độ Phân Giải</label>
                  <select
                    value={settings.resolution}
                    onChange={(e) => setSettings({ ...settings, resolution: e.target.value as Resolution })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="1K">Chuẩn 1K</option>
                    <option value="2K">Cao cấp 2K (Pro)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Tỉ Lệ Ảnh</label>
                  <select
                    value={settings.aspectRatio}
                    onChange={(e) => setSettings({ ...settings, aspectRatio: e.target.value as AspectRatio })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="1:1">Vuông 1:1</option>
                    <option value="4:3">Ngang 4:3</option>
                    <option value="16:9">Rộng 16:9</option>
                    <option value="9:16">Dọc 9:16</option>
                  </select>
                </div>
              </div>
            </section>

          </div>

          {/* Sticky Generate Button */}
          <div className="p-6 bg-white/90 backdrop-blur border-t border-gray-200 z-30 shrink-0">
            {appMode === 'insight' ? (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || inputImages.length === 0}
                className={`w-full py-4 rounded-xl font-bold text-base shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95
                      ${isAnalyzing || inputImages.length === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30 hover:shadow-indigo-500/40'
                  }
                    `}
              >
                {isAnalyzing ? <><RefreshIcon className="animate-spin" /> Đang Phân Tích...</> : <><MagicIcon /> Tìm Insight & Concept</>}
              </button>
            ) : (
              <button
                onClick={handleCustomGenerate}
                disabled={isAnalyzing || inputImages.length === 0}
                className={`w-full py-4 rounded-xl font-bold text-base shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95
                      ${isAnalyzing || inputImages.length === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/30 hover:shadow-purple-500/40'
                  }
                    `}
              >
                {isAnalyzing ? <><RefreshIcon className="animate-spin" /> Đang Phân Tích...</> : <><MagicIcon /> Tư Duy & Sáng Tạo (5 Ý Tưởng)</>}
              </button>
            )}
          </div>
        </aside>

        {/* --- RIGHT PANEL: RESULTS --- */}
        <main className="flex-1 bg-gray-100/50 overflow-visible md:overflow-y-auto custom-scrollbar p-6 md:p-10 relative">

          {/* Background Decoration */}
          <div className={`absolute top-0 left-0 w-full h-64 bg-gradient-to-b ${appMode === 'insight' ? 'from-indigo-100/50' : 'from-purple-100/50'} to-transparent pointer-events-none`}></div>

          <div className="max-w-7xl mx-auto h-full relative z-10">
            {globalError && (
              <div className="mb-8 bg-white text-red-700 px-6 py-4 rounded-xl border border-red-200 flex items-center gap-3 shadow-lg animate-bounce-in">
                <AlertIcon /> <span className="font-medium">{globalError}</span>
              </div>
            )}

            {generatedResults.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 fade-in">
                <div className={`w-28 h-28 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl ${appMode === 'insight' ? 'text-indigo-200' : 'text-purple-200'}`}>
                  <MagicIcon className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold text-gray-700">
                  {appMode === 'insight' ? 'Deep Identity Analysis' : 'Mix & Match Creative'}
                </h3>
                <p className="text-gray-500 mt-2 text-center max-w-md">
                  {appMode === 'insight'
                    ? 'AI sẽ phân tích sâu bản chất (Sản phẩm hay Nhân vật), thấu hiểu tâm lý khách hàng và đề xuất 5 concept đúng insight.'
                    : 'Tạo ảnh mới dựa trên ảnh mẫu của bạn (có thể kết hợp với thiết kế tham khảo) và câu lệnh chi tiết.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <MagicIcon className={appMode === 'insight' ? 'text-indigo-600' : 'text-purple-600'} />
                    {appMode === 'insight' ? '5 Chiến Lược Sản Phẩm' : '5 Biến Thể Sáng Tạo'}
                  </h2>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-8 pb-12">
                  {generatedResults.map((result, idx) => (
                    <div key={result.id} className="h-full min-h-[600px]" onClick={() => result.imageUrl && handleZoom(result.imageUrl)}>
                      <ResultCard
                        data={result}
                        index={idx}
                        onGenerateImage={() => handleGenerateImageForCard(idx)}
                        onRetry={appMode === 'insight' ? () => handleAnalyze() : () => handleCustomGenerate()}
                        onViewDetails={() => setSelectedDetailItem(result)} // Set state to open modal
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;