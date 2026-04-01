const MIN_NEXTAUTH_SECRET_LENGTH = 32;

function readOptionalEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function readRequiredEnv(name: string, helpText: string) {
  const value = readOptionalEnv(name);
  if (!value) {
    throw new Error(`${name} is required. ${helpText}`);
  }

  return value;
}

export function isDevAuthBypassEnabled() {
  return process.env.NODE_ENV !== "production" && readOptionalEnv("DEV_AUTH_BYPASS") === "true";
}

export function canPreviewAuthEmailsInDev() {
  return isDevAuthBypassEnabled();
}

export function getRequiredNextAuthSecret() {
  const value = readRequiredEnv(
    "NEXTAUTH_SECRET",
    "Generate a long random secret before running HoosFinds auth in any environment."
  );

  if (value.length < MIN_NEXTAUTH_SECRET_LENGTH) {
    throw new Error(
      `NEXTAUTH_SECRET must be at least ${MIN_NEXTAUTH_SECRET_LENGTH} characters long so session encryption stays strong.`
    );
  }

  return value;
}

export function assertAuthRuntimeConfiguration() {
  getRequiredNextAuthSecret();
}
