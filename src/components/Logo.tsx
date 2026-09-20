/** Logo : deux enfants sur fond bleu, avec une pièce « $ ». */
export function Logo({ className = "h-8 w-8", arrondi = true }: { className?: string; arrondi?: boolean }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="Dépenses enfants">
      <rect width="512" height="512" rx={arrondi ? 112 : 0} fill="#2563eb" />
      <circle cx="196" cy="178" r="58" fill="#fff"/>
      <path d="M116 420v-92c0-50 36-86 80-86s80 36 80 86v92z" fill="#fff"/>
      <circle cx="338" cy="222" r="46" fill="#fff" stroke="#2563eb" strokeWidth="12"/>
      <path d="M276 420v-72c0-38 28-66 62-66s62 28 62 66v72z" fill="#fff" stroke="#2563eb" strokeWidth="12"/>
      <circle cx="392" cy="128" r="60" fill="#fbbf24" stroke="#2563eb" strokeWidth="14"/>
      <path d="M392 90v76M412 110c-2-10-10-15-20-15-12 0-20 7-20 16 0 10 8 14 20 17s20 8 20 18c0 9-9 16-20 16-11 0-19-6-21-15" fill="none" stroke="#7c2d12" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
