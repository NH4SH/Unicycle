import { SITE_URL } from "@/lib/constants";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function normalizeHttpOrigin(value: string) {
  const parsed = new URL(value);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("App origin must use http or https.");
  }

  return parsed.origin.replace(/\/$/, "");
}

function getRequestOrigin(request?: Request) {
  if (!request) {
    return null;
  }

  try {
    return normalizeHttpOrigin(request.url);
  } catch {
    return null;
  }
}

function isLocalOrigin(origin: string) {
  try {
    const { hostname } = new URL(origin);
    return LOCAL_HOSTS.has(hostname) || hostname.endsWith(".localhost");
  } catch {
    return false;
  }
}

// Checkout and hosted redirects should always prefer HoosFinds' canonical app
// origin in production. In local development, we intentionally keep localhost
// working even if NEXTAUTH_URL points at production.
export function getAppOrigin(request?: Request) {
  const requestOrigin = getRequestOrigin(request);

  if (process.env.NODE_ENV !== "production" && requestOrigin && isLocalOrigin(requestOrigin)) {
    return requestOrigin;
  }

  const envOrigin = process.env.NEXTAUTH_URL?.trim();
  if (envOrigin) {
    try {
      return normalizeHttpOrigin(envOrigin);
    } catch {
      // Fall through to the canonical site URL if NEXTAUTH_URL is malformed.
    }
  }

  if (process.env.NODE_ENV === "production") {
    return SITE_URL;
  }

  return requestOrigin ?? SITE_URL;
}
