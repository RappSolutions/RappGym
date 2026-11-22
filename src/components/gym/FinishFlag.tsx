/** Chequered finish flag (lucide has no racing flag). */
export function FinishFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="6" y="4" width="14" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {[0, 1, 2, 3].map((c) => [0, 1].map((r) => (c + r) % 2 === 0 ? <rect key={`${c}${r}`} x={6 + c * 3.5} y={4 + r * 5} width="3.5" height="5" fill="currentColor" /> : null))}
    </svg>
  );
}
