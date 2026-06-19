import { useGameStore } from '../store/useGameStore';

export default function PauseMenu() {
  const { resumeGame, restartGame } = useGameStore();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-30 backdrop-blur-sm">
      <div className="bg-gray-900/90 p-8 rounded-xl border border-gray-700 max-w-sm w-full mx-4 text-center">
        <h2 className="text-4xl font-bold text-white mb-2">暂停</h2>
        <p className="text-gray-400 mb-8">游戏已暂停</p>

        <div className="space-y-3">
          <button
            onClick={resumeGame}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg
                       hover:from-cyan-400 hover:to-blue-500 transition-all duration-300
                       shadow-lg shadow-cyan-500/20"
          >
            继续游戏
          </button>

          <button
            onClick={restartGame}
            className="w-full py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            重新开始
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-gray-500 text-xs">按 ESC 键继续游戏</p>
        </div>
      </div>
    </div>
  );
}
