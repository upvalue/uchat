#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run
// Merges _generated.ts + _cli.ts into a single self-contained uchat.ts

async function run(cmd: string[]): Promise<string> {
  const p = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "piped",
    stderr: "piped",
  });
  const { stdout } = await p.output();
  return new TextDecoder().decode(stdout).trim();
}

const commit = await run(["git", "rev-parse", "--short", "HEAD"]);
const dirty = (await run(["git", "status", "--porcelain"])) !== "";
const timestamp = new Date().toISOString();
const buildStamp = `// Built from ${commit}${dirty ? " (dirty)" : ""} at ${timestamp}`;

const header = await Deno.readTextFile(new URL("header.ts", import.meta.url));
const generated = await Deno.readTextFile(new URL("_generated.ts", import.meta.url));
const cli = await Deno.readTextFile(new URL("_cli.ts", import.meta.url));

// Insert build stamp right after the shebang line
const [shebang, ...rest] = header.split("\n");
const stampedHeader = [shebang, buildStamp, ...rest].join("\n");

const out = `${stampedHeader}

${generated}
${cli}
`;

const outPath = new URL("uchat.ts", import.meta.url);
await Deno.writeTextFile(outPath, out);
await Deno.chmod(outPath, 0o755);
console.log(`wrote ${outPath.pathname}`);
