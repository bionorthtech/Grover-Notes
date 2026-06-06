interface GroverMarkProps {
  size?: number
  className?: string
}

/**
 * Grover's botanical mark — a small two-leaf sprout in the brand green.
 * Used in empty states and onboarding to give the app a recognizable identity.
 * Colours come from the theme tokens so it adapts to light/dark automatically.
 */
export function GroverMark({ size = 64, className }: GroverMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Grover"
      className={className}
    >
      <circle cx="32" cy="32" r="30" fill="var(--accent-blue-light)" />
      <path
        d="M32 47 V27"
        stroke="var(--accent-blue)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M31 34 C21 33 16 25 17 16 C27 16 32 24 31 34 Z"
        fill="var(--accent-blue)"
        opacity="0.85"
      />
      <path
        d="M33 30 C43 29 48 21 47 12 C37 12 32 20 33 30 Z"
        fill="var(--accent-blue)"
      />
    </svg>
  )
}
