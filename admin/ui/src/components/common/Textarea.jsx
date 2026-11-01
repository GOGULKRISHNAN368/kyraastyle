export default function Textarea({ label, error, id, ...props }) {
  const areaId = id || props.name;
  return <div className="field"><label htmlFor={areaId}>{label}</label><textarea className={`control ${error ? 'control--error' : ''}`} id={areaId} aria-invalid={Boolean(error)} {...props}/>{error && <span className="field-error">{error}</span>}</div>;
}
