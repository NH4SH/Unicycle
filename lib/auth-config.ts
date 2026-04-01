const SPLIT_SMTP_VARS = [
  "EMAIL_SERVER_HOST",
  "EMAIL_SERVER_PORT",
  "EMAIL_SERVER_SECURE",
  "EMAIL_SERVER_USER",
  "EMAIL_SERVER_PASSWORD",
  "EMAIL_FROM"
] as const;

export const EMAIL_VERIFICATION_TOKEN_TTL_HOURS = 24;
export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 60;

export function isDevAuthBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";
}

export function canPreviewAuthEmailsInDev() {
  return isDevAuthBypassEnabled();
}

export function isAuthEmailConfigured() {
  if (process.env.EMAIL_SERVER?.trim()) {
    return Boolean(process.env.EMAIL_FROM?.trim());
  }

  return SPLIT_SMTP_VARS.every((key) => Boolean(process.env[key]?.trim()));
}

export function getRequiredAppUrl() {
  const appUrl = process.env.NEXTAUTH_URL?.trim();

  if (!appUrl) {
    throw new Error("NEXTAUTH_URL is required for auth email links.");
  }

  return appUrl.replace(/\/$/, "");
}

export function getRequiredEmailFrom() {
  const value = process.env.EMAIL_FROM?.trim();

  if (!value) {
    throw new Error("EMAIL_FROM is required before HoosFinds can send verification or reset emails.");
  }

  return value;
}

export function getAuthEmailConfigurationError() {
  return 'Auth email delivery is not configured. Set NEXTAUTH_URL, EMAIL_FROM, and either EMAIL_SERVER or the split EMAIL_SERVER_* SMTP vars.';
}
