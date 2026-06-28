import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "openai",
    baseURL: "https://integrate.api.nvidia.com/v1",
    supportsStructuredOutputs: true,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    fetch: async (url, options) => {
      let debugBody = "";
      if (options && options.body && typeof options.body === 'string') {
        try {
          const body = JSON.parse(options.body);
          // Automatically disable thinking mode so the JSON parser doesn't break
          body.chat_template_kwargs = { thinking: false };
          
          // Force tool calls or json_schema to json_object if Nvidia rejects them,
          // but first let's just log exactly what we send.
          debugBody = JSON.stringify(body, null, 2);
          
          options.body = JSON.stringify(body);
        } catch (e) {
          // Ignore
        }
      }
      
      try {
        const res = await fetch(url, options);
        if (!res.ok) {
          const errorText = await res.text();
          console.error("========================");
          console.error("NVIDIA API ERROR:");
          console.error("Status:", res.status);
          console.error("Response:", errorText);
          console.error("Request Body Sent:", debugBody);
          console.error("========================");
          // We must return a new response with the error text so the SDK can throw it properly
          return new Response(errorText, { status: res.status, statusText: res.statusText, headers: res.headers });
        }
        return res;
      } catch (err) {
        console.error("NVIDIA FETCH ERROR:", err);
        throw err;
      }
    }
  });
}
