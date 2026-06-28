import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, Output } from "ai";
import { z } from "zod";

const apiKey = "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";

const provider = createOpenAICompatible({
  name: "openai",
  baseURL: "https://integrate.api.nvidia.com/v1",
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
  fetch: async (url, options) => {
    if (options?.body && typeof options.body === 'string') {
      try {
        const body = JSON.parse(options.body);
        // Add Nvidia Deepseek parameters
        body.chat_template_kwargs = { thinking: false };
        body.max_tokens = 4096; // 16384 might be too large for max_tokens param in some SDKs
        options.body = JSON.stringify(body);
      } catch (e) {
        console.error("Error parsing body", e);
      }
    }
    return fetch(url, options);
  }
});

async function run() {
  try {
    const result = await generateText({
      model: provider("deepseek-ai/deepseek-v4-pro"),
      prompt: "Give me a summary of a hypothetical dataset with 3 columns.",
      output: Output.object({
        schema: z.object({
          datasetName: z.string(),
          columns: z.array(z.string()),
        })
      }),
    });
    console.log("Success!");
    console.log(result.output);
  } catch (error) {
    console.error("Failed:", error);
  }
}

run();
