import fs from 'fs';
import path from 'path';

const dir = 'src/lib';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

for (const f of files) {
  const filepath = path.join(dir, f);
  let content = fs.readFileSync(filepath, 'utf8');
  let changed = false;

  // 1. Add import if needed and if generateText is used
  if (content.includes('generateText') && content.includes('Output.object') && !content.includes('zodToJsonSchema')) {
    content = content.replace('import { generateText', 'import { zodToJsonSchema } from "zod-to-json-schema";\nimport { generateText');
    changed = true;
  }

  // 2. Find schema name and inject it into the prompt
  // Example: output: Output.object({ schema: CardSchema }),
  const schemaRegex = /output:\s*Output\.object\(\{\s*schema:\s*([A-Za-z0-9_]+)\s*\}\)/g;
  
  let match;
  // We need to find all generateText calls. It's safer to just look for the IMPORTANT JSON string we added earlier, and append the schema to it!
  // Earlier we appended: "IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (```json) or any conversational text."
  
  // Let's iterate over each match of output: Output.object({ schema: X })
  // and then look for the "IMPORTANT..." string right after it and append to it.
  
  const chunks = content.split('generateText({');
  if (chunks.length > 1) {
    for (let i = 1; i < chunks.length; i++) {
      let chunk = chunks[i];
      const schemaMatch = chunk.match(/output:\s*Output\.object\(\{\s*schema:\s*([A-Za-z0-9_]+)\s*\}\)/);
      if (schemaMatch) {
        const schemaName = schemaMatch[1];
        // Now find the "IMPORTANT: ..." string
        const targetStr = 'IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (```json) or any conversational text."';
        const targetStr2 = 'IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (```json) or any conversational text.`';
        
        if (chunk.includes(targetStr)) {
          chunk = chunk.replace(targetStr, targetStr.slice(0, -1) + '\\n\\nREQUIRED JSON SCHEMA:\\n" + JSON.stringify(zodToJsonSchema(' + schemaName + '))');
          chunks[i] = chunk;
          changed = true;
        } else if (chunk.includes(targetStr2)) {
          chunk = chunk.replace(targetStr2, targetStr2.slice(0, -1) + '\\n\\nREQUIRED JSON SCHEMA:\\n${JSON.stringify(zodToJsonSchema(' + schemaName + '))}`');
          chunks[i] = chunk;
          changed = true;
        }
      }
    }
    content = chunks.join('generateText({');
  }

  if (changed) {
    fs.writeFileSync(filepath, content);
    console.log(`Updated ${f}`);
  }
}
