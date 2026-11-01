export default function Input({ label, error, hint, id, ...props }) {
  const inputId = id || props.name;
  return <div className="field"><label htmlFor={inputId}>{label}</label><input className={`control ${error ? 'control--error' : ''}`} id={inputId} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined} {...props}/>{error && <span className="field-error" id={`${inputId}-error`}>{error}</span>}{hint && !error && <span className="field-hint" id={`${inputId}-hint`}>{hint}</span>}</div>;
}
