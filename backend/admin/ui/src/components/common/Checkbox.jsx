export default function Checkbox({ label, ...props }) {
  return <label className="check-row"><input type="checkbox" {...props}/><span>{label}</span></label>;
}
