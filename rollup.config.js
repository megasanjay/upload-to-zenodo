import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import builtins from 'builtin-modules';
import esbuild from 'rollup-plugin-esbuild';

const rollupConfig = {
  input: 'src/index.js',
  plugins: [
    commonjs(),
    json(),
    nodeResolve({
      preferBuiltins: false,
    }),
    esbuild({
      minifyIdentifiers: true,
      minifySyntax: true,
      legalComments: 'none',
    }),
  ],
  external: builtins,
  output: {
    format: 'cjs',
    file: 'dist/index.js',
  },
};

export default rollupConfig;
