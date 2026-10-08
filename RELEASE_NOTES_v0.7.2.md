# GitHub Plus v0.7.2 — GitHub Loading Compatibility Hotfix

GitHub Plus v0.7.2 fixes a compatibility regression found on current GitHub repository pages.

## Fixed

- Fixed repository pages getting stuck with gray loading placeholders while the userscript was enabled.
- Removed the Tracking Prevention behavior that made GitHub's global `window.fetch` non-writable.
- Preserved GitHub's native React and lazy-loading request pipeline so repository metadata, Releases, Packages, Contributors, Languages, commit details, and other asynchronously loaded content can render normally.
- Restricted release-asset enhancement handling to actual `/releases/expanded_assets/` fragments instead of broadly touching unrelated lazy-loaded GitHub fragments.

## Validation

- Browser behavior confirmed fixed by the maintainer after installing the hotfix.
- JavaScript syntax validation passed with `node --check`.
- Exact source SHA-256 verified before commit.

## SHA-256

`bf0a3c80fa714f3f2cc1f55f2ac0a53da95955f16543e5df24f5d6c5a83d6222` — `GitHub-Plus.user.js`

## Upgrade

Install `GitHub-Plus.user.js` from this release over v0.7.1, then refresh GitHub.

## Attribution

Original GitHub Plus: PRO-2684  
Maintained compatibility fork: KyleAustin85  
License: GPL-3.0
