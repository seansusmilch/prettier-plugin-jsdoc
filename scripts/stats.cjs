// Print simple size stats for built UMD files
const fs = require('fs');
const path = require('path');

try {
  const dir = 'dist';
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.startsWith('index.umd'))
    : [];
  for (const f of files) {
    const { size } = fs.statSync(path.join(dir, f));
    const human = (size / 1024).toFixed(1) + 'K';
    console.log(human, f);
  }
} catch (error) {
  console.error('Failed to read stats:', error);
  process.exitCode = 1;
}


