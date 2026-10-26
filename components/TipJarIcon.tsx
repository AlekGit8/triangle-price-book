/**
 * TipJarIcon — a little mason-jar tip jar for the header nav.
 *
 * Hand-drawn SVG, stroke in currentColor so it matches the nav text,
 * with gold coins (the site's amber) already in the jar. The fun part:
 * on hover of the parent link (which carries the `group` class), a coin
 * drops from above the lid into the jar and disappears behind it —
 * the jar body is filled white and painted after the coin, so the coin
 * is hidden once it falls inside.
 */
export default function TipJarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 -2 24 26"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* Dropping coin — painted first so the jar covers it as it falls. */}
      <circle
        cx="12"
        cy="0"
        r="2.2"
        fill="#F59E0B"
        className="transition-all duration-300 group-hover:translate-y-[9px] group-hover:opacity-0"
      />
      {/* Lid */}
      <rect x="8" y="2" width="8" height="2.6" rx="1" fill="currentColor" />
      {/* Jar body */}
      <rect
        x="6"
        y="5.5"
        width="12"
        height="15.5"
        rx="3"
        fill="white"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      {/* Coins already in the jar */}
      <circle cx="9.3" cy="18.6" r="1.5" fill="#F59E0B" />
      <circle cx="13.8" cy="18.9" r="1.5" fill="#FBBF24" />
    </svg>
  );
}
