# Changelog

All notable changes to this maintained fork are documented here.

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
