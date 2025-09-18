// Gzip a file to <file>.gz with level 9
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/gzip.cjs <path-to-file>');
  process.exit(1);
}

try {
  const input = fs.readFileSync(inputPath);
  const gz = zlib.gzipSync(input, { level: 9 });
  fs.writeFileSync(`${inputPath}.gz`, gz);
  const size = (gz.length / 1024).toFixed(1);
  console.log(`${size}K ${path.basename(inputPath)}.gz`);
} catch (error) {
  console.error('Failed to gzip file:', error);
  process.exitCode = 1;
}


