import fs from 'node:fs';

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function isContainerRuntime() {
  return Boolean(process.env.KUBERNETES_SERVICE_HOST || fs.existsSync('/.dockerenv'));
}

export function getServiceEnvValue(primaryName: string, internalName: string) {
  if (isContainerRuntime()) {
    const internalValue = readEnv(internalName);
    if (internalValue) {
      return internalValue;
    }
  }

  return readEnv(primaryName);
}
