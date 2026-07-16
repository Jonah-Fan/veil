import {Resvg} from '@resvg/resvg-js';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(resolve(root, 'assets/veil.svg'), 'utf-8');

const iconDir = resolve(root, 'public/icons');
mkdirSync(iconDir, {recursive: true});

const render = (size, file) => {
  const png = new Resvg(svg, {fitTo: {mode: 'width', value: size}})
    .render()
    .asPng();
  writeFileSync(file, png);
  console.log(`wrote ${file} (${size}x${size})`);
};

for (const size of [16, 32, 48, 128]) {
  render(size, resolve(iconDir, `${size}.png`));
}

render(300, resolve(root, 'assets/store-icon-300.png'));
