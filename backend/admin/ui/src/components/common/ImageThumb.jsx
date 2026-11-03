import { applyImageFallback } from '../../utils/productImage.js';

export default function ImageThumb({ src, fallbackSrc = '', alt = '', size = 'md' }) {
  const imageSrc = src || fallbackSrc;
  return imageSrc
    ? <img className={`image-thumb image-thumb--${size}`} src={imageSrc} alt={alt} onError={(event) => applyImageFallback(event, fallbackSrc)}/>
    : <span className={`image-thumb image-thumb--${size} image-thumb--empty`} aria-label="No image">◇</span>;
}
