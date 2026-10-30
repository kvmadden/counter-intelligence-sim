// The announcer: an alarm-clock referee. Its face IS the shot clock: the hand
// sweeps from twelve as the window drains. Moods: idle, bark, happy, sad, panic.
const INK = "var(--ink)";

function Eyes({ mood }) {
  if (mood === "happy") return <g><path d="M38 52 q7 -8 14 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" /><path d="M68 52 q7 -8 14 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" /></g>;
  if (mood === "sad") return <g><circle cx="45" cy="52" r="4" fill={INK} /><circle cx="75" cy="52" r="4" fill={INK} /><path d="M36 42 l14 6 M84 42 l-14 6" stroke={INK} strokeWidth="3" strokeLinecap="round" /><path d="M80 60 q4 8 0 12" fill="none" stroke="var(--blue)" strokeWidth="3" strokeLinecap="round" /></g>;
  if (mood === "panic") return <g><circle cx="45" cy="52" r="7" fill="var(--paper)" stroke={INK} strokeWidth="3" /><circle cx="75" cy="52" r="7" fill="var(--paper)" stroke={INK} strokeWidth="3" /><circle cx="46" cy="53" r="2.5" fill={INK} /><circle cx="74" cy="53" r="2.5" fill={INK} /></g>;
  if (mood === "bark") return <g><circle cx="45" cy="52" r="6" fill="var(--paper)" stroke={INK} strokeWidth="3" /><circle cx="75" cy="52" r="6" fill="var(--paper)" stroke={INK} strokeWidth="3" /><circle cx="45" cy="52" r="2.5" fill={INK} /><circle cx="75" cy="52" r="2.5" fill={INK} /></g>;
  return <g><circle cx="45" cy="52" r="4" fill={INK} /><circle cx="75" cy="52" r="4" fill={INK} /></g>;
}

function Mouth({ mood }) {
  if (mood === "happy") return <path d="M46 72 q14 14 28 0" fill="var(--red)" stroke={INK} strokeWidth="3" />;
  if (mood === "sad") return <path d="M48 80 q12 -10 24 0" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />;
  if (mood === "panic") return <path d="M46 76 l6 -5 6 5 6 -5 6 5 4 -4" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />;
  if (mood === "bark") return <ellipse cx="60" cy="76" rx="9" ry="11" fill="var(--red)" stroke={INK} strokeWidth="3" />;
  return <path d="M50 74 q10 6 20 0" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />;
}

export default function Mascot({ mood = "idle", fraction = 1, size = 120, className = "" }) {
  const angle = (1 - Math.max(0, Math.min(1, fraction))) * 360;
  return (
    <svg className={`mascot mood-${mood} ${className}`} viewBox="0 0 120 130" width={size} height={size * 1.08} aria-hidden="true">
      <circle cx="30" cy="20" r="12" fill="var(--red)" stroke={INK} strokeWidth="4" />
      <circle cx="90" cy="20" r="12" fill="var(--red)" stroke={INK} strokeWidth="4" />
      <rect x="55" y="4" width="10" height="12" rx="3" fill={INK} />
      <circle cx="60" cy="66" r="46" fill="var(--yellow)" stroke={INK} strokeWidth="5" />
      <circle cx="60" cy="66" r="36" fill="var(--paper)" stroke={INK} strokeWidth="3" />
      <g transform={`rotate(${angle} 60 66)`}>
        <line x1="60" y1="66" x2="60" y2="38" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx="60" cy="66" r="3.5" fill={INK} />
      <Eyes mood={mood} />
      <Mouth mood={mood} />
      <line x1="34" y1="112" x2="26" y2="126" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <line x1="86" y1="112" x2="94" y2="126" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
