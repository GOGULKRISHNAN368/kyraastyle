(() => {
  'use strict';
  const valid = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
  function setAspect(target, width, height) {
    if (!target || !valid(width) || !valid(height)) return;
    const aspect = Number(width) / Number(height);
    target.style.setProperty('--image-aspect', String(aspect));
    target.style.aspectRatio = `${Number(width)} / ${Number(height)}`;
  }
  function fit(image, dimensions = {}, frame = null, fallback = { width: 800, height: 1000 }) {
    const width = valid(dimensions.width) ? Number(dimensions.width) : Number(fallback.width) || 800;
    const height = valid(dimensions.height) ? Number(dimensions.height) : Number(fallback.height) || 1000;
    image.width = width; image.height = height;
    image.dataset.imageAspect = String(width / height);
    setAspect(frame, width, height);
    const loaded = () => {
      if (!valid(image.naturalWidth) || !valid(image.naturalHeight)) return;
      image.width = image.naturalWidth; image.height = image.naturalHeight;
      image.dataset.imageAspect = String(image.naturalWidth / image.naturalHeight);
      setAspect(frame, image.naturalWidth, image.naturalHeight);
    };
    image.addEventListener('load', loaded, { once: true });
    if (image.complete && image.naturalWidth) loaded();
  }
  window.KyraaProductImages = { fit, setAspect };
})();