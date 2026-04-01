const MIN_NEXTAUTH_SECRET_LENGTH = 32;

export const EMAIL_VERIFICATION_TOKEN_TTL_HOURS = 24;
export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 60;

type SplitSmtpTransportConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
};

export type AuthEmailTransportConfig = string | SplitSmtpTransportConfig;

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

function parseBooleanEnv(name: string, value: string) {
  if (value === "true") return true;
  if (value === "false") return false;

  throw new Error(`${name} must be "true" or "false". Received "${value}".`);
}

function parsePortEnv(name: string, value: string) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a valid TCP port between 1 and 65535. Received "${value}".`);
  }

  return port;
}

function extractEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function getRequiredEmailServerUrl() {
  const value = readRequiredEnv(
    "EMAIL_SERVER",
    "Provide a full SMTP connection string or remove it and use the split EMAIL_SERVER_* variables."
  );

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("EMAIL_SERVER must be a valid SMTP URL such as smtp://user:pass@smtp.resend.com:465.");
  }

  if (!["smtp:", "smtps:"].includes(parsed.protocol)) {
    throw new Error('EMAIL_SERVER must start with "smtp://" or "smtps://".');
  }

  if (!parsed.hostname) {
    throw new Error("EMAIL_SERVER must include an SMTP host.");
  }

  return value;
}

function getSplitSmtpTransportConfig(): SplitSmtpTransportConfig {
  const host = readRequiredEnv(
    "EMAIL_SERVER_HOST",
    'For Resend SMTP, this is typically "smtp.resend.com".'
  );
  const port = parsePortEnv(
    "EMAIL_SERVER_PORT",
    readRequiredEnv("EMAIL_SERVER_PORT", "For Resend SMTP, use 465 with secure connections enabled.")
  );
  const secure = parseBooleanEnv(
    "EMAIL_SERVER_SECURE",
    readRequiredEnv("EMAIL_SERVER_SECURE", 'Use "true" for SMTPS on port 465 or "false" for STARTTLS on port 587.')
  );
  const user = readRequiredEnv(
    "EMAIL_SERVER_USER",
    'For Resend SMTP, this is usually the literal username "resend".'
  );
  const password = readRequiredEnv(
    "EMAIL_SERVER_PASSWORD",
    "Use the SMTP password or API key issued by your provider."
  );

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass: password
    }
  };
}

export function isDevAuthBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";
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

export function getRequiredAppUrl() {
  const appUrl = readRequiredEnv(
    "NEXTAUTH_URL",
    "Set this to the canonical app origin so verification and reset emails link back to HoosFinds correctly."
  );

  let parsed: URL;
  try {
    parsed = new URL(appUrl);
  } catch {
    throw new Error("NEXTAUTH_URL must be a valid absolute URL such as https://hoosfinds.com.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("NEXTAUTH_URL must use http or https.");
  }

  return parsed.toString().replace(/\/$/, "");
}

export function getRequiredEmailFrom() {
  const value = readRequiredEnv(
    "EMAIL_FROM",
    'Use a verified sender identity such as "HoosFinds <auth@mail.hoosfinds.com>".'
  );
  const address = extractEmailAddress(value);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    throw new Error("EMAIL_FROM must contain a valid sender email address.");
  }

  return value;
}

export function getAuthEmailTransportConfig(): AuthEmailTransportConfig {
  if (readOptionalEnv("EMAIL_SERVER")) {
    return getRequiredEmailServerUrl();
  }

  return getSplitSmtpTransportConfig();
}

export function getAuthEmailProviderLabel() {
  const rawServerUrl = readOptionalEnv("EMAIL_SERVER");
  const host = rawServerUrl ? new URL(rawServerUrl).hostname : readOptionalEnv("EMAIL_SERVER_HOST");

  if (host === "smtp.resend.com") {
    return "Resend SMTP";
  }

  return host ? `SMTP (${host})` : "SMTP";
}

export function isAuthEmailConfigured() {
  try {
    getRequiredAppUrl();
    getRequiredEmailFrom();
    getAuthEmailTransportConfig();
    return true;
  } catch {
    return false;
  }
}

export function getAuthEmailConfigurationIssues() {
  const issues: string[] = [];

  try {
    getRequiredAppUrl();
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "NEXTAUTH_URL is invalid.");
  }

  try {
    getRequiredNextAuthSecret();
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "NEXTAUTH_SECRET is invalid.");
  }

  try {
    getRequiredEmailFrom();
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "EMAIL_FROM is invalid.");
  }

  try {
    getAuthEmailTransportConfig();
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "SMTP configuration is invalid.");
  }

  return issues;
}

export function getAuthEmailConfigurationError() {
  const issues = getAuthEmailConfigurationIssues();

  if (issues.length === 0) {
    return "Auth email delivery is not configured correctly.";
  }

  return `Auth email delivery is not configured correctly: ${issues.join(" ")}`;
}
