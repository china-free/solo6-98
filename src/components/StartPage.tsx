import { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import type { QualityLevel } from '../types/game';

export default function StartPage() {
  const { initialize, startGame, setSettings, gameState } = useGameStore();
  const [showSettings, setShowSettings] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);

  const volume = gameState?.settings.volume ?? 0.7;
  const quality = gameState?.settings.quality ?? 'medium';
  const soundEnabled = gameState?.settings.soundEnabled ?? true;

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const timer1 = setTimeout(() => setTitleVisible(true), 200);
    const timer2 = setTimeout(() => setButtonsVisible(true), 800);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleStart = () => {
    startGame();
  };

  const handleQualityChange = (quality: QualityLevel) => {
    setSettings({ quality });
  };

  return (
    <div className="fixed inset-0 bg-[#05050a] flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-cyan-500/10 animate-pulse"
            style={{
              width: `${20 + Math.random() * 60}px`,
              height: `${20 + Math.random() * 60}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div
        className={`relative z-10 text-center transition-all duration-1000 ${
          titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <h1 className="text-7xl font-bold mb-4 tracking-wider">
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
            回声
          </span>
          <span className="text-white"> 定位</span>
        </h1>
        <p className="text-2xl text-gray-400 mb-2 tracking-wide">ECHO LOCATOR</p>
        <p className="text-gray-500 max-w-md mx-auto text-sm">
          在完全黑暗的地牢中，只有声音能照亮你的道路。
          利用声波的反射来探索未知，小心循声而来的怪物。
        </p>
      </div>

      <div
        className={`relative z-10 mt-16 flex flex-col gap-4 transition-all duration-1000 ${
          buttonsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <button
          onClick={handleStart}
          className="px-16 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xl font-bold rounded-lg 
                     hover:from-cyan-400 hover:to-blue-500 transform hover:scale-105 transition-all duration-300
                     shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
        >
          开始探险
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-8 py-3 bg-gray-800/50 text-gray-300 rounded-lg border border-gray-700
                     hover:bg-gray-700/50 hover:text-white transition-all duration-300"
        >
          设置
        </button>
      </div>

      {showSettings && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 backdrop-blur-sm">
          <div className="bg-gray-900 p-8 rounded-xl border border-gray-700 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-6">游戏设置</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-300 mb-2">音量: {Math.round(volume * 100)}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume * 100}
                  onChange={(e) => setSettings({ volume: parseInt(e.target.value) / 100 })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">画质</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as QualityLevel[]).map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQualityChange(q)}
                      className={`flex-1 py-2 rounded-lg border transition-all ${
                        quality === q
                          ? 'bg-cyan-600 border-cyan-500 text-white'
                          : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {q === 'low' ? '低' : q === 'medium' ? '中' : '高'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-gray-300">音效</label>
                <button
                  onClick={() => setSettings({ soundEnabled: !soundEnabled })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    soundEnabled ? 'bg-cyan-600' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="mt-8 w-full py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      <div
        className={`absolute bottom-8 text-center text-gray-500 text-sm transition-all duration-1000 ${
          buttonsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="mb-2">操作说明</p>
        <div className="flex gap-6 justify-center flex-wrap">
          <span><kbd className="px-2 py-1 bg-gray-800 rounded text-cyan-400">WASD</kbd> 移动</span>
          <span><kbd className="px-2 py-1 bg-gray-800 rounded text-cyan-400">Z</kbd> 敲击 (低频)</span>
          <span><kbd className="px-2 py-1 bg-gray-800 rounded text-cyan-400">X</kbd> 口哨 (高频)</span>
          <span><kbd className="px-2 py-1 bg-gray-800 rounded text-cyan-400">ESC</kbd> 暂停</span>
        </div>
      </div>
    </div>
  );
}
