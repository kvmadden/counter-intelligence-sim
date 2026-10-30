// Title-screen backdrop: a cartoon pharmacy counter with shelves of bottles.
export default function Counter() {
  const bottles = ["--red", "--blue", "--green", "--purple", "--orange", "--teal", "--pink", "--yellow", "--blue", "--green"];
  return (
    <svg className="backdrop" viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect x="0" y="0" width="400" height="220" fill="var(--bg)" />
      <rect x="40" y="30" width="320" height="10" rx="5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="4" />
      <rect x="40" y="90" width="320" height="10" rx="5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="4" />
      {bottles.map((c, i) => (
        <g key={i} transform={`translate(${56 + i * 30}, ${i % 2 ? 46 : 10})`}>
          <rect x="0" y="6" width="20" height="24" rx="5" fill={`var(${c})`} stroke="var(--ink)" strokeWidth="3" />
          <rect x="5" y="0" width="10" height="8" rx="2" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2" />
        </g>
      ))}
      <rect x="0" y="140" width="400" height="80" fill="var(--teal)" stroke="var(--ink)" strokeWidth="5" />
      <rect x="0" y="132" width="400" height="14" fill="var(--paper)" stroke="var(--ink)" strokeWidth="4" />
      <rect x="24" y="158" width="88" height="34" rx="8" fill="var(--paper)" stroke="var(--ink)" strokeWidth="4" />
      <text x="68" y="182" textAnchor="middle" fontFamily="Luckiest Guy, Fredoka, sans-serif" fontSize="16" fill="var(--ink)">PICK UP</text>
      <rect x="288" y="158" width="88" height="34" rx="8" fill="var(--paper)" stroke="var(--ink)" strokeWidth="4" />
      <text x="332" y="182" textAnchor="middle" fontFamily="Luckiest Guy, Fredoka, sans-serif" fontSize="16" fill="var(--ink)">DROP OFF</text>
    </svg>
  );
}
