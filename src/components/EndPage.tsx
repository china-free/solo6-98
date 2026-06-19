import { useGameStore } from '../store/useGameStore';

export default function EndPage() {
  const { gameState, restartGame } = useGameStore();

  if (!gameState) return null;

  const isWin = gameState.phase === 'won';
  const { player, waveCount, elapsedTime, totalArtifacts } = gameState;

  const formattedTime = formatTime(elapsedTime);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-30 backdrop-blur-sm">
      <div className="text-center">
        <div
          className={`text-6xl font-bold mb-4 ${
            isWin
              ? 'bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent'
          }`}
        >
          {isWin ? '🎉 胜利！' : '💀 游戏结束'}
        </div>

        <p className="text-xl text-gray-400 mb-8">
          {isWin
            ? '你成功找到了出口！'
            : '你被盲眼怪物发现了...'}
        </p>

        <div className="bg-gray-900/80 rounded-xl p-6 border border-gray-700 mb-8 max-w-md mx-auto">
          <h3 className="text-lg font-bold text-white mb-4">游戏统计</h3>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div>
              <p className="text-gray-400 text-sm">收集文物</p>
              <p className="text-2xl font-bold text-fuchsia-400">
                {player.artifacts} / {totalArtifacts}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">用时</p>
              <p className="text-2xl font-bold text-cyan-400 font-mono">{formattedTime}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">发声次数</p>
              <p className="text-2xl font-bold text-blue-400">{waveCount}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">剩余体力</p>
              <p className="text-2xl font-bold text-green-400">{Math.round(player.stamina)}</p>
            </div>
          </div>
        </div>

        <button
          onClick={restartGame}
          className="px-12 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xl font-bold rounded-lg 
                     hover:from-cyan-400 hover:to-blue-500 transform hover:scale-105 transition-all duration-300
                     shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 animate-pulse"
        >
          再来一次
        </button>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
