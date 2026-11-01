import { useEffect, useRef, useState } from 'react';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import Textarea from '../common/Textarea.jsx';
import { uploadCategoryImage } from '../../services/api.js';

export default function CategoryForm({ category, onSave, onCancel }) {
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(category?.imageUrl || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const folderInput = useRef(null);
  const cameraInput = useRef(null);

  useEffect(() => {
    setName(category?.name || '');
    setDescription(category?.description || '');
    setImageFile(null);
    setPreview(category?.imageUrl || '');
    setError('');
  }, [category]);

  useEffect(() => () => {
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
  }, [preview]);

  function chooseFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    setError('');
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function submit(event) {
    event.preventDefault();
    if (!name.trim()) { setError('Category name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = { name: name.trim(), description: description.trim() };
      if (imageFile) {
        const uploaded = await uploadCategoryImage(imageFile);
        payload.cloudinaryId = uploaded.data.cloudinaryId;
        payload.width = uploaded.data.width;
        payload.height = uploaded.data.height;
      }
      await onSave(payload);
    } catch (reason) {
      setError(reason.message || 'Could not save this category.');
    } finally {
      setSaving(false);
    }
  }

  return <form className="category-editor" onSubmit={submit} noValidate>
    <h2>{category ? 'Edit Category' : 'Create New Category'}</h2>
    {error && <p className="product-form-error" role="alert">{error}</p>}
    <div className="category-form-grid">
      <div className="category-image-column">
        <input ref={folderInput} className="dress-file-input" type="file" accept="image/*" onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = ''; }}/>
        <input ref={cameraInput} className="dress-file-input" type="file" accept="image/*" capture="environment" onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = ''; }}/>
        <button className={`category-image-picker ${dragOver ? 'is-dragging' : ''}`} type="button" onClick={() => folderInput.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(event) => { event.preventDefault(); setDragOver(false); chooseFile(event.dataTransfer.files?.[0]); }} aria-label="Choose or drop category image">
          {preview ? <img src={preview} alt="Category preview"/> : <><span aria-hidden="true">&#128193;</span><strong>Category Image</strong><small>(Recommended: 600x900 Portrait)</small></>}
        </button>
        <div className="category-image-actions"><Button variant="secondary" onClick={() => folderInput.current?.click()}>Choose image</Button><Button variant="secondary" onClick={() => cameraInput.current?.click()}>Camera</Button></div>
      </div>
      <div className="category-fields">
        <Input label="Category name" name="category-name" value={name} onChange={(event) => setName(event.target.value)} maxLength="100" required/>
        <Textarea label="Description (SEO)" name="category-description" rows="3" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe this category..."/>
        <div className="category-form-actions"><Button type="submit" loading={saving}>{saving ? 'Saving...' : category ? 'Update Category' : 'Save Category'}</Button>{category && <Button variant="secondary" onClick={onCancel}>Cancel Edit</Button>}</div>
      </div>
    </div>
  </form>;
}
