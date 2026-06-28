import { healthPercentage } from '../utils/tasks'

export default function HouseHealthGauge({ data, compact = false }) {
  const pct = healthPercentage(data)
  // Fill starts at bottom (y=190) and rises to cover pct% of house height (190 units tall)
  const fillY = Math.round(190 - (190 * pct / 100))

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-lg font-mono font-bold text-accent">{pct}%</div>
        <div className="text-xs text-muted font-mono">health</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <svg width="100" height="110" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* House outline clip path */}
          <clipPath id="house-clip">
            <polygon points="100,10 196,78 196,196 4,196 4,78" />
          </clipPath>
          {/* Door and windows as subtractions from clip (use mask instead) */}
          <mask id="house-mask">
            {/* Fill the house shape white (visible) */}
            <polygon points="100,10 196,78 196,196 4,196 4,78" fill="white" />
          </mask>
        </defs>

        {/* Amber fill rectangle — rises from bottom based on pct */}
        <rect
          x="0" y={fillY} width="200" height={200 - fillY}
          fill="#fbbf24"
          opacity="0.85"
          clipPath="url(#house-clip)"
        />

        {/* House outline */}
        <polygon
          points="100,10 196,78 196,196 4,196 4,78"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* Door */}
        <rect x="82" y="148" width="36" height="48" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
        {/* Window left */}
        <rect x="22" y="108" width="42" height="34" rx="2" fill="none" stroke="#fbbf24" strokeWidth="2" />
        {/* Window right */}
        <rect x="136" y="108" width="42" height="34" rx="2" fill="none" stroke="#fbbf24" strokeWidth="2" />
        {/* Chimney */}
        <rect x="140" y="10" width="18" height="36" fill="none" stroke="#fbbf24" strokeWidth="2" />
      </svg>

      <div className="text-3xl font-mono font-bold text-accent leading-none">{pct}%</div>
      <div className="text-[10px] font-mono text-muted tracking-widest uppercase">Home Health</div>
    </div>
  )
}
