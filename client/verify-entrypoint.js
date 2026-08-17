import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const mainEntry = path.join(root, 'src', 'main.jsx');

if (!fs.existsSync(indexPath)) {
  throw new Error(`Index file not found: ${indexPath}`);
}

if (!fs.existsSync(mainEntry)) {
  throw new Error(`Frontend entry file not found: ${mainEntry}`);
}

const html = fs.readFileSync(indexPath, 'utf8');
const hasMainScript = /<script\s+type="module"\s+src="(?:\/|\.\/)?src\/main\.jsx"\s*><\/script>/.test(html);

if (!hasMainScript) {
  throw new Error('Frontend entrypoint is missing: index.html does not include /src/main.jsx');
}

console.log('Frontend entrypoint OK: index.html includes /src/main.jsx');
