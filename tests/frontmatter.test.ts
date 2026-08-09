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
});
