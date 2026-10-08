# Changelog

All notable changes to this maintained fork are documented here.

## [0.7.3] - 2026-10-08

### Fixed

- Fixed enabled/disabled check marks being clipped off in narrow Violentmonkey popup menus.
- Moved boolean status indicators to the beginning of each userscript menu caption so they remain visible even when the label is truncated.
- Shortened long menu category names to reduce horizontal clipping in Violentmonkey.

### Changed

- Boolean items now use `✓` for enabled and `○` for disabled at the start of the caption.
- Enum items now use a leading `↻` indicator.
- Action items now use a leading `▶` indicator.
- Shortened menu groups: `Release Features` → `Release`, `Additional Features` → `Additional`, and `Advanced Settings` → `Advanced`.

### Validation

- Browser behavior confirmed improved by the maintainer in Violentmonkey.
- Exact source SHA-256 verified before commit.
- JavaScript syntax validation passed with `node --check`.

## [0.7.2] - 2026-10-08

### Fixed

- Fixed GitHub repository pages getting stuck with gray loading placeholders while the userscript was enabled.
- Removed the Tracking Prevention behavior that made GitHub's global `window.fetch` non-writable. Current GitHub relies on `fetch` for React and lazy-loaded repository content, so locking it could break sidebar and repository metadata rendering.
- Restricted the release-asset enhancement hook so it only processes actual `/releases/expanded_assets/` fragments instead of broadly touching unrelated lazy-loaded GitHub fragments.

### Reliability

- Preserves GitHub's native request pipeline while keeping the rest of the userscript functionality intact.
- Verified with `node --check` and exact SHA-256 validation before committing the source.

## [0.7.1] - 2026-10-08

### Fixed

- Restored startup after the original GitHub-hosted `GM_config` dependency became unavailable.
- Restored startup after the original Catppuccin association, icon, and palette resources became unavailable.
- Added null guards around GitHub navigation/menu elements that may not exist during soft navigation or UI rollouts.
- Hardened release asset processing against missing or changed DOM nodes.
- Hardened GitHub API response handling and failure paths.
- Improved initial refresh behavior for enabled user/repository/icon features.
- Prevented optional tracking-protection logic from terminating the script when `window.fetch` cannot be redefined.

### Changed

- Replaced external `GM_config` with the self-contained `GHPConfig` implementation.
- Preserved the original dotted settings/storage keys for compatibility with existing preferences.
- Replaced external Catppuccin resources with a compact built-in fallback pack.
- Removed upstream `@downloadURL` and `@updateURL` metadata from the maintained build.
- Updated userscript metadata to v0.7.1 and added KyleAustin85 as contributor/maintainer.

### Security / reliability

- The maintained build no longer downloads executable userscript dependencies from the suspended upstream GitHub account at runtime/install time.

## [0.7.0] - Upstream

Original release by PRO-2684. This is the compatibility baseline for the maintained fork.
