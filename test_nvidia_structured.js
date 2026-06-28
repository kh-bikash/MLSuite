const apiKey = "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";

async function testFormat(type) {
  console.log(`Testing response_format: ${type}`);
  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "deepseek-ai/deepseek-v4-pro",
      messages: [{ role: "user", content: "Output a JSON object with a key 'status' set to 'ok'." }],
      chat_template_kwargs: { thinking: false },
      response_format: type === "none" ? undefined : { type: type, schema: type === 'json_schema' ? {name: 'test', schema: {type: 'object'}} : undefined }
    })
  });
  
  if (!response.ok) {
    console.error(`Error for ${type}:`, response.status, await response.text());
  } else {
    const data = await response.json();
    console.log(`Success for ${type}:`, data.choices[0].message.content);
  }
}

async function run() {
  await testFormat("none");
  await testFormat("json_object");
  await testFormat("json_schema");
}
run();
