// First, fetch the page HTML and extract the client entry script URL
const pageRes = await fetch('http://localhost:5173/experiments');
const html = await pageRes.text();

// Find the tanstack-start stream data that contains the router manifest
const streamMatch = html.match(/\$_TSR\.router=\(.*?\)\(\$R\["tsr"\]\)/s);
if (streamMatch) {
  console.log("Router manifest found in HTML ✓");
}

// Now let's try to call a server function the way the client would
// The client makes a POST to /_server with the function ID

// First, let's get the client-side JS to find what function IDs it uses
const entryUrl = 'http://localhost:5173/@id/virtual:tanstack-start-dev-client-entry';
console.log("\nFetching client entry...");
const entryRes = await fetch(entryUrl);
if (entryRes.ok) {
  console.log("Client entry loads ✓");
} else {
  console.log("Client entry FAILED:", entryRes.status);
}

// Let's find the server function module for experiments
const sfnUrl = 'http://localhost:5173/src/lib/experiments.functions.ts';
console.log("\nFetching experiments.functions.ts client module...");
const sfnRes = await fetch(sfnUrl);
if (sfnRes.ok) {
  const sfnCode = await sfnRes.text();
  // Look for the server function ID in the compiled client code
  const idMatches = sfnCode.match(/[A-Za-z0-9_-]{50,}/g);
  if (idMatches) {
    console.log("\nFound potential server function IDs in client code:");
    for (const id of idMatches.slice(0, 5)) {
      try {
        const decoded = Buffer.from(id, 'base64url').toString('utf8');
        const parsed = JSON.parse(decoded);
        console.log(`  ID: ${id.slice(0, 40)}...`);
        console.log(`  Decoded: ${JSON.stringify(parsed)}`);
      } catch {
        // not a valid base64url JSON, skip
      }
    }
  } else {
    console.log("No long IDs found in client code");
  }
  
  // Show first 2000 chars of compiled client code
  console.log("\n--- Compiled client code (first 2000 chars) ---");
  console.log(sfnCode.slice(0, 2000));
  console.log("--- END ---");
} else {
  console.log("experiments.functions.ts FAILED:", sfnRes.status, await sfnRes.text());
}
