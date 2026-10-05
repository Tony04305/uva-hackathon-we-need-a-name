import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';

await build({
  // Workers treat every named export as an RPC entrypoint. Keep test helpers
  // in the source module, but publish only the default request handler.
  stdin: { contents: "export { default } from './server/worker.js';", resolveDir: process.cwd() },
  outfile: 'dist/_worker.js',
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true,
});
await writeFile('dist/_routes.json', JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }));
console.log('Built Cloudflare Pages API worker.');
