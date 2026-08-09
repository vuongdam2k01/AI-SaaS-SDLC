import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

function argumentsMap(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) result[values[index]?.replace(/^--/, "")] = values[index + 1];
  return result;
}

async function filesBelow(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

function globRegex(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replaceAll("**/", "(?:.*/)?").replaceAll("**", ".*").replaceAll("*", "[^/]*");
  return new RegExp(`^${escaped}$`);
}

function eventTool(event) {
  return String(event?.tool ?? event?.name ?? event?.tool_name ?? "").toLowerCase();
}

const options = argumentsMap(process.argv.slice(2));
if (!options.case || !options.output || !options.trace) {
  throw new Error("Usage: node evals/harness.mjs --case <name> --output <repository> --trace <trace.json>");
}
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
const definition = manifest.cases[options.case];
if (!definition) throw new Error(`Unknown eval case: ${options.case}`);
if (!(await stat(options.output)).isDirectory()) throw new Error("Eval output must be a captured repository directory.");
const traceValue = JSON.parse(await readFile(options.trace, "utf8"));
const events = Array.isArray(traceValue) ? traceValue : traceValue.events;
if (!Array.isArray(events)) throw new Error("Tool trace must be an array or an object with an events array.");

const files = await filesBelow(options.output);
const textFiles = files.filter((file) => /\.(?:md|json|ya?ml|mmd|dbml|txt)$/i.test(file));
const outputText = (await Promise.all(textFiles.map((file) => readFile(path.join(options.output, file), "utf8")))).join("\n");
const traceText = JSON.stringify(events);
const failures = [];

for (const required of definition.required_tools) {
  if (!events.some((event) => eventTool(event).includes(required))) failures.push(`missing required tool family: ${required}`);
}
for (const required of definition.required_files) {
  const matcher = globRegex(required);
  if (!files.some((file) => matcher.test(file))) failures.push(`missing required file: ${required}`);
}
for (const source of definition.required_output_patterns) {
  if (!new RegExp(source, "im").test(outputText)) failures.push(`missing repository output pattern: ${source}`);
}
for (const source of definition.forbidden_trace_patterns) {
  if (new RegExp(source, "im").test(traceText)) failures.push(`prohibited trace pattern: ${source}`);
}

const result = { case: options.case, passed: failures.length === 0, files_inspected: textFiles.length, tool_events: events.length, failures };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
