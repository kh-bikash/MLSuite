import fs from 'fs';
import path from 'path';

const routesDir = path.join(process.cwd(), 'src', 'routes', '_authenticated');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Pattern to match: onClick={() => navigate({ to: "/something" })}
  // or onClick={(e) => navigate({ to: "/something" })}
  // or onClick={() => nav({ to: "/something" })}
  
  // Replace <Button ... onClick={() => navigate({ to: "/path" })}> content </Button>
  const regex = /<Button([^>]*)onClick=\{\s*\(\)\s*=>\s*(?:navigate|nav)\(\{[\s\n]*to:\s*"([^"]+)"[\s\n]*\}\)\s*\}([^>]*)>([\s\S]*?)<\/Button>/g;
  
  content = content.replace(regex, (match, p1, toPath, p3, inner) => {
    // Check if asChild is already there
    let props = p1 + p3;
    if (!props.includes('asChild')) {
      props = props + ' asChild';
    }
    return `<Button${props}>\n  <Link to="${toPath}">${inner}</Link>\n</Button>`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${path.basename(filePath)}`);
  }
}

fs.readdirSync(routesDir).forEach(file => {
  if (file.endsWith('.tsx')) {
    processFile(path.join(routesDir, file));
  }
});
