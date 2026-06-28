import fs from 'fs';
import path from 'path';

const dir = 'src/lib';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

const STRICT_JSON_PROMPT = ` IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (\`\`\`json) or any conversational text.`;

for (const f of files) {
  const filepath = path.join(dir, f);
  let content = fs.readFileSync(filepath, 'utf8');
  let changed = false;

  if (content.includes('gateway("deepseek-ai/deepseek-v4-pro")')) {
    content = content.replace(/gateway\("deepseek-ai\/deepseek-v4-pro"\)/g, 'gateway("meta/llama-3.1-70b-instruct")');
    changed = true;
  }

  // Find system prompts inside generateText that have output: Output.object(...)
  // Usually looks like:
  // system:
  //   "You are a ... Be precise.",
  // We want to insert the STRICT_JSON_PROMPT before the closing quote.
  const regex = /(system:\s*["`].*?)(["`],)/gs;
  content = content.replace(regex, (match, p1, p2) => {
    if (!p1.includes('IMPORTANT: You MUST respond ONLY with valid JSON')) {
      changed = true;
      return p1 + STRICT_JSON_PROMPT + p2;
    }
    return match;
  });
  
  if (changed) {
    fs.writeFileSync(filepath, content);
    console.log(`Updated ${f}`);
  }
}
