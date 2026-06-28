import { generateText, tool } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "../src/lib/ai-gateway.server.ts";

async function main() {
  const provider = createAiGatewayProvider(process.env.OPENAI_API_KEY);
  
  const TestSchema = z.object({
    summary: z.string(),
    metrics: z.array(z.object({ name: z.string(), value: z.number() }))
  });

  try {
    const result = await generateText({
      model: provider.chatModel("meta/llama-3.1-70b-instruct"),
      tools: {
        output: tool({
          description: "Output the final result",
          parameters: TestSchema,
          execute: async () => "ok"
        })
      },
      toolChoice: "required",
      prompt: "Give me a summary and 2 metrics for a fake car.",
    });
    console.log("SUCCESS!");
    console.log(result.toolCalls);
  } catch (e) {
    console.error("FAILED!", e);
  }
}

main();
