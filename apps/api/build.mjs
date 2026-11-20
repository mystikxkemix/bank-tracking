// Bundles the API and the shared package into a single CommonJS file for the Docker image (see the root Dockerfile).
import { build } from 'esbuild';

await build({
  entryPoints: ['src/server.ts'],
  outfile: 'dist/server.cjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: true,
  logLevel: 'info',
  // Optional mongodb driver integrations we do not use.
  external: [
    'kerberos', '@mongodb-js/zstd', '@aws-sdk/credential-providers', 'gcp-metadata', 'snappy', 'socks',
    'aws4', 'mongodb-client-encryption',
  ],
});
