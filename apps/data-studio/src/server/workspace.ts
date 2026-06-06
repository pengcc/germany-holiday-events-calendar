import { createServerOnlyFn } from "@tanstack/react-start";

export const findWorkspaceRoot = createServerOnlyFn(async () => {
  const { readFile } = await import("node:fs/promises");
  const { dirname, resolve } = await import("node:path");
  let current = resolve(process.env.HSG_WORKSPACE_ROOT ?? process.cwd());

  while (true) {
    try {
      const packageJson = JSON.parse(await readFile(resolve(current, "package.json"), "utf8")) as {
        name?: string;
      };
      if (packageJson.name === "holiday-sync-germany") {
        return current;
      }
    } catch {
      // Continue walking upward until the workspace package is found.
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error(
        "Holiday Sync Germany workspace root was not found. Set HSG_WORKSPACE_ROOT explicitly.",
      );
    }
    current = parent;
  }
});
