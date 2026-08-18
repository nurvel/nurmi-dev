import { describe, expect, it } from "vitest";
import { getBuildIdentity } from "../releaseIdentity";

describe("build release identity", () => {
  it("uses an injected stable tag as the production identity", () => {
    expect(getBuildIdentity("v1.2.3")).toEqual({
      kind: "production",
      version: "v1.2.3",
      label: "Version v1.2.3",
    });
  });

  it("marks missing identity as a preview build", () => {
    expect(getBuildIdentity(undefined)).toEqual({
      kind: "preview",
      version: "preview-local",
      label: "Preview build preview-local",
    });
  });

  it("does not treat an invalid or non-stable value as production", () => {
    expect(getBuildIdentity("main").kind).toBe("preview");
    expect(getBuildIdentity("preview-abc1234").label).toBe(
      "Preview build preview-abc1234",
    );
  });
});
