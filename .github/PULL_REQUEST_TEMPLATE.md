<!-- Thanks for contributing! If this is anything beyond a small fix, please open an issue first
     to agree the approach. Keep this PR focused on one concern. -->

## Summary
<!-- What does this change do, and why? Reference the issue if there is one (e.g. "Closes #12"). -->

## Checklist
- [ ] `npm run lint` passes (eslint + `tsc --noEmit`)
- [ ] `npm run build` passes (`wxt build`)
- [ ] Manually loaded the built extension from `.output/chrome-mv3` and verified the change
- [ ] No new manifest permissions added without justification (or `wxt.config.ts` `manifest` updated with reason)
- [ ] Crypto / key-handling changes reviewed: no plaintext secrets in logs, storage, or error messages
- [ ] README updated if a user-facing knob or behavior changed
