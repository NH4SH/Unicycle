const ALLOWED_DOMAINS = ["virginia.edu", "mail.virginia.edu"];

export function isUvaEmail(email?: string | null) {
  if (!email) return false;
  const domain = email.split("@").at(1)?.toLowerCase();
  return !!domain && ALLOWED_DOMAINS.includes(domain);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeUvaEmail(email: string) {
  return normalizeEmail(email);
}
