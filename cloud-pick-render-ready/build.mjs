/** Build a standalone, offline-capable HTML from the editable source modules. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
const read = name => readFile(path.join(root, 'src', name), 'utf8');
const parts = await Promise.all(['prefix.js','ui.js','match-ui.js','extension-ui.js','art.js','timer.js','boot.js'].map(read));
const app = parts.join('\n');
const [template, baseStyle, matchStyle, contrastStyle, extensionStyle, rules] = await Promise.all(['template.html','styles.css','match-styles.css','contrast.css','extension.css','game.js'].map(read));
const style = [baseStyle, matchStyle, contrastStyle, extensionStyle].join('\n');
for (const marker of ['/*STYLE*/','/*RULES*/','/*APP*/']) {
  if (!template.includes(marker)) throw new Error(`Template marker missing: ${marker}`);
}
const html = template.replace('/*STYLE*/', () => style).replace('/*RULES*/', () => rules).replace('/*APP*/', () => app);
await mkdir(path.join(root, 'public'), { recursive: true });
await writeFile(path.join(root, 'src/app.js'), app);
await writeFile(path.join(root, 'public/index.html'), html);
console.log(`Built public/index.html (${Buffer.byteLength(html).toLocaleString()} bytes).`);
