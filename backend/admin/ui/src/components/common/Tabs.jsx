export default function Tabs({ items, value, onChange }) {
  return <div className="tabs" role="tablist">{items.map((item) => <button key={item.value} role="tab" aria-selected={value === item.value} className={value === item.value ? 'tab is-active' : 'tab'} onClick={() => onChange?.(item.value)}>{item.label}</button>)}</div>;
}
