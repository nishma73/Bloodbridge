export default function Logo({ className = '', showText = true, textClass = 'text-heading' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden="true">
        <path
          fill="#DC2626"
          d="M16 2C16 2 6 13.2 6 20a10 10 0 0 0 20 0C26 13.2 16 2 16 2Z"
        />
        <path fill="#fff" opacity=".9" d="M12.5 19.5h3v-3h1v3h3v1h-3v3h-1v-3h-3z" />
      </svg>
      {showText && <span className={`text-lg font-bold ${textClass}`}>Blood Bridge</span>}
    </span>
  )
}
