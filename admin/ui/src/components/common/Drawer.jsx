import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
export default function Drawer({ open, onClose, title = 'Details', children, footer, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('button, input, select, textarea, [tabindex="0"]')?.focus();
    function keydown(event) {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'Tab') {
        const items = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter((node) => node.getClientRects().length > 0);
        if (!items.length) return;
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
      }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', keydown); previousFocus?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}><aside className={`drawer ${className}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}><header className="dialog-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close drawer"><Icon name="close"/></button></header><div className="dialog-body">{children}</div>{footer && <footer className="dialog-footer">{footer}</footer>}</aside></div>;
}
