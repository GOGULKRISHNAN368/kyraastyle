import Icon from './Icon.jsx';
export default function Toast({ tone = 'success', message, onClose }) {
  if (!message) return null;
  return <div className={`toast toast--${tone}`} role={tone === 'error' ? 'alert' : 'status'}><span>{message}</span><button className="icon-button" onClick={onClose} aria-label="Dismiss notification"><Icon name="close" size={18}/></button></div>;
}
