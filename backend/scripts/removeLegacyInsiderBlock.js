const fs = require('node:fs/promises');
const path = require('node:path');

const pagePath = path.resolve(__dirname, '..', '..', 'frontend', 'kyraastyle.com', 'index.html');
const outerStart = '<div class="pt-6 lg:pt-12 pb-3 lg:pb-5 space-y-4 lg:space-y-8 wrapperContainer">';
const marker = '1751536922709men-desk.jpg';

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
  const markerAt = html.indexOf(marker);
  const nextDataStart = html.indexOf('<script id="__NEXT_DATA__"');
  if (markerAt >= 0 && (nextDataStart < 0 || markerAt < nextDataStart)) {
    const start = html.lastIndexOf(outerStart, markerAt);
    const end = start < 0 ? -1 : endOfDivBlock(html, start);
    const block = start >= 0 && end >= 0 ? html.slice(start, end) : '';
    if (!block.includes('Get Insider Access') || !block.includes(marker)) {
      throw new Error('Stopped: the exact legacy insider block could not be identified safely.');
    }
    html = `${html.slice(0, start)}${html.slice(end)}`;
  }

  const jsonStart = nextDataStart < 0 ? -1 : html.indexOf('>', nextDataStart) + 1;
  const jsonEnd = jsonStart < 0 ? -1 : html.indexOf('</script>', jsonStart);
  if (jsonStart < 0 || jsonEnd < 0) throw new Error('Stopped: __NEXT_DATA__ could not be located safely.');
  const data = JSON.parse(html.slice(jsonStart, jsonEnd));
  const sections = data?.props?.pageProps?.sections;
  if (!Array.isArray(sections)) throw new Error('Stopped: the page-data sections could not be located safely.');
  const filtered = sections.filter((section) => String(section?.sectionHeadingText || '').trim().toLowerCase() !== 'get insider access');
  if (filtered.length !== sections.length) {
    data.props.pageProps.sections = filtered;
    html = `${html.slice(0, jsonStart)}${JSON.stringify(data)}${html.slice(jsonEnd)}`;
  }
  await fs.writeFile(pagePath, html);
  console.log('Removed the legacy Get Insider Access markup and page-data entry from index.html.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
