
// KnowFlow wordmark. tone="dark" is for dark backgrounds (sidebar), "light" for white pages.
export default function Logo({ tone = 'dark', tagline = false, className = 'text-3xl' }) {
  return (
    <div>
      <p
        className={`font-bold tracking-tight ${tone === 'dark' ? 'text-white' :
          'text-text-primary'} ${className}`}
      >
        Know<span className="text-violet-400">Flow</span>
      </p>

      {tagline && (
        <p
          className={`mt-1 text-sm ${tone === 'dark' ? 'text-text-muted' : 'text-text-secondary'}`}
        >
          Project Knowledge Management
        </p>
      )}
    </div>
  )
}
