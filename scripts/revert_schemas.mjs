import fs from 'fs';
import path from 'path';

const dir = 'src/lib';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

for (const f of files) {
  const filepath = path.join(dir, f);
  let content = fs.readFileSync(filepath, 'utf8');
  let changed = false;

  if (content.includes('import { zodToJsonSchema } from "zod-to-json-schema";\n')) {
    content = content.replace('import { zodToJsonSchema } from "zod-to-json-schema";\n', '');
    changed = true;
  }

  // Use a regex to match the appended schema string precisely
  // It looks like: \n\nREQUIRED JSON SCHEMA:\n" + JSON.stringify(zodToJsonSchema(CardSchema))
  // Or: \n\nREQUIRED JSON SCHEMA:\n${JSON.stringify(zodToJsonSchema(CardSchema))}`
  const regex1 = /\\n\\nREQUIRED JSON SCHEMA:\\n"\s*\+\s*JSON\.stringify\(zodToJsonSchema\([A-Za-z0-9_]+\)\)/g;
  if (regex1.test(content)) {
    content = content.replace(regex1, '"');
    changed = true;
  }

  const regex2 = /\\n\\nREQUIRED JSON SCHEMA:\\n\$\{JSON\.stringify\(zodToJsonSchema\([A-Za-z0-9_]+\)\)\}`/g;
  if (regex2.test(content)) {
    content = content.replace(regex2, '`');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filepath, content);
    console.log(`Reverted ${f}`);
  }
}
