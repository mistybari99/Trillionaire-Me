// Writes docs/design/m-list-status.md from src/modules/capability.ts and evidence.ts (run: npx vite-node tools/m_list_doc.ts).
import { writeFileSync } from "node:fs";
import { BUILD_BOXES, MODULES, buildLabel, missingBoxes } from "../src/modules/capability";
import { EVIDENCE } from "../src/modules/evidence";

const mark = { built: "B", missing: "M", na: "-" } as const;
const rows = MODULES.map((m) => {
  const e = EVIDENCE[m.id]!;
  return `| ${m.id} | ${m.name.en} | ${buildLabel(m)} | ${BUILD_BOXES.map((b) => mark[m.build[b]]).join(" ")} | ${missingBoxes(m).join(", ") || "-"} | ${m.blockedBy ?? "-"} | ${[...e.routes, ...e.fns].map((x) => `\`${x}\``).join("; ") || "-"} | ${e.tests.map((x) => `\`${x}\``).join(", ") || "-"} |`;
});
const count = (l: string) => MODULES.filter((m) => buildLabel(m) === l).length;
writeFileSync("docs/design/m-list-status.md", `# Module build status (generated, 2 Nov 2026)

Source of truth: \`src/modules/capability.ts\` (six build boxes per module, label computed). Evidence: \`src/modules/evidence.ts\`. Checks: \`tests/m_list_status.test.ts\`, \`tests/field_reach.test.ts\`, \`tests/link_check.test.ts\`. Regenerate: \`npx vite-node tools/m_list_doc.ts\`.

The card answers one question: is the software's own build complete? It does not depend on any data typed. What this phone holds (empty, demo, real) is a separate line (\`src/modules/dataStatus.ts\`).

Boxes (order): Input, Storage, Calculation, Output, Export, Links. B = built, M = missing, - = not needed.
Label: complete = no box missing; partial = some box missing; not-built = no box built; blocked = waits for an owner approval (D-number).

Counts: complete ${count("complete")}, partial ${count("partial")}, not-built ${count("not-built")}, blocked ${count("blocked")} (of ${MODULES.length}).

| Module | Name | Label | I S C O E L | Missing boxes | Waits for | Routes / functions | Tests |
|---|---|---|---|---|---|---|---|
${rows.join("\n")}
`);
