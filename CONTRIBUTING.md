# Contributing

Thanks for helping maintain GitHub Plus.

## Priorities

1. Preserve existing upstream behavior.
2. Fix compatibility regressions caused by GitHub UI changes.
3. Avoid unnecessary remote runtime dependencies.
4. Keep optional features isolated so one failure cannot terminate the entire userscript.
5. Document behavior changes in `CHANGELOG.md`.

## Before submitting a change

- Run `node --check GitHub-Plus.user.js`.
- Test normal GitHub navigation and soft navigation.
- Test with optional features disabled and enabled.
- Do not commit personal access tokens or private account information.
- Keep original PRO-2684 attribution and GPL-3.0 licensing intact.
