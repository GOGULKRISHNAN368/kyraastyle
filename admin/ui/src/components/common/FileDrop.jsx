import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
export default function FileDrop({ accept = 'image/*', multiple = false, onFiles, label = 'Add dress images', allowCamera = false }) {
  const inputRef = useRef(null);
  const cameraRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const pick = (files) => { if (files?.length) onFiles?.([...files]); };
  return <div className={`file-drop ${dragging ? 'is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); pick(event.dataTransfer.files); }}>
    <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={(event) => { pick(event.target.files); event.target.value = ''; }}/>
    <div className="file-drop-actions"><button className="file-drop-trigger" type="button" onClick={() => inputRef.current?.click()}><Icon name="image" size={26}/><strong>{label}</strong><span>Tap to choose photos or drop files here.</span><small>Select image files from your device.</small></button>{allowCamera && <button className="file-drop-camera" type="button" onClick={() => cameraRef.current?.click()}><Icon name="image" size={20}/><span>Use camera</span></button>}</div>
    {allowCamera && <input ref={cameraRef} type="file" accept={accept} capture="environment" onChange={(event) => { pick(event.target.files); event.target.value = ''; }}/>}
  </div>;
}
