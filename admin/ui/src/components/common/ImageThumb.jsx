export default function ImageThumb({ src, alt = '', size = 'md' }) {
  return src ? <img className={`image-thumb image-thumb--${size}`} src={src} alt={alt}/> : <span className={`image-thumb image-thumb--${size} image-thumb--empty`} aria-label="No image">◇</span>;
}
