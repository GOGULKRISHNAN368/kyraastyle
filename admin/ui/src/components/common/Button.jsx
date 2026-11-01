export default function Button({ variant = 'primary', size = 'md', loading = false, disabled = false, type = 'button', children, className = '', ...props }) {
  return <button type={type} className={`ui-button ui-button--${variant} ui-button--${size} ${className}`} disabled={disabled || loading} {...props}>
    {loading && <span className="spinner" aria-hidden="true" />}{children}
  </button>;
}
