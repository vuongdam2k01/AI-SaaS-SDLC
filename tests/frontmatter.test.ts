import { describe, expect, it } from "vitest";
import { artifactMetadataIssues, parseFrontmatter, toArtifactMeta } from "../src/core/frontmatter.js";

describe("frontmatter", () => {
  it("normalizes artifact metadata", () => {
    const parsed = parseFrontmatter("---\nid: FTR-A-001\nartifact_type: feature\ntitle: A\nstatus: active\ncreated_by_change: CHG-001\ndepends_on: [PRODUCT-REQUIREMENTS]\ndecisions: []\nsupersedes:\nwrites_to: [ENT-A-001]\n---\n# A\n", "feature.md");
    expect(toArtifactMeta(parsed.data)).toMatchObject({
      id: "FTR-A-001",
      depends_on: ["PRODUCT-REQUIREMENTS"],
      writes_to: ["ENT-A-001"],
      supersedes: null
    });
  });

  it("rejects missing delimiters", () => {
    expect(() => parseFrontmatter("# No metadata", "bad.md")).toThrow("Missing YAML frontmatter");
  });

  it("reports unknown metadata instead of silently accepting it", () => {
    expect(artifactMetadataIssues({ id: "FTR-A-001", unexpected_reverse_list: [] })).toContain("unknown frontmatter field: unexpected_reverse_list");
  });

  it("accepts the optional host_os token and rejects malformed ones", () => {
    const hostIssues = (data: Record<string, unknown>) => artifactMetadataIssues(data).filter((issue) => issue.includes("host_os"));
    expect(hostIssues({ id: "PLT-WIN-001", host_os: "win32" })).toEqual([]);
    expect(hostIssues({ id: "PLT-WIN-001" })).toEqual([]);
    for (const bad of [5, "Win32", "win 32", "-win", null]) {
      expect(hostIssues({ id: "PLT-WIN-001", host_os: bad })).toEqual(["host_os must be a lowercase host token such as win32, darwin or linux"]);
    }
    expect(toArtifactMeta({ id: "PLT-WIN-001", host_os: "darwin" }).host_os).toBe("darwin");
    expect("host_os" in toArtifactMeta({ id: "PLT-WIN-001" })).toBe(false);
  });
});
