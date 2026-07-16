# Security Policy

Veil stores encrypted bookmarks locally in the browser. The security of the cryptography
and key handling is central to the project, so vulnerabilities are taken seriously.

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ |
| < 1.0   | ❌ |

## Reporting a vulnerability

If you believe you have found a security vulnerability, **please do not open a public GitHub issue.**

Report it privately instead:

- Open a private security advisory via the repository's **Security** tab → *Report a vulnerability*, or
- Email **jonah-fan@outlook.com** with the subject `[veil security]`.

Please include:

- A description of the issue and its impact
- Steps to reproduce
- Affected Veil version and browser

We will acknowledge receipt within **72 hours** and coordinate a fix and disclosure timeline.
Please avoid public disclosure until a fix has been released. Credit will be given unless you
prefer to remain anonymous.

## Threat model and operational guidance

- **Local-only storage.** The encrypted vault lives in `browser.storage.local`. Anyone with
  access to your browser profile can read the ciphertext — but not the bookmarks without the
  master password. Protect the browser profile accordingly.
- **No network.** Veil has no network permissions and makes no outbound requests. A
  vulnerability that exfiltrated data would first have to add a network capability the manifest
  does not grant.
- **Master password is in-memory only.** It is never written to disk; only a PBKDF2-derived
  verifier is stored. Forgetting it means the vault is unrecoverable by design.
