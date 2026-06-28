import { generateText, Output } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "../src/lib/ai-gateway.server.ts";
import { zodToJsonSchema } from "zod-to-json-schema";

const CardSchema = z.object({
  summary: z.string().describe("One-paragraph overview of the model."),
  intended_use: z.object({
    primary_uses: z.array(z.string()).min(1).max(8),
    primary_users: z.array(z.string()).min(1).max(6),
    out_of_scope: z.array(z.string()).min(1).max(8),
  }),
  factors: z.object({
    relevant: z.array(z.string()).max(8),
    evaluation: z.array(z.string()).max(8),
  }),
  metrics: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
        notes: z.string().optional(),
      }),
    )
    .min(1)
    .max(12),
  training_data: z.object({
    description: z.string(),
    sources: z.array(z.string()).max(8),
    preprocessing: z.array(z.string()).max(8),
  }),
  evaluation_data: z.object({
    description: z.string(),
    motivation: z.string(),
  }),
  ethical_considerations: z.array(z.string()).min(1).max(10),
  caveats_and_recommendations: z.array(z.string()).min(1).max(10),
  bias_risks: z
    .array(
      z.object({
        risk: z.string(),
        mitigation: z.string(),
        severity: z.enum(["low", "medium", "high"]),
      }),
    )
    .max(8),
  environmental_impact: z
    .object({
      hardware: z.string().optional(),
      hours_used: z.string().optional(),
      carbon_emitted: z.string().optional(),
    })
    .optional(),
  citation: z.string().optional(),
});

async function main() {
  const provider = createAiGatewayProvider(process.env.OPENAI_API_KEY);
  
  try {
    const result = await generateText({
      model: provider.chatModel("meta/llama-3.1-70b-instruct"),
      output: Output.object({ schema: CardSchema }),
      system:
        "You are a senior ML responsible-AI engineer drafting a Google/HuggingFace-compatible Model Card. Be specific, factual, and honest about limitations. When information is missing, infer reasonable defaults from the task and architecture, but mark them as assumptions in caveats. IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (```json) or any conversational text.\n\nREQUIRED JSON SCHEMA:\n" + JSON.stringify(zodToJsonSchema(CardSchema)),
      prompt:
        `Model: TriageNet v1.2.0\n` +
        `Task: Binary classification - urgent vs routine\n` +
        `Architecture: DistilBERT\n` +
        `Training dataset: Internal tickets\n` +
        `License: Apache-2.0\n\n` +
        `Engineer-provided context:\nFine-tuned for 3 epochs on a balanced sample...`,
    });
    console.log("SUCCESS!");
    console.log(result.output);
  } catch (e) {
    console.error("FAILED!", e);
    
    // Attempt to parse without Output.object to see what the raw text is!
    try {
      console.log("Retrying without Output.object to see raw text...");
      const rawResult = await generateText({
        model: provider.chatModel("meta/llama-3.1-70b-instruct"),
        system:
          "You are a senior ML responsible-AI engineer drafting a Google/HuggingFace-compatible Model Card. Be specific, factual, and honest about limitations. When information is missing, infer reasonable defaults from the task and architecture, but mark them as assumptions in caveats. IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema. Do not include markdown blocks (```json) or any conversational text.\n\nREQUIRED JSON SCHEMA:\n" + JSON.stringify(zodToJsonSchema(CardSchema)),
        prompt:
          `Model: TriageNet v1.2.0\n` +
          `Task: Binary classification - urgent vs routine\n` +
          `Architecture: DistilBERT\n` +
          `Training dataset: Internal tickets\n` +
          `License: Apache-2.0\n\n` +
          `Engineer-provided context:\nFine-tuned for 3 epochs on a balanced sample...`,
      });
      console.log("RAW TEXT RESPONSE:");
      console.log(rawResult.text);
    } catch (e2) {
      console.error("RAW TEXT ALSO FAILED!", e2);
    }
  }
}

main();
