export function safeCloudinaryMessage(message, credentials) {
  const safe = String(message || '')
    .replaceAll(credentials?.apiKey || '\u0000', '[redacted]')
    .replaceAll(credentials?.apiSecret || '\u0000', '[redacted]')
    .replace(/[\r\n\t]/g, ' ')
    .trim()
    .slice(0, 240);
  return safe || 'Cloudinary returned an empty error response.';
}
