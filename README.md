# GitHub Plus — Maintained Fork

A maintained compatibility fork of **GitHub Plus**, originally created by **PRO-2684**.

The original userscript stopped working after its external GitHub-hosted dependencies became unavailable. This fork keeps the original feature set while removing those dead runtime dependencies and adding compatibility hardening for GitHub's current UI.

## Current release

**v0.7.3 — Violentmonkey Menu Visibility Hotfix**

### Why this fork exists

The upstream v0.7.0 userscript depended on files hosted under the original author's GitHub account, including the configuration library and Catppuccin icon resources. When those resources became unavailable, Tampermonkey could no longer initialize the script reliably.

v0.7.1 removed those runtime dependencies and replaced them with self-contained equivalents. v0.7.2 fixed a current-GitHub loading regression. v0.7.3 improves settings-menu readability in narrow Violentmonkey popups.

## Features

- Code-view appearance controls
- Dashboard/sidebar appearance options
- Sticky avatars and issue/comment headers
- Catppuccin-style file/folder icons
- Custom GitHub menu icon
- Release asset uploader information
- Release download counts
- Release download histogram
- Optional source archive hiding
- Extended GitHub user information
- Extended repository information
- Archived repository star support
- Optional tracking-prevention behavior
- GitHub API rate-limit display
- Optional GitHub personal access token support

## v0.7.3 hotfix highlights

- Fixed enabled/disabled status marks being clipped in Violentmonkey's narrow popup menu.
- Moved boolean state indicators to the beginning of menu captions.
- Uses `✓` for enabled and `○` for disabled.
- Added leading `↻` for enum/cycling settings and `▶` for actions.
- Shortened long menu groups to `Release`, `Additional`, and `Advanced` so more of each option remains visible.
- Verified the exact source with SHA-256 and `node --check` before commit.

## v0.7.2 hotfix highlights

- Fixed repository pages getting stuck with gray lazy-loading placeholders while GitHub Plus was enabled.
- Removed the behavior that made GitHub's global `window.fetch` non-writable.
- Preserved GitHub's native React/lazy-loading request pipeline.
- Restricted release-asset processing to actual `/releases/expanded_assets/` fragments.

## v0.7.1 repair highlights

- Removed dead `@require` and `@resource` URLs tied to the unavailable upstream GitHub account.
- Replaced the external `GM_config` dependency with a self-contained settings implementation.
- Preserved the original dotted storage keys to retain existing user preferences where possible.
- Added a self-contained Catppuccin fallback palette/icon pack.
- Hardened menu, repository, release, user-profile, and navigation DOM hooks.
- Improved API/error handling so a single unavailable element or request does not terminate the whole script.
- Removed upstream automatic update metadata so this maintained build is not overwritten by the broken upstream build.

## Installation

1. Install a userscript manager such as Violentmonkey or Tampermonkey.
2. Open `GitHub-Plus.user.js` from this repository or the latest private Release.
3. Install/update the script when your userscript manager prompts you.
4. Disable or remove older GitHub Plus copies to avoid two versions modifying GitHub simultaneously.

## Configuration

Open your userscript manager's menu while visiting GitHub. GitHub Plus exposes its settings through userscript menu commands.

The repaired settings implementation deliberately keeps the same storage key names used by the original build, including keys such as `appearance.*`, `release.*`, `additional.*`, and `advanced.*`.

## Personal access token

A GitHub personal access token is optional. It is used only to increase GitHub API rate limits for features that query GitHub's API.

Do not publish or commit your token.

## Upstream

Original Greasy Fork listing:

https://greasyfork.org/en/scripts/510742-github-plus

Original author: **PRO-2684**

## Maintenance

Compatibility repairs and maintenance: **KyleAustin85**

This fork is intended to preserve upstream behavior first. New features should be separated from compatibility fixes so regressions are easier to identify.

## License

GPL-3.0, matching the upstream userscript.

See [`LICENSE`](LICENSE) and [`NOTICE.md`](NOTICE.md).
