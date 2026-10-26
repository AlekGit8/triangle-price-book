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
      viewBox="0 -3 24 27"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* Dropping coin — painted first so the jar covers it as it falls. */}
      <circle
        cx="12"
        cy="-0.5"
        r="2.4"
        fill="#F59E0B"
        className="transition-all duration-300 group-hover:translate-y-[10px] group-hover:opacity-0"
      />
      {/* Lid */}
      <rect x="7.5" y="2" width="9" height="3.2" rx="1.2" fill="currentColor" />
      {/* Jar body */}
      <rect
        x="5.5"
        y="6"
        width="13"
        height="15"
        rx="3"
        fill="white"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Coins already in the jar */}
      <circle cx="12" cy="18.5" r="2.3" fill="#F59E0B" />
      <circle cx="8.8" cy="19" r="1.5" fill="#FBBF24" />
    </svg>
  );
}
