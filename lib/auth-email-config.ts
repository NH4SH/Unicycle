export type AuthEmailTransportConfig =
  | string
  | {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };

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
    throw new Error("EMAIL_SERVER must be a valid SMTP URL such as smtps://user:pass@smtp.provider.example:465.");
  }

  if (!["smtp:", "smtps:"].includes(parsed.protocol)) {
    throw new Error('EMAIL_SERVER must start with "smtp://" or "smtps://".');
  }

  if (!parsed.hostname) {
    throw new Error("EMAIL_SERVER must include an SMTP host.");
  }

  return value;
}

function getSplitSmtpTransportConfig() {
  return {
    host: readRequiredEnv("EMAIL_SERVER_HOST", "Set the SMTP host from your email provider."),
    port: parsePortEnv(
      "EMAIL_SERVER_PORT",
      readRequiredEnv("EMAIL_SERVER_PORT", "Set the SMTP port from your email provider.")
    ),
    secure: parseBooleanEnv(
      "EMAIL_SERVER_SECURE",
      readRequiredEnv("EMAIL_SERVER_SECURE", 'Use "true" for SMTPS on port 465 or "false" for STARTTLS on port 587.')
    ),
    auth: {
      user: readRequiredEnv("EMAIL_SERVER_USER", "Set the SMTP username from your email provider."),
      pass: readRequiredEnv("EMAIL_SERVER_PASSWORD", "Use the SMTP password or API key issued by your provider.")
    }
  } satisfies Exclude<AuthEmailTransportConfig, string>;
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
    throw new Error("NEXTAUTH_URL must be a valid absolute URL such as https://your-app.example.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("NEXTAUTH_URL must use http or https.");
  }

  return parsed.toString().replace(/\/$/, "");
}

export function getRequiredEmailFrom() {
  // Sender verification is domain-specific with most providers. A verified root
  // domain sender like auth@hoosfinds.com will work, but a subdomain sender such
  // as auth@mail.hoosfinds.com usually requires separate verification.
  const value = readRequiredEnv(
    "EMAIL_FROM",
    'Use a verified sender identity such as "HoosFinds <auth@hoosfinds.com>". If you send from a subdomain like "mail.hoosfinds.com", verify that subdomain separately in your email provider.'
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
