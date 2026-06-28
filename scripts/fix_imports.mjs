import fs from 'fs';
import path from 'path';

const dir = 'src/routes/_authenticated';
const files = fs.readdirSync(dir);

files.forEach(f => {
  if (!f.endsWith('.tsx')) return;
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf-8');
  
  if (content.includes('<Link') && !content.includes('Link,')) {
    // Check if Link is imported
    const importMatch = content.match(/import\s+{([^}]+)}\s+from\s+["']@tanstack\/react-router["']/);
    if (importMatch && !importMatch[1].includes('Link')) {
      const newImport = importMatch[0].replace('{', '{ Link, ');
      content = content.replace(importMatch[0], newImport);
      fs.writeFileSync(p, content);
      console.log(`Added Link to ${f}`);
    } else if (!importMatch) {
      content = `import { Link } from "@tanstack/react-router";\n` + content;
      fs.writeFileSync(p, content);
      console.log(`Added Link import to ${f}`);
    }
  }
});
