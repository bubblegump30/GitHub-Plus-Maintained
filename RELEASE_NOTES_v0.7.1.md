# GitHub Plus v0.7.1 — Dependency Repair & Compatibility Fixes

GitHub Plus v0.7.1 restores the userscript after upstream GitHub-hosted dependencies became unavailable.

## Main fixes

- Removed broken external `GM_config` dependency.
- Removed broken external Catppuccin JSON resources.
- Added a self-contained settings implementation that keeps the original preference keys.
- Added built-in fallback Catppuccin palette/icon data.
- Hardened GitHub navigation and DOM integration against missing or changed elements.
- Improved release API and release-asset error handling.
- Removed the old automatic update URLs so this maintained copy is not replaced by the broken upstream build.

## Upgrade instructions

1. Disable or remove GitHub Plus v0.7.0.
2. Install `GitHub-Plus.user.js` from this release.
3. Open GitHub and confirm the GitHub Plus menu appears in your userscript manager.
4. Review your settings. Existing stored preferences should carry over where their original keys are present.

## Known limitation

The original full Catppuccin resource database is no longer available from the upstream account. v0.7.1 therefore ships with a compact self-contained fallback pack rather than relying on that external database.

## Attribution

Original GitHub Plus: PRO-2684  
Maintained compatibility fork: KyleAustin85  
License: GPL-3.0
