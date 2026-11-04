(() => {
  'use strict';
  const VERSION = 5; const SIZE = 21 + (VERSION - 1) * 4; const DATA_CODEWORDS = 108; const ECC_CODEWORDS = 26;
  const multiply = (x, y) => { let result = 0; for (let i = 7; i >= 0; i -= 1) { result = (result << 1) ^ ((result >>> 7) * 0x11d); result ^= ((y >>> i) & 1) * x; } return result; };
  function appendBits(bits, value, length) { for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1); }
  function makeCodewords(text) {
    const bytes = [...new TextEncoder().encode(text)]; const bits = [];
    appendBits(bits, 0b0100, 4); appendBits(bits, bytes.length, 8); bytes.forEach((byte) => appendBits(bits, byte, 8));
    if (bits.length > DATA_CODEWORDS * 8) throw new Error('The UPI payment details are too long for a QR code.');
    for (let i = 0; i < Math.min(4, DATA_CODEWORDS * 8 - bits.length); i += 1) bits.push(0);
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0));
    for (let pad = 0; data.length < DATA_CODEWORDS; pad += 1) data.push(pad % 2 ? 0x11 : 0xec);
    const divisor = Array(ECC_CODEWORDS).fill(0); divisor[ECC_CODEWORDS - 1] = 1; let root = 1;
    for (let i = 0; i < ECC_CODEWORDS; i += 1) { for (let j = 0; j < ECC_CODEWORDS; j += 1) { divisor[j] = multiply(divisor[j], root); if (j + 1 < ECC_CODEWORDS) divisor[j] ^= divisor[j + 1]; } root = multiply(root, 2); }
    const remainder = Array(ECC_CODEWORDS).fill(0);
    data.forEach((byte) => { const factor = byte ^ remainder.shift(); remainder.push(0); remainder.forEach((_, index) => { remainder[index] ^= multiply(divisor[index], factor); }); });
    return [...data, ...remainder];
  }
  function makeMatrix(text) {
    const matrix = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    const set = (x, y, value) => { if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) matrix[y][x] = Boolean(value); };
    function finder(cx, cy) { for (let dy = -4; dy <= 4; dy += 1) for (let dx = -4; dx <= 4; dx += 1) { const distance = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, distance !== 2 && distance !== 4); } }
    for (let i = 0; i < SIZE; i += 1) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    finder(3, 3); finder(SIZE - 4, 3); finder(3, SIZE - 4);
    if (matrix[30][30] === null) for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) set(30 + dx, 30 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    const formatData = 0b01000; let formatRemainder = formatData << 10;
    for (let bit = 14; bit >= 10; bit -= 1) if ((formatRemainder >>> bit) & 1) formatRemainder ^= 0x537 << (bit - 10);
    const formatBits = ((formatData << 10) | formatRemainder) ^ 0x5412;
    const bitAt = (index) => ((formatBits >>> index) & 1) !== 0;
    for (let i = 0; i <= 5; i += 1) set(8, i, bitAt(i)); set(8, 7, bitAt(6)); set(8, 8, bitAt(7)); set(7, 8, bitAt(8));
    for (let i = 9; i < 15; i += 1) set(14 - i, 8, bitAt(i));
    for (let i = 0; i < 8; i += 1) set(SIZE - 1 - i, 8, bitAt(i));
    for (let i = 8; i < 15; i += 1) set(8, SIZE - 15 + i, bitAt(i));
    set(8, SIZE - 8, true);
    const stream = makeCodewords(text).flatMap((byte) => Array.from({ length: 8 }, (_, index) => (byte >>> (7 - index)) & 1));
    let bitIndex = 0; let upward = true;
    for (let right = SIZE - 1; right >= 1; right -= 2) {
      if (right === 6) right -= 1;
      for (let vertical = 0; vertical < SIZE; vertical += 1) {
        const y = upward ? SIZE - 1 - vertical : vertical;
        for (let offset = 0; offset < 2; offset += 1) { const x = right - offset; if (matrix[y][x] !== null) continue; let value = bitIndex < stream.length ? stream[bitIndex] !== 0 : false; bitIndex += 1; if ((x + y) % 2 === 0) value = !value; set(x, y, value); }
      }
      upward = !upward;
    }
    return matrix;
  }
  function render(svg, text) {
    const matrix = makeMatrix(text); const quiet = 4; const full = SIZE + quiet * 2;
    const path = matrix.flatMap((row, y) => row.flatMap((dark, x) => dark ? [`M${x + quiet} ${y + quiet}h1v1h-1z`] : [])).join('');
    svg.setAttribute('viewBox', `0 0 ${full} ${full}`); svg.setAttribute('shape-rendering', 'crispEdges');
    svg.innerHTML = `<rect width="${full}" height="${full}" fill="#fff"/><path d="${path}" fill="#111"/>`;
  }
  window.KyraaUpiQr = { render };
})();