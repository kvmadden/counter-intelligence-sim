const INK = "var(--ink)";

export default function Witness({ mood = "idle", className = "" }) {
  const isShocked = mood === "shocked" || mood === "breakdown";
  const isPressed = mood === "pressed";
  const isHappy = mood === "happy";

  return (
    <svg
      className={`witness-sprite witness-mood-${mood} ${className}`}
      viewBox="0 0 240 220"
      width="100%"
      height="100%"
      style={{ maxHeight: '200px' }}
      aria-label="Skeptical Steve Witness"
    >
      {/* Background Courtroom / Pharmacy Counter Stand */}
      <rect x="20" y="150" width="200" height="70" rx="8" fill="var(--teal)" stroke={INK} strokeWidth="4" />
      <rect x="10" y="142" width="220" height="14" rx="4" fill="var(--paper)" stroke={INK} strokeWidth="4" />
      <rect x="60" y="166" width="120" height="30" rx="6" fill="var(--paper)" stroke={INK} strokeWidth="3" />
      <text
        x="120"
        y="186"
        textAnchor="middle"
        fontFamily="Luckiest Guy, Fredoka, sans-serif"
        fontSize="14"
        fill={INK}
        letterSpacing="1"
      >
        WITNESS
      </text>

      {/* Body / Torso */}
      <path
        d="M60 142 Q120 120 180 142 L185 170 L55 170 Z"
        fill="var(--orange)"
        stroke={INK}
        strokeWidth="4"
      />
      {/* Collar & Tie */}
      <polygon points="120,135 110,146 130,146" fill="var(--paper)" stroke={INK} strokeWidth="2" />
      <polygon points="116,146 124,146 126,170 120,176 114,170" fill="var(--blue)" stroke={INK} strokeWidth="2" />

      {/* Head */}
      <rect x="82" y="55" width="76" height="76" rx="30" fill="var(--cream)" stroke={INK} strokeWidth="4" />

      {/* Hair */}
      <path
        d={
          isShocked
            ? "M75 56 Q85 10 120 20 Q155 10 165 56 Q150 45 120 48 Q90 45 75 56 Z"
            : "M76 66 Q80 34 120 34 Q160 34 164 66 Q146 50 120 52 Q94 50 76 66 Z"
        }
        fill="var(--inkSoft)"
        stroke={INK}
        strokeWidth="3.5"
      />

      {/* Ears */}
      <circle cx="80" cy="92" r="7" fill="var(--cream)" stroke={INK} strokeWidth="3" />
      <circle cx="160" cy="92" r="7" fill="var(--cream)" stroke={INK} strokeWidth="3" />

      {/* Eyes & Brows */}
      {isShocked ? (
        <g>
          {/* Shocked / Breakdown Eyes */}
          <circle cx="100" cy="88" r="12" fill="var(--paper)" stroke={INK} strokeWidth="3.5" />
          <circle cx="140" cy="88" r="12" fill="var(--paper)" stroke={INK} strokeWidth="3.5" />
          <circle cx="100" cy="88" r="4" fill="var(--red)" />
          <circle cx="140" cy="88" r="4" fill="var(--red)" />
          {/* Raised slanted brows */}
          <line x1="88" y1="70" x2="108" y2="76" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <line x1="152" y1="70" x2="132" y2="76" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        </g>
      ) : isPressed ? (
        <g>
          {/* Sweating / Press Eyes */}
          <ellipse cx="102" cy="88" rx="8" ry="10" fill="var(--paper)" stroke={INK} strokeWidth="3" />
          <ellipse cx="138" cy="88" rx="8" ry="10" fill="var(--paper)" stroke={INK} strokeWidth="3" />
          <circle cx="104" cy="90" r="3.5" fill={INK} />
          <circle cx="136" cy="90" r="3.5" fill={INK} />
          {/* Nervous brows */}
          <line x1="92" y1="73" x2="110" y2="76" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="148" y1="73" x2="130" y2="76" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      ) : isHappy ? (
        <g>
          {/* Convinced / Conceded Eyes */}
          <path d="M94 88 Q102 78 110 88" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M130 88 Q138 78 146 88" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M92 76 Q102 72 112 76" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M128 76 Q138 72 148 76" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          {/* Skeptical Eyes */}
          <circle cx="102" cy="88" r="5" fill={INK} />
          <circle cx="138" cy="88" r="5" fill={INK} />
          {/* Skeptical asymmetric brows */}
          <line x1="92" y1="73" x2="112" y2="79" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <line x1="128" y1="76" x2="148" y2="73" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        </g>
      )}

      {/* Mouth */}
      {isShocked ? (
        <ellipse cx="120" cy="116" rx="14" ry="12" fill="var(--red)" stroke={INK} strokeWidth="3.5" />
      ) : isPressed ? (
        <path d="M106 114 Q120 108 134 114" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      ) : isHappy ? (
        <path d="M106 112 Q120 126 134 112" fill="var(--red)" stroke={INK} strokeWidth="3" />
      ) : (
        <line x1="108" y1="114" x2="132" y2="114" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      )}

      {/* Sweat Drops for pressed/shocked */}
      {(isPressed || isShocked) && (
        <g>
          <path
            d="M158 68 C158 64 163 60 163 60 C163 60 168 64 168 68 C168 71 166 73 163 73 C160 73 158 71 158 68 Z"
            fill="var(--blue)"
            stroke={INK}
            strokeWidth="1.5"
          />
          {isShocked && (
            <path
              d="M72 68 C72 64 77 60 77 60 C77 60 82 64 82 68 C82 71 80 73 77 73 C74 73 72 71 72 68 Z"
              fill="var(--blue)"
              stroke={INK}
              strokeWidth="1.5"
            />
          )}
        </g>
      )}
    </svg>
  );
}
