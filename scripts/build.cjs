// Cross-platform build script consolidating compile and bundle steps
const { spawnSync } = require('child_process');
const fs = require('fs');

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const compileOnly = process.argv.includes('--compile-only');

run('eslint', ['--ext', '.ts', './src']);

run('tsc', ['--project', 'tsconfig.json']);

if (compileOnly) {
  process.exit(0);
}

run('rollup', ['dist/index.js', '--file', 'dist/index.umd.js', '--format', 'umd', '--name', 'sayHello']);

run('terser', ['--ecma', '6', '--compress', '--mangle', '-o', 'dist/index.umd.min.js', '--', 'dist/index.umd.js']);

run('node', ['scripts/gzip.cjs', 'dist/index.umd.min.js']);

run('node', ['scripts/stats.cjs']);


