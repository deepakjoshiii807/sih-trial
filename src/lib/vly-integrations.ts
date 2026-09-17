// VLY Integrations Configuration
// See /integrations.md for usage documentation

import { createVlyIntegrations } from '@vly-ai/integrations';

/**
 * Safely read an environment variable in both Node (Convex actions,
 * build tooling) and the browser. Direct `process.env` access at module
 * scope crashes the Vite client bundle, where `process` is undefined.
 */
function readEnv(key: string): string | undefined {
  try {
    if (typeof process !== "undefined" && process.env?.[key]) {
      return process.env[key];
    }
  } catch {
    // Not running in a Node environment — fall through.
  }
  try {
    const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
    if (metaEnv) {
      return metaEnv[key] ?? metaEnv[`VITE_${key}`];
    }
  } catch {
    // `import.meta.env` unavailable — return undefined.
  }
  return undefined;
}

export const vly = createVlyIntegrations({
  deploymentToken: readEnv("VLY_INTEGRATION_KEY") || undefined,
  debug: readEnv("NODE_ENV") === "development",
});
