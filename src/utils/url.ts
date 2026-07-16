export function isAllowedUrl(url: string): boolean {
  try {
    const {protocol} = new URL(url);
    return (
      protocol === 'http:' || protocol === 'https:' || protocol === 'file:'
    );
  } catch {
    return false;
  }
}

export function getDomain(url: string): string {
  try {
    const host = new URL(url).hostname;
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return url;
  }
}

export function normalizeUrl(url: string): string {
  let u = url;
  if (!/^[a-z]+:/i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    parsed.hash = '';
    let out = parsed.toString();
    if (out.endsWith('/') && out.length > parsed.origin.length + 1) {
      out = out.slice(0, -1);
    }
    return out;
  } catch {
    return url;
  }
}
