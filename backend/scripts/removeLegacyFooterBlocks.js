const fs = require('node:fs/promises');
const path = require('node:path');

const pagePath = path.resolve(__dirname, '..', '..', 'frontend', 'kyraastyle.com', 'index.html');
const blocks = [
  { marker: '<h1>Designer Menswear at Kryaa Style</h1>', outerStart: '<div class="space-y-3 lg:space-y-0 lg:px-10 py-3 lg:py-6 wrapperContainer' },
  { marker: '<span class="py-1 mr-2 font-semibold uppercase">Popular searches</span>', outerStart: '<div class="py-6 lg:px-10 wrapperContainer">' },
];

function endOfDivBlock(html, start) {
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = start;
  let depth = 0;
  for (let match = tags.exec(html); match; match = tags.exec(html)) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return tags.lastIndex;
  }
  return -1;
}

async function main() {
  let html = await fs.readFile(pagePath, 'utf8');
  let removed = 0;
  for (const { marker, outerStart } of blocks) {
    const markerAt = html.indexOf(marker);
    if (markerAt < 0) continue;
    const start = html.lastIndexOf(outerStart, markerAt);
    const end = start < 0 ? -1 : endOfDivBlock(html, start);
    const block = start < 0 || end < 0 ? '' : html.slice(start, end);
    if (!block.includes(marker)) throw new Error(`Stopped: could not safely identify the block containing ${marker}.`);
    html = `${html.slice(0, start)}${html.slice(end)}`;
    removed += 1;
  }
  await fs.writeFile(pagePath, html);
  console.log(`Removed ${removed} legacy block(s) above the footer.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
