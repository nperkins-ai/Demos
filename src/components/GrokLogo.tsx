/**
 * GrokLogo — SVG icon component for the Grok/xAI "X" logo.
 *
 * Used in the chat header, message avatars, welcome screen, and homepage.
 * Renders as an SVG that inherits color from `currentColor` (set via text-* classes).
 *
 * HOW TO MODIFY:
 * - To change the logo: replace the <path> d attribute with a different SVG path
 * - To change the default size: edit the default value of className
 * - Color is controlled by the parent via Tailwind text color classes (e.g., text-[#e44d26])
 */
export function GrokLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 3L10.5 13.5M21 21L13.5 10.5M10.5 13.5L21 3M13.5 10.5L3 21M10.5 13.5L13.5 10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}