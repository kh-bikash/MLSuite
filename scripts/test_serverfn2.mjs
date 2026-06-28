// Fetch the SERVER-SIDE compiled version of experiments.functions.ts
// This is accessed via the ?tss-serverfn-split query param
const serverUrl = 'http://localhost:5173/src/lib/experiments.functions.ts?tss-serverfn-split';
console.log("Fetching server-side split module...");
const res = await fetch(serverUrl);
if (res.ok) {
  const code = await res.text();
  console.log("\n--- Server-side split module (first 3000 chars) ---");
  console.log(code.slice(0, 3000));
  console.log("--- END ---");
} else {
  console.log("FAILED:", res.status, await res.text().catch(() => ''));
}

// Also check the server-fn-module-lookup version
const lookupUrl = 'http://localhost:5173/src/lib/experiments.functions.ts?server-fn-module-lookup';
console.log("\n\nFetching server-fn-module-lookup version...");
const res2 = await fetch(lookupUrl);
if (res2.ok) {
  const code2 = await res2.text();
  console.log("\n--- server-fn-module-lookup (first 3000 chars) ---");
  console.log(code2.slice(0, 3000));
  console.log("--- END ---");
} else {
  console.log("FAILED:", res2.status, await res2.text().catch(() => ''));
}

// Try to simulate what the validate plugin does: 
// Encode the same ID the client uses, then check
const clientId = Buffer.from(JSON.stringify({
  file: "/src/lib/experiments.functions.ts?tss-serverfn-split",
  export: "listExperiments_createServerFn_handler"
})).toString('base64url');

console.log("\n\nSimulating server function RPC call...");
console.log("Client ID:", clientId);

// The server function resolver tries to validate this ID by loading:
// virtual:tanstack-start-validate-server-fn-id?id=<clientId>
// Then it imports devServerFn.file (/src/lib/experiments.functions.ts?tss-serverfn-split)
// and accesses devServerFn.export (listExperiments_createServerFn_handler)

// Let's try to fetch the split module and check if the export exists
const splitRes = await fetch(`http://localhost:5173/src/lib/experiments.functions.ts?tss-serverfn-split`);
if (splitRes.ok) {
  const splitCode = await splitRes.text();
  const hasExport = splitCode.includes('listExperiments_createServerFn_handler');
  console.log(`\nSplit module has 'listExperiments_createServerFn_handler': ${hasExport}`);
  
  // Find all exports
  const exports = splitCode.match(/export\s+(const|function|async function)\s+(\w+)/g);
  if (exports) {
    console.log("\nExports found:");
    exports.forEach(e => console.log("  " + e));
  }
} else {
  console.log("Split module FAILED:", splitRes.status);
}
