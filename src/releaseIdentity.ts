export const RELEASES_URL =
  "https://github.com/nurvel/nurmi-dev/releases";

const STABLE_TAG_PATTERN = /^v\d+\.\d+\.\d+$/;

export type BuildIdentity = {
  kind: "production" | "preview";
  version: string;
  label: string;
};

export function getBuildIdentity(injectedVersion?: string): BuildIdentity {
  const version = injectedVersion?.trim();

  if (version && STABLE_TAG_PATTERN.test(version)) {
    return {
      kind: "production",
      version,
      label: `Version ${version}`,
    };
  }

  const previewVersion = version || "preview-local";
  return {
    kind: "preview",
    version: previewVersion,
    label: `Preview build ${previewVersion}`,
  };
}

export const buildIdentity = getBuildIdentity(
  import.meta.env.VITE_RELEASE_VERSION,
);
