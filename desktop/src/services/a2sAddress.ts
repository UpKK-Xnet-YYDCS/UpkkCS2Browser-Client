export function isIPv4(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  for (const part of parts) {
    const num = Number(part);
    if (isNaN(num) || num < 0 || num > 255 || part !== String(num)) return false;
  }
  return true;
}

export function isDomainName(host: string): boolean {
  if (!host || host.length > 253) return false;
  // A dotted numeric host is an IPv4 literal, not a domain. Reject malformed
  // IPv4 values instead of accidentally accepting them through domain syntax.
  if (host.includes('.') && /^[\d.]+$/.test(host)) return false;
  // Basic domain name validation: alphanumeric, hyphens, dots
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(host);
}

export function parseServerAddress(address: string): { ip: string; port: string } | null {
  const trimmed = address.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(':');
  if (parts.length !== 2) return null;
  const host = parts[0].trim();
  const port = parts[1].trim();
  if (!host || !port) return null;
  // Validate port is a number in valid range
  const portNum = Number(port);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) return null;
  // Accept both IPv4 and domain names
  if (!isIPv4(host) && !isDomainName(host)) return null;
  return { ip: host, port };
}
