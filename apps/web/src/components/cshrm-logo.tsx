interface CsHrmLogoProps {
  size?: number;
  className?: string;
}

/**
 * Inline SVG logo — no file dependency, works in any environment.
 * Size controls both width and height (square).
 */
export function CsHrmLogo({ size = 40, className }: CsHrmLogoProps) {
  const r = Math.round(size * 0.13); // corner radius
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="CloudSourceHRM"
    >
      {/* Background */}
      <rect width="100" height="100" rx={r * (100 / size)} fill="#0B1940" />
      {/* CS */}
      <text
        x="50"
        y="41"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="bold"
        fontSize="36"
        fill="white"
        textAnchor="middle"
      >
        CS
      </text>
      {/* Divider line */}
      <rect x="10" y="51" width="80" height="3.5" fill="white" />
      {/* HRM */}
      <text
        x="50"
        y="77"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="bold"
        fontSize="26"
        fill="white"
        textAnchor="middle"
      >
        HRM
      </text>
    </svg>
  );
}
