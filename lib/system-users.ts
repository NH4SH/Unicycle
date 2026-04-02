import type { UserRole } from "@prisma/client";

import { normalizeEmail } from "@/lib/domain";

export const FOUNDER_ADMIN_EMAILS = [
  "whz8te@virginia.edu",
  "upw9er@virginia.edu",
  "xec5pw@virginia.edu"
] as const;

const founderAdminEmailSet = new Set(FOUNDER_ADMIN_EMAILS.map((email) => normalizeEmail(email)));

export function isFounderAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return founderAdminEmailSet.has(normalizeEmail(email));
}

export function getSystemAssignedRoleForEmail(email?: string | null): UserRole | null {
  return isFounderAdminEmail(email) ? "ADMIN" : null;
}

