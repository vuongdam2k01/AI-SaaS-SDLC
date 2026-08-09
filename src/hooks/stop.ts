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
    if (flow) {
      const report = await validateProject(root, await scanArtifacts(root));
      const errors = report.findings.filter((item) => item.severity === "error").map((item) => `${item.code}: ${item.message}`);
      if (errors.length > 0 && !flow.stop_blocked_once) {
        flow.stop_blocked_once = true;
        await prepareSafeManagedPath(root, projectPaths(root).activeFlow);
        await writeJsonAtomic(projectPaths(root).activeFlow, flow);
        emit({ decision: "block", reason: `Active ${flow.type} flow has structural errors. Fix only these hard failures; do not start a prose review loop:\n${errors.slice(0, 12).map((item) => `- ${item}`).join("\n")}` });
      }
    }
  });
}
