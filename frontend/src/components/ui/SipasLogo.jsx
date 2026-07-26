export default function SipasLogo({ size = 36, className = '', style = {} }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      width={size} 
      height={size} 
      className={className}
      style={{ flexShrink: 0, display: 'block', ...style }}
    >
      <defs>
        <linearGradient id="sipasGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="sipasGradRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="sipasGradCore" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <filter id="sipasGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#6366f1" floodOpacity="0.4" />
        </filter>
      </defs>

      <g filter="url(#sipasGlow)">
        {/* Left Shield Wing */}
        <path 
          d="M 47 10 L 16 26 L 16 54 C 16 73 34 86 47 90 V 68 C 39 65 30 56 30 46 V 32 L 47 23 V 10 Z" 
          fill="url(#sipasGradLeft)" 
        />

        {/* Right Shield Wing */}
        <path 
          d="M 53 10 L 84 26 L 84 54 C 84 73 66 86 53 90 V 68 C 61 65 70 56 70 46 V 32 L 53 23 V 10 Z" 
          fill="url(#sipasGradRight)" 
        />

        {/* Center Gateway Portal Arch (Satu Pintu) */}
        <path 
          d="M 45 35 C 45 28 55 28 55 35 V 60 C 55 64 45 64 45 60 Z" 
          fill="url(#sipasGradCore)" 
        />
      </g>
    </svg>
  );
}
