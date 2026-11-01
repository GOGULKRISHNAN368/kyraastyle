import Button from './Button.jsx';
import Modal from './Modal.jsx';
export default function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', children, confirmLabel = 'Confirm' }) {
  return <Modal open={open} onClose={onClose} title={title} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button></>}><p>{children}</p></Modal>;
}
