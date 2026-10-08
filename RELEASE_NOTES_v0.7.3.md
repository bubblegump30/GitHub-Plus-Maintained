# GitHub Plus v0.7.3 — Violentmonkey Menu Visibility Hotfix

GitHub Plus v0.7.3 improves the userscript settings menu when using Violentmonkey's narrow popup interface.

## Fixed

- Fixed enabled/disabled check marks being clipped off the right side of long menu captions.
- Moved boolean state indicators to the start of each menu item so they remain visible even when text is truncated.
- Shortened long category names to reduce horizontal clipping.

## Menu indicators

- `✓` — enabled boolean setting
- `○` — disabled boolean setting
- `↻` — enum/cycling setting
- `▶` — action

## Shortened groups

- `Release Features` → `Release`
- `Additional Features` → `Additional`
- `Advanced Settings` → `Advanced`

## Validation

- Visual behavior confirmed improved by the maintainer in Violentmonkey.
- Exact userscript SHA-256 verified before commit.
- JavaScript syntax validation passed with `node --check`.

## SHA-256

`1d4021367c7ccf378b14a0f8898d4df68d0c92155699401628e7b6413b65b70e` — `GitHub-Plus.user.js`

## Upgrade

Install `GitHub-Plus.user.js` from this release over v0.7.2, then reopen the Violentmonkey menu on GitHub.

## Attribution

Original GitHub Plus: PRO-2684  
Maintained compatibility fork: KyleAustin85  
License: GPL-3.0
