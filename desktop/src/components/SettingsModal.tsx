import { useState, useRef } from 'react';
import { useAppStore } from '@/store';
import { useTheme, colorRegionLabels, type ColorRegion } from '@/store/theme';
import { getApiBaseUrl } from '@/api';
import { RGBAColorPicker } from './RGBAColorPicker';

// Settings icon
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const ImageIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const PaletteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
);

// Color region order for display
const colorRegionOrder: ColorRegion[] = ['primary', 'secondary', 'accent', 'header', 'sidebar', 'background', 'text'];

export function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'colors'>('general');
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const { setApiBaseUrl, fetchServers } = useAppStore();
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    setApiBaseUrl(apiUrl);
    fetchServers(1);
    setIsOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        theme.setBackgroundImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearBackground = () => {
    theme.setBackgroundImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2.5 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
        title="设置"
      >
        <SettingsIcon />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-500 to-purple-500 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <SettingsIcon />
                </div>
                <h2 className="text-lg font-bold text-white">设置</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
              >
                <XIcon />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={() => setActiveTab('general')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'general'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                通用
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'appearance'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                外观
              </button>
              <button
                onClick={() => setActiveTab('colors')}
                className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'colors'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <PaletteIcon />
                调色板
              </button>
            </div>
            
            {/* Content */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {activeTab === 'general' ? (
                <>
                  {/* API Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      API 服务器地址
                    </label>
                    <input
                      type="text"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="https://servers.upkk.com"
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      输入服务器API地址
                    </p>
                  </div>
                </>
              ) : activeTab === 'appearance' ? (
                <>
                  {/* Dark Mode Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      {theme.darkMode ? <MoonIcon /> : <SunIcon />}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">暗色模式</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">切换明暗主题</p>
                      </div>
                    </div>
                    <button
                      onClick={() => theme.setDarkMode(!theme.darkMode)}
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        theme.darkMode ? 'bg-purple-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          theme.darkMode ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Glass Effect Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">毛玻璃效果</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">启用半透明模糊效果</p>
                    </div>
                    <button
                      onClick={() => theme.setGlassEffect(!theme.glassEffect)}
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        theme.glassEffect ? 'bg-purple-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          theme.glassEffect ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Background Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      背景图片
                    </label>
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                      >
                        <ImageIcon />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {theme.backgroundImage ? '更换图片' : '选择图片'}
                        </span>
                      </button>
                      {theme.backgroundImage && (
                        <button
                          onClick={handleClearBackground}
                          className="px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                        >
                          清除
                        </button>
                      )}
                    </div>
                    {theme.backgroundImage && (
                      <div className="mt-3 h-24 rounded-xl overflow-hidden">
                        <img
                          src={theme.backgroundImage}
                          alt="背景预览"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Background Opacity */}
                  {theme.backgroundImage && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        背景透明度: {theme.backgroundOpacity}%
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={theme.backgroundOpacity}
                        onChange={(e) => theme.setBackgroundOpacity(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                  )}

                  {/* Reset Theme */}
                  <button
                    onClick={theme.resetTheme}
                    className="w-full py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  >
                    重置所有外观设置
                  </button>
                </>
              ) : (
                <>
                  {/* Colors Tab - RGBA Color Pickers for each region */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <PaletteIcon />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">多区域调色板</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">支持 RGBA 调色，自由设置每个区域的颜色</p>
                      </div>
                    </div>

                    {colorRegionOrder.map((region) => (
                      <RGBAColorPicker
                        key={region}
                        label={colorRegionLabels[region]}
                        color={theme.colorRegions[region]}
                        onChange={(color) => theme.setColorRegion(region, color)}
                        onReset={() => theme.resetColorRegion(region)}
                      />
                    ))}

                    {/* Reset All Colors */}
                    <button
                      onClick={theme.resetTheme}
                      className="w-full py-3 mt-4 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-gray-200 dark:border-gray-700"
                    >
                      重置所有颜色
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                关闭
              </button>
              {activeTab === 'general' && (
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
                >
                  保存设置
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
