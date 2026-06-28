import fs from 'fs';
import path from 'path';

const dir = 'src/routes/_authenticated';
const files = fs.readdirSync(dir);

const hasChildren = new Set();
files.forEach(f => {
  if (f.includes('.') && f !== 'route.tsx' && f.endsWith('.tsx')) {
    const parts = f.split('.');
    if (parts.length > 2) {
      // e.g. prompts.new.tsx -> part[0] is 'prompts'
      hasChildren.add(parts[0]);
    }
  }
});

for (const parent of hasChildren) {
  const oldPath = path.join(dir, `${parent}.tsx`);
  const newPath = path.join(dir, `${parent}.index.tsx`);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`Renamed ${parent}.tsx to ${parent}.index.tsx`);
  }
}
