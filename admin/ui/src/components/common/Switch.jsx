export default function Switch({ label, checked, onChange, disabled = false }) {
  return <label className={`switch-row ${disabled ? 'is-disabled' : ''}`}><span>{label}</span><input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange?.(event.target.checked)}/><span className="switch-track" aria-hidden="true"/></label>;
}
