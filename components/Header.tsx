import React, { useState } from 'react';
import { MagicIcon, CheckIcon } from './Icons';

interface HeaderProps {
  apiKeyInput: string;
  apiKeyReady: boolean;
  onApiKeyChange: (value: string) => void;
  onSaveApiKey: () => void;
}

const Header: React.FC<HeaderProps> = ({ apiKeyInput, apiKeyReady, onApiKeyChange, onSaveApiKey }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onSaveApiKey();
    setIsEditing(false);
  };

  return (
    <header className="w-full py-4 px-6 border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-lg shadow-md shadow-red-500/20 text-white">
            <MagicIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">DesignRemix AI</h1>
            <p className="text-xs text-gray-500 font-medium">Sáng tạo thiết kế với Gemini</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          {apiKeyReady && !isEditing ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-200">
                <CheckIcon />
                <span className="text-xs font-semibold text-green-700">API Key đã kết nối</span>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
              >
                Đổi
              </button>
            </>
          ) : (
            <>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => onApiKeyChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave();
                  }
                }}
                placeholder="Nhập Gemini API Key..."
                className="px-3 py-1.5 border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none w-64"
                autoFocus={isEditing}
              />
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Lưu
              </button>
              {apiKeyReady && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                >
                  Hủy
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;