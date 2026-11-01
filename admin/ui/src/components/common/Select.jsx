export default function Select({ label, error, id, children, ...props }) {
  const selectId = id || props.name;
  return <div className="field"><label htmlFor={selectId}>{label}</label><select className={`control ${error ? 'control--error' : ''}`} id={selectId} aria-invalid={Boolean(error)} {...props}>{children}</select>{error && <span className="field-error">{error}</span>}</div>;
}
