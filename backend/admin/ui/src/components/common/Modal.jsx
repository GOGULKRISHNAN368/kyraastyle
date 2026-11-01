import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
export default function Modal({ open, onClose, title, children, footer }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('button, input, select, textarea, [tabindex="0"]')?.focus();
    function onKey(event) {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'Tab') {
        const nodes = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter((node) => node.getClientRects().length > 0);
        if (!nodes.length) return;
        if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}><section className="dialog" role="dialog" aria-modal="true" aria-label={title} ref={dialogRef}><header className="dialog-header"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button></header><div className="dialog-body">{children}</div>{footer && <footer className="dialog-footer">{footer}</footer>}</section></div>;
}
