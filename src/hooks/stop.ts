import { readHookInput, emit } from "./io.js";
import { scanArtifacts } from "../core/artifacts.js";
import { validateProject } from "../core/validation.js";
import { loadActiveFlow, pathExists } from "../core/state.js";
import { prepareSafeManagedPath, projectPaths } from "../core/paths.js";
import { writeJsonAtomic } from "../core/utils.js";
import { withProjectLock } from "../core/project-lock.js";

const input = await readHookInput();
const root = process.cwd();
if (input.stop_hook_active !== true && await pathExists(projectPaths(root).activeFlow)) {
  await withProjectLock(root, async () => {
    const flow = await loadActiveFlow(root);
    if (!flow) return;
    let errors: string[];
    try {
      const report = await validateProject(root, await scanArtifacts(root));
      errors = report.findings.filter((item) => item.severity === "error").map((item) => `${item.code}: ${item.message}`);
    } catch (error) {
      // A repository the scanner cannot read at all is still a structural
      // failure the author has to see. Reporting it as one beats crashing the
      // hook with a stack trace, which tells the author nothing actionable and
      // looks like the plugin itself broke.
      errors = [`SCAN_FAILED: ${error instanceof Error ? error.message : String(error)}`];
    }
    if (errors.length > 0 && !flow.stop_blocked_once) {
      flow.stop_blocked_once = true;
      await prepareSafeManagedPath(root, projectPaths(root).activeFlow);
      await writeJsonAtomic(projectPaths(root).activeFlow, flow);
      emit({ decision: "block", reason: `Active ${flow.type} flow has structural errors. Fix only these hard failures; do not start a prose review loop:\n${errors.slice(0, 12).map((item) => `- ${item}`).join("\n")}` });
    }
  });
}
