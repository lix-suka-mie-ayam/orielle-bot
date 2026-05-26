import { state } from "./state.js";

export async function validateModules(
  modules = []
) {
  const valid = [];

  for (const mod of modules) {
    if (
      mod &&
      mod.command &&
      typeof mod.execute ===
        "function"
    ) {
      valid.push(mod);
    }
  }

  return {
    valid
  };
}

export function checkRateLimit(
  id
) {
  if (!state.rateLimit) {
    state.rateLimit = new Map();
  }

  if (
    state.rateLimit.has(id)
  ) {
    return true;
  }

  state.rateLimit.set(
    id,
    Date.now()
  );

  setTimeout(() => {
    state.rateLimit.delete(id);
  }, 1000);

  return true;
}

export function startHealthCheck() {
  return true;
}
