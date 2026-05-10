import Module from 'node:module';

// React Native global flag — assets and gameplay modules check this.
(globalThis as any).__DEV__ = false;

const handler = (mod: NodeJS.Module) => {
  mod.exports = {};
};

const exts = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.mp3',
  '.wav',
  '.aac',
  '.ttf',
  '.otf',
];
for (const ext of exts) {
  // @ts-expect-error — deprecated CJS API, but still functional and the cleanest
  // way to stub asset requires inside a Node script that pulls in app modules.
  Module._extensions[ext] = handler;
}
