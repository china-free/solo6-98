import { useGameStore } from '../store/useGameStore';
import { WAVE_CONFIGS } from '../utils/materials';

export default function HUD() {
  const { gameState } = useGameStore();

  if (!gameState) return null;

  const { player, waveCount, elapsedTime, totalArtifacts, dangerLevel } = gameState;
  const staminaPercent = (player.stamina / player.maxStamina) * 100;
  const formattedTime = formatTime(elapsedTime);

  const knockCost = WAVE_CONFIGS.knock.staminaCost;
  const whistleCost = WAVE_CONFIGS.whistle.staminaCost;

  const canKnock = player.stamina >= knockCost;
  const canWhistle = player.stamina >= whistleCost;

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      <div className="absolute top-4 left-4 pointer-events-auto">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-gray-700/50">
          <div className="text-xs text-gray-400 mb-1">体力</div>
          <div className="w-48 h-4 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-200 ease-out"
              style={{
                width: `${staminaPercent}%`,
                background: staminaPercent > 30
                  ? 'linear-gradient(90deg, #06b6d4, #3b82f6)'
                  : 'linear-gradient(90deg, #ef4444, #f97316)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs">
            <span className="text-gray-400">{Math.round(player.stamina)}/{player.maxStamina}</span>
          </div>
        </div>

        <div className="mt-2 bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-gray-700/50 text-xs">
          <div className="flex gap-4">
            <div>
              <span className="text-gray-400">Z 敲击</span>
              <span className={`ml-2 ${canKnock ? 'text-cyan-400' : 'text-red-400'}`}>
                -{knockCost}
              </span>
            </div>
            <div>
              <span className="text-gray-400">X 口哨</span>
              <span className={`ml-2 ${canWhistle ? 'text-pink-400' : 'text-red-400'}`}>
                -{whistleCost}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 pointer-events-auto">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-gray-700/50 text-right">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-gray-400 text-sm">文物</span>
            <span className="text-2xl font-bold text-fuchsia-400">
              {player.artifacts}/{totalArtifacts}
            </span>
          </div>
          <div className="flex items-center gap-2 justify-end mt-1">
            <span className="text-gray-400 text-xs">发声次数</span>
            <span className="text-cyan-400">{waveCount}</span>
          </div>
          <div className="flex items-center gap-2 justify-end mt-1">
            <span className="text-gray-400 text-xs">时间</span>
            <span className="text-gray-300 font-mono">{formattedTime}</span>
          </div>
        </div>
      </div>

      {dangerLevel > 0.3 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div
            className="text-red-500 font-bold text-xl animate-pulse"
            style={{ opacity: dangerLevel * 0.8 }}
          >
            ⚠ 危险接近 ⚠
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2 text-xs text-gray-500 border border-gray-800/50">
          <span className="text-gray-400">WASD</span> 移动
          <span className="mx-2">|</span>
          <span className="text-cyan-400">Z</span> 敲击
          <span className="mx-2">|</span>
          <span className="text-pink-400">X</span> 口哨
          <span className="mx-2">|</span>
          <span className="text-gray-400">ESC</span> 暂停
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
