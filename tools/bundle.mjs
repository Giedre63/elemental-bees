// Build the publishable copy: index.html with style.css inlined (an artifact's
// page is wrapped in its own skeleton, so the <head> links go away), plus src/
// and assets/ beside it.
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const out = process.argv[2];
if (!out) { console.error('usage: node tools/bundle.mjs <outdir>'); process.exit(1); }

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const css = readFileSync(join(root, 'style.css'), 'utf8');
let html = readFileSync(join(root, 'index.html'), 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>')).trim();
const title = (html.match(/<title>(.*?)<\/title>/) || [, 'Elemental Bees'])[1];

writeFileSync(join(out, 'index.html'),
  `<title>${title}</title>\n` +
  `<meta name="claude:viewport-fit-sides" content="cover">\n` +
  `<style>\nhtml,body{height:100%;overflow:hidden}\n${css}</style>\n${body}\n`);

cpSync(join(root, 'src'), join(out, 'src'), { recursive: true });
cpSync(join(root, 'assets'), join(out, 'assets'), { recursive: true });
rmSync(join(out, 'assets', 'retired'), { recursive: true, force: true });
console.log('bundled ->', out);
