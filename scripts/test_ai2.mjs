import { generateObject } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "../src/lib/ai-gateway.server.ts";

async function main() {
  const provider = createAiGatewayProvider(process.env.OPENAI_API_KEY);
  
  const TestSchema = z.object({
    summary: z.string(),
    metrics: z.array(z.object({ name: z.string(), value: z.number() }))
  });

  try {
    const result = await generateObject({
      model: provider.chatModel("meta/llama-3.1-70b-instruct"),
      schema: TestSchema,
      prompt: "Give me a summary and 2 metrics for a fake car. IMPORTANT: You MUST respond ONLY with valid JSON matching the requested schema.",
      mode: 'json' // explicit json mode
    });
    console.log("SUCCESS!");
    console.log(result.object);
  } catch (e) {
    console.error("FAILED!", e);
  }
}

main();
