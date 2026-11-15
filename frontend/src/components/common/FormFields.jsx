
// Form inputs: TextField, TextArea and SelectField. All show a label and an error message.
import { useId } from 'react'

const BASE =
  'block w-full rounded-xl border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary ' +
  'placeholder:text-text-muted focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface'

function fieldClass(error) {
  return `${BASE} ${
    error
      ? 'border-red-500/60 focus:border-red-400 focus:ring-red-500/20'
      : 'border-border focus:border-violet-500 focus:ring-violet-500/20'
  }`
}

function FieldShell({ id, label, error, hint, children }) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}

      {children}

      {error ? (
        <p className="mt-1.5 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-text-muted">{hint}</p>
      )}
    </div>
  )
}

// endAdornment lets a parent place a button inside the field (e.g. show/hide password).
export function TextField({ label, error, hint, endAdornment, className = '', ...props }) {
  const id = useId()

  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <input
          id={id}
          aria-invalid={Boolean(error)}
          className={`${fieldClass(error)} ${endAdornment ? 'pr-11' : ''} ${className}`}
          {...props}
        />

        {endAdornment && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {endAdornment}
          </div>
        )}
      </div>
    </FieldShell>
  )
}

export function TextArea({ label, error, hint, className = '', ...props }) {
  const id = useId()

  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <textarea
        id={id}
        rows={4}
        aria-invalid={Boolean(error)}
        className={`${fieldClass(error)} resize-y ${className}`}
        {...props}
      />
    </FieldShell>
  )
}

export function SelectField({ label, error, hint, options, className = '', ...props }) {
  const id = useId()

  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <select
        id={id}
        className={`${fieldClass(error)} ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}
