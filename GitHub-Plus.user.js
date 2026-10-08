// ==UserScript==
// @name         GitHub Plus
// @name:zh-CN   GitHub 增强
// @namespace    http://tampermonkey.net/
// @version      0.7.2
// @description  Enhance GitHub with additional features. Repaired build with self-contained dependencies and current GitHub compatibility fixes.
// @description:zh-CN 为 GitHub 增加额外的功能。修复版，已移除失效的外部依赖。
// @author       PRO-2684
// @contributor  KyleAustin85
// @match        https://github.com/*
// @match        https://*.github.com/*
// @run-at       document-start
// @icon         https://github.com/favicon.ico
// @license      GPL-3.0
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    "use strict";

    /**
     * @typedef {Object} StyleDefinition
     * @property {string} id Relative style ID, without the userscript prefix.
     * @property {string} [setting] Configuration property that controls the style.
     * @property {(value: unknown) => string} render Converts a setting value to CSS.
     * @property {(value: unknown) => boolean} [disabled] Determines whether the style is disabled.
     */

    /**
     * @typedef {Object} StyleSheetOptions
     * @property {Document} document Document whose head owns the styles.
     * @property {Promise<void>} ready Resolves when document.head is available.
     * @property {{get: (prop: string) => unknown}} settings Configuration reader.
     * @property {string} idPrefix Prefix applied to every owned style ID.
     * @property {Record<string, Record<string, string>>} catppuccinPalette Catppuccin colors by flavor.
     */

    /**
     * @typedef {Object} StyleSheetModule
     * @property {() => Promise<void>} mount Mounts every owned style once.
     * @property {(prop: string, value: unknown) => Promise<boolean>} applySetting Updates an owned setting style.
     */

    /**
     * @typedef {Object} SettingChange
     * @property {string} prop Configuration property name.
     * @property {unknown} [before] Previous value.
     * @property {unknown} [after] New value.
     */

    /**
     * @typedef {Object} LifecycleSettings
     * @property {(prop: string) => unknown} get Reads a configuration value.
     * @property {(listener: (change: SettingChange) => void) => void} onGet Subscribes to reads.
     * @property {(listener: (change: SettingChange) => void) => void} onSet Subscribes to changes.
     */

    /**
     * @typedef {Object} LifecycleActions
     * @property {StyleSheetModule} styleSheets
     * @property {() => void} refreshIcons
     * @property {(onConnected: (setIcon: (icon: unknown) => void) => void) => void} connectCustomMenu
     * @property {() => void} refreshReleases
     * @property {() => void} refreshUserInfo
     * @property {() => void} refreshRepoInfo
     * @property {(root?: Document | Element) => boolean} patchArchivedRepoStars
     * @property {() => void} clearTrackingMetadata
     * @property {() => void} protectFetch
     * @property {() => void} showRateLimit
     * @property {(name: string, event: Event) => void} logEvent
     */

    /**
     * @typedef {Object} FeatureLifecycleOptions
     * @property {Promise<void>} ready Resolves when document-level initialization may run.
     * @property {LifecycleSettings} settings Configuration adapter.
     * @property {{on: (name: string, listener: (event: Event) => void, options: AddEventListenerOptions) => void}} events Document-event adapter.
     * @property {(callback: () => void) => void} scheduleFrame Frame scheduler.
     * @property {{isMainSite: boolean, readyState: DocumentReadyState}} environment Stable startup environment.
     * @property {LifecycleActions} actions Feature implementations invoked by lifecycle policy.
     */

    /**
     * @typedef {Object} FeatureLifecycleModule
     * @property {() => Promise<void>} start Installs lifecycle behavior once.
     */

    /**
     * @param {StyleSheetOptions} options
     * @returns {StyleSheetModule}
     */
    function createStyleSheetModule({
        document,
        ready,
        settings,
        idPrefix,
        catppuccinPalette,
    }) {
        const conditionalStyles = {
            "code.cursorBlink":
                "[data-testid='navigation-cursor'] { animation: blink 1s step-end infinite; }",
            "code.cursorAnimation":
                "[data-testid='navigation-cursor'] { transition: top 0.1s ease-in-out, left 0.1s ease-in-out; }",
            "code.fullWidth":
                "#copilot-button-positioner { padding-right: 0; }",
            "code.hideReadonlyTip":
                "[class^='CodeBlob-module__cursorContainer__'] .position-absolute.color-bg-subtle { display: none; }",
            "appearance.stickyAvatar": `
                .pull-discussion-timeline .TimelineItem-avatar {
                    position: relative;
                    margin-left: -40px;
                    left: -32px;
                    & > a[data-hovercard-type='user'], & > a[href^="/apps/"], & > img.avatar {
                        position: sticky;
                        top: 5em;
                    }
                }
                #issue-timeline [class*='Avatar-module__avatarOuter__'] {
                    position: sticky;
                    top: 3em;
                }
                [data-testid='issue-viewer-issue-container'] [class*='Avatar-module__avatarOuter__'] {
                    position: sticky;
                    top: 4em;
                }
            `,
            "appearance.stickyMore": `
                .react-issue-body [class^='IssueBodyHeader-module__IssueBodyHeaderContainer__'],
                .react-issue-comment [data-testid="comment-header"]
                { position: sticky; top: 4em; z-index: 1; backdrop-filter: brightness(0.1); }
                .timeline-comment-group .timeline-comment-header
                { position: sticky; top: 5em; z-index: 1; backdrop-filter: brightness(0.1); }`,
            "appearance.hideHeaderUnderline":
                ".markdown-heading > .heading-element { border-bottom: none; }",
            "appearance.visibleDetails": `
                .markdown-body details {
                    padding: 0 1em;
                    border: 1px solid var(--borderColor-default,var(--color-border-default));
                    border-radius: 0.5em;

                    > summary {
                        padding: 0.5em 1em;
                        margin: 0 -1em;
                    }

                    &:open > summary {
                        margin: 0 -1em 1em -1em;
                        border-bottom: 1px dashed var(--borderColor-default,var(--color-border-default));
                    }
                }
            `,
            "appearance.customMenuIcon": `
                [data-testid="top-nav-left"] button[data-component="IconButton"] span.ghp-custom-menu-icon {
                    width: var(--base-size-16);
                    height: var(--base-size-16);
                    font-size: var(--text-title-size-medium);
                    justify-content: center;
                    align-items: center;
                    display: inline-flex;
                }
            `,
        };
        const enumStyles = {
            "appearance.dashboard": [
                "",
                "/* Hide Copilot */ #dashboard > .news > .copilotPreview__container { display: none; }",
                "/* Hide Feed */ #dashboard > .news > feed-container { display: none; }",
                `/* Mobile-Like */
                .application-main > div > aside[aria-label="Account context"] {
                    display: block !important;
                }
                #dashboard > .news {
                    > .copilotPreview__container { display: none; }
                    > feed-container { display: none; }
                    > .d-block.d-md-none { display: block !important; }
                }`,
            ],
            "appearance.leftSidebar": [
                "",
                "/* Hidden */ .application-main .feed-background > aside.feed-left-sidebar { display: none; }",
            ],
            "appearance.rightSidebar": [
                "",
                "/* Hide 'Latest changes' */ aside.feed-right-sidebar > .dashboard-changelog { display: none; }",
                "/* Hide 'Explore repositories' */ aside.feed-right-sidebar > [aria-label='Explore repositories'] { display: none; }",
                "/* Hide Completely */ aside.feed-right-sidebar { display: none; }",
            ],
        };
        const fixedStyles = {
            "catppuccin-icons-hide":
                ".ghp-catppuccin-icon + svg.octicon { display: none; }",
            "extended-repo-info":
                ".ghp-extended-repo-info { color: var(--fgColor-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
            release: `
                @media (min-width: 1012px) {
                    .ghp-release-asset .col-lg-6 { width: 40%; }
                }
                .nowrap {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .ghp-release-asset {
                    background: linear-gradient(to right, var(--bgColor-accent-muted) var(--percent, 0%), transparent 0);
                }
            `,
        };
        const flavors = ["default", "latte", "frappe", "macchiato", "mocha"];
        /** @type {StyleDefinition[]} */
        const definitions = [
            ...Object.entries(conditionalStyles).map(([setting, css]) => ({
                id: setting,
                setting,
                render: () => css,
                disabled: (value) => !value,
            })),
            ...Object.entries(enumStyles).map(([setting, choices]) => ({
                id: setting,
                setting,
                render(value) {
                    const index = /** @type {number} */ (value);
                    if (!(index in choices))
                        throw new RangeError(`Invalid value for ${setting}`);
                    return choices[index];
                },
            })),
            ...Object.entries(fixedStyles).map(([id, css]) => ({
                id,
                render: () => css,
            })),
            {
                id: "tabSize",
                setting: "code.tabSize",
                render: (size) => `pre, code { tab-size: ${size}; }`,
            },
            {
                id: "catppuccin-icons-css-variables",
                setting: "appearance.catppuccinIcons",
                render(value) {
                    const flavor = flavors[/** @type {number} */ (value)];
                    if (!flavor)
                        throw new RangeError(
                            "Invalid value for appearance.catppuccinIcons",
                        );
                    if (flavor === "default") return "";
                    const colors = catppuccinPalette[flavor];
                    if (!colors)
                        throw new RangeError(`Missing palette for ${flavor}`);
                    const variables = Object.entries(colors)
                        .map(([name, hex]) => `  --ctp-${name}: ${hex};`)
                        .join("\n");
                    return `:root {\n${variables}\n}`;
                },
            },
        ];
        /** @type {Map<string, StyleDefinition>} */
        const bySetting = new Map();
        for (const definition of definitions) {
            if (definition.setting)
                bySetting.set(definition.setting, definition);
        }
        /** @type {Map<string, unknown>} */
        const pendingValues = new Map();
        /** @type {Promise<void> | undefined} */
        let mountPromise;

        /**
         * @param {StyleDefinition} definition
         * @returns {HTMLStyleElement}
         */
        function getStyle(definition) {
            const id = idPrefix + definition.id;
            const head = document.head;
            if (!head) throw new Error("Document head is unavailable");
            let style = /** @type {HTMLStyleElement | null} */ (
                document.getElementById(id)
            );
            if (style && style.tagName !== "STYLE")
                throw new TypeError(`#${id} is not a style element`);
            if (!style) {
                style = document.createElement("style");
                style.id = id;
                head.appendChild(style);
            }
            return style;
        }

        /**
         * @param {StyleDefinition} definition
         * @param {unknown} value
         */
        function update(definition, value) {
            const style = getStyle(definition);
            style.textContent = definition.render(value);
            style.disabled = definition.disabled?.(value) ?? false;
        }

        /**
         * @param {string} setting
         * @returns {unknown}
         */
        function valueFor(setting) {
            return pendingValues.has(setting)
                ? pendingValues.get(setting)
                : settings.get(setting);
        }

        /** @returns {Promise<void>} */
        function mount() {
            mountPromise ??= Promise.resolve(ready).then(() => {
                for (const definition of definitions) {
                    update(
                        definition,
                        definition.setting
                            ? valueFor(definition.setting)
                            : undefined,
                    );
                }
            });
            return mountPromise;
        }

        /**
         * @param {string} prop
         * @param {unknown} value
         * @returns {Promise<boolean>}
         */
        async function applySetting(prop, value) {
            const definition = bySetting.get(prop);
            if (!definition) return false;
            pendingValues.set(prop, value);
            await mount();
            update(definition, value);
            return true;
        }

        return { mount, applySetting };
    }

    /**
     * @param {FeatureLifecycleOptions} options
     * @returns {FeatureLifecycleModule}
     */
    function createFeatureLifecycleModule({
        ready,
        settings,
        events,
        scheduleFrame,
        environment,
        actions,
    }) {
        const debugEvents = [
            "turbo:before-cache",
            "turbo:before-render",
            "turbo:before-morph-element",
            "turbo:before-frame-render",
            "turbo:load",
            "turbo:reload",
            "turbo:render",
            "turbo:morph",
            "turbo:morph-element",
            "turbo:frame-load",
            "turbo:frame-render",
            "turbo:visit",
            "turbo:before-fetch-request",
            "turbo:before-fetch-response",
            "soft-nav:initial",
            "soft-nav:start",
            "soft-nav:render",
            "soft-nav:end",
            "soft-nav:react-done",
            "soft-nav:replace-mechanism",
            "soft-nav:frame-update",
            "soft-nav:progress-bar:end",
            "soft-nav:external:success",
            "filterable:change",
            "menu:activated",
            "beforetoggle",
            "load",
            "textInput",
            "toggle",
        ];
        const passive = { passive: true };
        /** @type {Promise<void> | undefined} */
        let startPromise;

        /**
         * @param {string} name
         * @param {(event: Event) => void} listener
         */
        function on(name, listener) {
            events.on(name, listener, passive);
        }

        /** @returns {Promise<void>} */
        function start() {
            if (startPromise) return startPromise;

            const tasks = [actions.styleSheets.mount()];

            if (settings.get("additional.archivedRepoStars")) {
                if (environment.readyState === "loading") {
                    events.on(
                        "readystatechange",
                        (event) => {
                            if (event.target.readyState === "interactive")
                                actions.patchArchivedRepoStars();
                        },
                        { once: true, passive: true },
                    );
                } else {
                    actions.patchArchivedRepoStars();
                }
                on("turbo:before-render", (event) =>
                    actions.patchArchivedRepoStars(event.detail.newBody),
                );
            }

            on("soft-nav:react-done", () => actions.refreshIcons());
            on("turbo:load", () => actions.refreshIcons());
            tasks.push(Promise.resolve(ready).then(() => actions.refreshIcons()));

            tasks.push(
                Promise.resolve(ready).then(() => {
                    actions.connectCustomMenu((setIcon) => {
                        setIcon(settings.get("appearance.customMenuIcon"));
                        settings.onSet(({ prop, after }) => {
                            if (prop === "appearance.customMenuIcon")
                                setIcon(after);
                        });
                    });
                }),
            );

            if (environment.isMainSite) {
                tasks.push(
                    Promise.resolve(ready).then(() =>
                        actions.refreshReleases(),
                    ),
                );
                on("turbo:load", () => actions.refreshReleases());
            }

            if (settings.get("additional.extendedUserInfo")) {
                tasks.push(
                    Promise.resolve(ready).then(() => actions.refreshUserInfo()),
                );
                on("soft-nav:end", () => actions.refreshUserInfo());
                on("turbo:load", () => actions.refreshUserInfo());
            }

            if (settings.get("additional.extendedRepoInfo")) {
                tasks.push(
                    Promise.resolve(ready).then(() =>
                        scheduleFrame(() => actions.refreshRepoInfo()),
                    ),
                );
                on("soft-nav:react-done", () => actions.refreshRepoInfo());
                on("turbo:load", () =>
                    scheduleFrame(() => actions.refreshRepoInfo()),
                );
            }

            if (settings.get("additional.trackingPrevention")) {
                actions.clearTrackingMetadata();
                on("turbo:before-render", () =>
                    actions.clearTrackingMetadata(),
                );
                actions.protectFetch();
            }

            if (settings.get("advanced.debug")) {
                for (const name of debugEvents) {
                    on(name, (event) => actions.logEvent(name, event));
                }
            }

            settings.onGet(({ prop }) => {
                if (prop === "advanced.rateLimit") actions.showRateLimit();
            });
            tasks.push(
                Promise.resolve(ready).then(() => {
                    settings.onSet(({ prop, after }) => {
                        void actions.styleSheets.applySetting(prop, after);
                    });
                }),
            );

            startPromise = Promise.all(tasks).then(() => undefined);
            return startPromise;
        }

        return { start };
    }

    /**
     * Enable GitHub's native star action for an archived repository.
     * @param {Document | Element} root Root containing the React app payload.
     * @returns {boolean} Whether the payload was patched.
     */
    function patchArchivedRepoStarData(root) {
        const script = root.querySelector(
            'react-app[app-name="code-view"] script[data-target="react-app.embeddedData"]',
        );
        if (!script) return false;

        let data;
        try {
            data = JSON.parse(script.textContent);
        } catch {
            return false;
        }
        const { repo, star, viewer } = data.payload?.sidebarAbout ?? {};
        if (
            !repo?.isArchived ||
            star?.canStar !== false ||
            !viewer?.isLoggedIn ||
            viewer?.emuContributionBlocked
        )
            return false;

        star.canStar = true;
        script.textContent = JSON.stringify(data);
        return true;
    }

    const testHook = globalThis.__GHP_TEST_HOOK__;
    if (typeof testHook === "function") {
        testHook({
            createStyleSheetModule,
            createFeatureLifecycleModule,
            patchArchivedRepoStarData,
        });
        return;
    }

    const { name, version } = GM_info.script;
    const idPrefix = "ghp-"; // Prefix for the IDs of the elements
    /**
     * The top domain of the current page.
     * @type {string}
     */
    const topDomain = location.hostname.split(".").slice(-2).join(".");
    /**
     * A promise that resolves when the document is ready.
     * @type {Promise<void>}
     */
    const documentReady = new Promise((resolve) => {
        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                () => {
                    resolve();
                },
                { once: true, passive: true },
            );
        } else {
            resolve();
        }
    });
    /**
     * The official domain of GitHub.
     * @type {string}
     */
    const officialDomain = "github.com";
    /**
     * The color used for logging. Matches the color of the GitHub.
     * @type {string}
     */
    const themeColor = "#f78166";
    /**
     * Regular expression to match the expanded assets URL. (https://<host>/<username>/<repo>/releases/expanded_assets/<version>)
     */
    const expandedAssetsRegex = new RegExp(
        `https://${topDomain.replaceAll(".", "\\.")}/([^/]+)/([^/]+)/releases/expanded_assets/([^/]+)`,
    );
    /**
     * Data about the release. Maps `owner`, `repo` and `version` to the details of a release. Details are `Promise` objects if exist.
     */
    let releaseData = {};
    /**
     * Rate limit data for the GitHub API.
     * @type {Object}
     * @property {number} limit The maximum number of requests that the consumer is permitted to make per hour.
     * @property {number} remaining The number of requests remaining in the current rate limit window.
     * @property {number} reset The time at which the current rate limit window resets in UTC epoch seconds.
     */
    let rateLimit = {
        limit: -1,
        remaining: -1,
        reset: -1,
    };


    /**
     * Lightweight, self-contained replacement for the original GM_config dependency.
     * It intentionally uses the same dotted GM storage keys as GM_config 1.2.2 so
     * existing GitHub Plus preferences continue to load.
     */
    class GHPConfig extends EventTarget {
        constructor(desc) {
            super();
            this.desc = desc;
            this.items = new Map();
            this.menuIds = [];
            this._flatten(desc);
            this._registerAll();
        }

        _typeDefaults(type) {
            const defaults = {
                str: { value: "" },
                bool: { value: false },
                int: { value: 0 },
                float: { value: 0 },
                enum: { value: 0, options: ["A", "B", "C"] },
                action: { value: null },
                folder: { value: null, items: {} },
            };
            return defaults[type] ?? defaults.str;
        }

        _flatten(desc, path = [], labels = [], inherited = {}) {
            const localDefaults = {
                ...inherited,
                ...(desc?.$default ?? {}),
            };
            for (const [key, raw] of Object.entries(desc ?? {})) {
                if (key === "$default") continue;
                const type = raw?.type ?? "str";
                const item = {
                    ...this._typeDefaults(type),
                    ...localDefaults,
                    ...raw,
                    type,
                };
                const prop = [...path, key].join(".");
                if (type === "folder") {
                    this._flatten(
                        item.items ?? {},
                        [...path, key],
                        [...labels, item.name ?? key],
                        localDefaults,
                    );
                } else {
                    this.items.set(prop, {
                        ...item,
                        prop,
                        labels,
                    });
                }
            }
        }

        _read(prop) {
            const item = this.items.get(prop);
            if (!item) return undefined;
            return GM_getValue(prop, item.value);
        }

        _dispatch(type, detail) {
            this.dispatchEvent(new CustomEvent(type, { detail }));
        }

        get(prop) {
            const item = this.items.get(prop);
            if (!item) return undefined;
            const value = this._read(prop);
            this._dispatch("get", {
                prop,
                before: value,
                after: value,
                remote: false,
            });
            return value;
        }

        set(prop, value) {
            const item = this.items.get(prop);
            if (!item) return false;
            const before = this._read(prop);
            if (Object.is(value, item.value) && typeof GM_deleteValue === "function") {
                GM_deleteValue(prop);
            } else {
                GM_setValue(prop, value);
            }
            const after = this._read(prop);
            if (!Object.is(before, after)) {
                this._dispatch("set", {
                    prop,
                    before,
                    after,
                    remote: false,
                });
                this._registerAll();
            }
            return true;
        }

        _format(item, value) {
            switch (item.type) {
                case "bool":
                    return `${item.name}: ${value ? "✔" : "✘"}`;
                case "enum":
                    return `${item.name}: ${item.options?.[value] ?? value}`;
                case "action":
                    return item.name;
                case "str":
                    if (item.prop === "advanced.token") {
                        return `${item.name}: ${value ? "••••••••" : "(not set)"}`;
                    }
                    return `${item.name}: ${value}`;
                default:
                    return `${item.name}: ${value}`;
            }
        }

        _title(item, value) {
            try {
                return typeof item.title === "function"
                    ? String(item.title(item.prop, value, item))
                    : item.title
                      ? String(item.title)
                      : "";
            } catch {
                return "";
            }
        }

        _registerAll() {
            if (typeof GM_unregisterMenuCommand === "function") {
                for (const id of this.menuIds) {
                    try {
                        GM_unregisterMenuCommand(id);
                    } catch {
                        // Some managers can invalidate menu IDs during navigation.
                    }
                }
            }
            this.menuIds = [];

            for (const [prop, item] of this.items) {
                const value = this._read(prop);
                const category = item.labels.length
                    ? `${item.labels.join(" › ")} › `
                    : "";
                const caption = category + this._format(item, value);
                const options = {
                    autoClose: false,
                    title: this._title(item, value),
                };
                try {
                    const id = GM_registerMenuCommand(
                        caption,
                        () => this._activate(prop),
                        options,
                    );
                    this.menuIds.push(id);
                } catch {
                    // Fallback for managers that only support the legacy signature.
                    const id = GM_registerMenuCommand(caption, () =>
                        this._activate(prop),
                    );
                    this.menuIds.push(id);
                }
            }
        }

        _activate(prop) {
            const item = this.items.get(prop);
            if (!item) return;
            const current = this._read(prop);

            try {
                switch (item.type) {
                    case "bool":
                        this.set(prop, !current);
                        break;
                    case "enum":
                        this.set(
                            prop,
                            (Number(current) + 1) % Math.max(item.options?.length ?? 1, 1),
                        );
                        break;
                    case "int": {
                        const input = window.prompt(
                            `New value for ${item.name}:`,
                            String(current),
                        );
                        if (input === null) break;
                        const value = Number.parseInt(input, 10);
                        if (!Number.isFinite(value)) {
                            alert(`Invalid integer: ${input}`);
                            break;
                        }
                        if (item.min != null && value < item.min) {
                            alert(`${item.name} must be at least ${item.min}.`);
                            break;
                        }
                        if (item.max != null && value > item.max) {
                            alert(`${item.name} must be at most ${item.max}.`);
                            break;
                        }
                        this.set(prop, value);
                        break;
                    }
                    case "float": {
                        const input = window.prompt(
                            `New value for ${item.name}:`,
                            String(current),
                        );
                        if (input === null) break;
                        const value = Number.parseFloat(input);
                        if (!Number.isFinite(value)) {
                            alert(`Invalid number: ${input}`);
                            break;
                        }
                        this.set(prop, value);
                        break;
                    }
                    case "str": {
                        const input = window.prompt(
                            `New value for ${item.name}:`,
                            String(current ?? ""),
                        );
                        if (input !== null) this.set(prop, input);
                        break;
                    }
                    case "action":
                        this._dispatch("get", {
                            prop,
                            before: current,
                            after: current,
                            remote: false,
                        });
                        break;
                }
            } catch (error) {
                console.error("[GitHub Plus] Failed to change setting", prop, error);
            }
        }
    }

    // Configuration
    const configDesc = {
        $default: {
            autoClose: false,
        },
        code: {
            name: "🔢 Code Features",
            type: "folder",
            items: {
                tabSize: {
                    name: "➡️ Tab Size",
                    title: "Set Tab indentation size",
                    type: "int",
                    min: 0,
                    value: 4,
                },
                cursorBlink: {
                    name: "😉 Cursor Blink",
                    title: "Enable cursor blinking",
                    type: "bool",
                    value: false,
                },
                cursorAnimation: {
                    name: "🌊 Cursor Animation",
                    title: "Make cursor move smoothly",
                    type: "bool",
                    value: false,
                },
                fullWidth: {
                    name: "🔲 Full Width",
                    title: "Make the code block full width (other buttons may cover the end of the line)",
                    type: "bool",
                    value: false,
                },
                hideReadonlyTip: {
                    name: "🫥 Hide Readonly Tip",
                    title: "Hide the 'Code view is read-only.' tip in code blocks",
                    type: "bool",
                    value: false,
                },
            },
        },
        appearance: {
            name: "🎨 Appearance",
            type: "folder",
            items: {
                dashboard: {
                    name: "📰 Dashboard",
                    title: "Configures the dashboard",
                    type: "enum",
                    options: [
                        "Default",
                        "Hide Copilot",
                        "Hide Feed",
                        "Mobile-Like",
                    ],
                },
                leftSidebar: {
                    name: "↖️ Left Sidebar",
                    title: "Configures the left sidebar",
                    type: "enum",
                    options: ["Default", "Hidden"],
                },
                rightSidebar: {
                    name: "↗️ Right Sidebar",
                    title: "Configures the right sidebar",
                    type: "enum",
                    options: [
                        "Default",
                        "Hide 'Latest changes'",
                        "Hide 'Explore repositories'",
                        "Hide Completely",
                    ],
                },
                stickyAvatar: {
                    name: "📌 Sticky Avatar",
                    title: "Make the avatar sticky",
                    type: "bool",
                    value: false,
                },
                stickyMore: {
                    name: "📌 Sticky More",
                    title: "Make more elements sticky (e.g. issue & comment headers)",
                    type: "bool",
                    value: false,
                },
                hideHeaderUnderline: {
                    name: "🫥 Hide Header Underline",
                    title: "Hide the underline of the header (the border below the header)",
                    type: "bool",
                    value: false,
                },
                catppuccinIcons: {
                    name: "🐱 Catppuccin Icons",
                    title: "Use catppuccin icons for folders and files (HIGHLY EXPERIMENTAL), need refresh to apply changes",
                    type: "enum",
                    options: [
                        "🚫 Default",
                        "🌻 Latte",
                        "🪴 Frappé",
                        "🌺 Macchiato",
                        "🌿 Mocha",
                    ],
                },
                visibleDetails: {
                    name: "👀 Visible Details",
                    title: "Apply indent and borders around <details> elements to make them more visible",
                    type: "bool",
                    value: false,
                },
                customMenuIcon: {
                    name: "🥞 Custom Menu Icon",
                    title: "Use a custom icon for the menu, leave empty to use the default",
                    type: "str",
                    value: "",
                },
            },
        },
        release: {
            name: "📦 Release Features",
            type: "folder",
            items: {
                uploader: {
                    name: "⬆️ Release Uploader",
                    title: "Show uploader of release assets",
                    type: "bool",
                    value: true,
                },
                downloads: {
                    name: "📥 Release Downloads",
                    title: "Show download counts of release assets",
                    type: "bool",
                    value: true,
                },
                histogram: {
                    name: "📊 Release Histogram",
                    title: "Show a histogram of download counts for each release asset",
                    type: "bool",
                },
                hideArchives: {
                    name: "🫥 Hide Archives",
                    title: "Hide source code archives (zip, tar.gz) in the release assets",
                    type: "bool",
                },
            },
        },
        additional: {
            name: "🪄 Additional Features",
            type: "folder",
            items: {
                extendedUserInfo: {
                    name: "👤 Extended User Info",
                    title: "Show extended information about users",
                    type: "bool",
                    value: false,
                },
                extendedRepoInfo: {
                    name: "📁 Extended Repo Info",
                    title: "Show extended information about repositories",
                    type: "bool",
                    value: false,
                },
                archivedRepoStars: {
                    name: "⭐ Archived Repo Stars",
                    title: "Allow starring archived repositories",
                    type: "bool",
                    value: false,
                },
                trackingPrevention: {
                    name: "🎭 Tracking Prevention",
                    title: () => {
                        return `Prevent some tracking by GitHub (${name} has prevented tracking ${GM_getValue("trackingPrevented", 0)} time(s))`;
                    },
                    type: "bool",
                    value: false,
                },
            },
        },
        advanced: {
            name: "⚙️ Advanced Settings",
            type: "folder",
            items: {
                token: {
                    name: "🔑 Personal Access Token",
                    title: "Your personal access token for GitHub API, starting with `github_pat_` (used for increasing rate limit)",
                    type: "str",
                },
                rateLimit: {
                    name: "📈 Rate Limit",
                    title: "View the current rate limit status",
                    type: "action",
                },
                debug: {
                    name: "🐞 Debug",
                    title: "Enable debug mode",
                    type: "bool",
                },
            },
        },
    };
    const config = new GHPConfig(configDesc);

    // General functions
    const $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);
    /**
     * Log the given arguments if debug mode is enabled.
     * @param {...any} args The arguments to log.
     */
    function log(...args) {
        if (config.get("advanced.debug"))
            console.log(
                `%c[${name}]%c`,
                `color:${themeColor};`,
                "color: unset;",
                ...args,
            );
    }
    /**
     * Warn the given arguments.
     * @param {...any} args The arguments to warn.
     */
    function warn(...args) {
        console.warn(
            `%c[${name}]%c`,
            `color:${themeColor};`,
            "color: unset;",
            ...args,
        );
    }
    /**
     * Replace the domain of the given URL with the top domain if needed.
     * @param {string} url The URL to fix.
     * @returns {string} The fixed URL.
     */
    function fixDomain(url) {
        return topDomain === officialDomain
            ? url
            : url.replace(
                  `https://${officialDomain}/`,
                  `https://${topDomain}/`,
              ); // Replace top domain
    }
    /**
     * Fetch the given URL with the personal access token, if given. Also updates rate limit.
     * @param {string} url The URL to fetch.
     * @param {RequestInit} options The options to pass to `fetch`.
     * @returns {Promise<Response>} The response from the fetch.
     */
    async function fetchWithToken(url, options) {
        const token = config.get("advanced.token");
        if (token) {
            if (!options) options = {};
            if (!options.headers) options.headers = {};
            options.headers.accept = "application/vnd.github+json";
            options.headers["X-GitHub-Api-Version"] = "2022-11-28";
            options.headers.Authorization = `Bearer ${token}`;
        }
        const r = await fetch(url, options);
        function parseRateLimit(suffix, defaultValue = -1) {
            const parsed = parseInt(r.headers.get(`X-RateLimit-${suffix}`));
            return isNaN(parsed) ? defaultValue : parsed;
        }
        // Update rate limit
        for (const key of Object.keys(rateLimit)) {
            rateLimit[key] = parseRateLimit(key); // Case-insensitive
        }
        const resetDate = new Date(rateLimit.reset * 1000).toLocaleString();
        log(
            `Rate limit: remaining ${rateLimit.remaining}/${rateLimit.limit}, resets at ${resetDate}`,
        );
        if (r.status === 403 || r.status === 429) {
            // If we get 403 or 429, we've hit the rate limit.
            throw new Error(`Rate limit exceeded! Will reset at ${resetDate}`);
        } else if (rateLimit.remaining === 0) {
            warn(`Rate limit has been exhausted! Will reset at ${resetDate}`);
        }
        return r;
    }

    // Catppuccin icons (self-contained fallback pack).
    // The original build loaded generated JSON from the author's GitHub account.
    // This repaired build embeds a compact icon/association set so a suspended
    // account cannot prevent the whole userscript from starting.
    const catppuccinPalette = {
        latte: {
            rosewater: "#dc8a78", flamingo: "#dd7878", pink: "#ea76cb",
            mauve: "#8839ef", red: "#d20f39", maroon: "#e64553",
            peach: "#fe640b", yellow: "#df8e1d", green: "#40a02b",
            teal: "#179299", sky: "#04a5e5", sapphire: "#209fb5",
            blue: "#1e66f5", lavender: "#7287fd", text: "#4c4f69",
            subtext1: "#5c5f77", subtext0: "#6c6f85", overlay2: "#7c7f93",
            overlay1: "#8c8fa1", overlay0: "#9ca0b0", surface2: "#acb0be",
            surface1: "#bcc0cc", surface0: "#ccd0da", base: "#eff1f5",
            mantle: "#e6e9ef", crust: "#dce0e8",
        },
        frappe: {
            rosewater: "#f2d5cf", flamingo: "#eebebe", pink: "#f4b8e4",
            mauve: "#ca9ee6", red: "#e78284", maroon: "#ea999c",
            peach: "#ef9f76", yellow: "#e5c890", green: "#a6d189",
            teal: "#81c8be", sky: "#99d1db", sapphire: "#85c1dc",
            blue: "#8caaee", lavender: "#babbf1", text: "#c6d0f5",
            subtext1: "#b5bfe2", subtext0: "#a5adce", overlay2: "#949cbb",
            overlay1: "#838ba7", overlay0: "#737994", surface2: "#626880",
            surface1: "#51576d", surface0: "#414559", base: "#303446",
            mantle: "#292c3c", crust: "#232634",
        },
        macchiato: {
            rosewater: "#f4dbd6", flamingo: "#f0c6c6", pink: "#f5bde6",
            mauve: "#c6a0f6", red: "#ed8796", maroon: "#ee99a0",
            peach: "#f5a97f", yellow: "#eed49f", green: "#a6da95",
            teal: "#8bd5ca", sky: "#91d7e3", sapphire: "#7dc4e4",
            blue: "#8aadf4", lavender: "#b7bdf8", text: "#cad3f5",
            subtext1: "#b8c0e0", subtext0: "#a5adcb", overlay2: "#939ab7",
            overlay1: "#8087a2", overlay0: "#6e738d", surface2: "#5b6078",
            surface1: "#494d64", surface0: "#363a4f", base: "#24273a",
            mantle: "#1e2030", crust: "#181926",
        },
        mocha: {
            rosewater: "#f5e0dc", flamingo: "#f2cdcd", pink: "#f5c2e7",
            mauve: "#cba6f7", red: "#f38ba8", maroon: "#eba0ac",
            peach: "#fab387", yellow: "#f9e2af", green: "#a6e3a1",
            teal: "#94e2d5", sky: "#89dceb", sapphire: "#74c7ec",
            blue: "#89b4fa", lavender: "#b4befe", text: "#cdd6f4",
            subtext1: "#bac2de", subtext0: "#a6adc8", overlay2: "#9399b2",
            overlay1: "#7f849c", overlay0: "#6c7086", surface2: "#585b70",
            surface1: "#45475a", surface0: "#313244", base: "#1e1e2e",
            mantle: "#181825", crust: "#11111b",
        },
    };

    const associations = {
        folderNames: {
            ".git": "folder_git",
            ".github": "folder_git",
            "src": "folder_src",
            "source": "folder_src",
            "lib": "folder_src",
            "test": "folder_test",
            "tests": "folder_test",
            "__tests__": "folder_test",
            "docs": "folder_docs",
            "doc": "folder_docs",
            "assets": "folder_assets",
            "images": "folder_assets",
            "public": "folder_assets",
            "node_modules": "folder_node",
        },
        fileNames: {
            "package.json": "node",
            "package-lock.json": "node",
            "pnpm-lock.yaml": "node",
            "yarn.lock": "node",
            "README": "markdown",
            "README.md": "markdown",
            "LICENSE": "license",
            "LICENSE.md": "license",
            "Dockerfile": "docker",
            ".gitignore": "git",
            ".gitattributes": "git",
            "tsconfig.json": "typescript",
            "pyproject.toml": "python",
            "Cargo.toml": "rust",
            "go.mod": "go",
        },
        fileExtensions: {
            "js": "javascript", "mjs": "javascript", "cjs": "javascript",
            "jsx": "react", "ts": "typescript", "tsx": "react",
            "json": "json", "jsonc": "json", "md": "markdown", "mdx": "markdown",
            "py": "python", "pyw": "python", "rs": "rust", "go": "go",
            "java": "java", "kt": "java", "kts": "java", "cs": "csharp",
            "c": "cpp", "cc": "cpp", "cpp": "cpp", "cxx": "cpp", "h": "cpp", "hpp": "cpp",
            "html": "html", "htm": "html", "css": "css", "scss": "css", "sass": "css", "less": "css",
            "yml": "yaml", "yaml": "yaml", "toml": "config", "ini": "config", "conf": "config",
            "xml": "xml", "svg": "image", "png": "image", "jpg": "image", "jpeg": "image",
            "gif": "image", "webp": "image", "ico": "image", "bmp": "image",
            "zip": "archive", "7z": "archive", "rar": "archive", "tar": "archive", "gz": "archive",
            "exe": "binary", "dll": "binary", "bin": "binary", "wasm": "binary",
            "ps1": "powershell", "psm1": "powershell", "sh": "shell", "bash": "shell", "zsh": "shell",
            "bat": "shell", "cmd": "shell", "lua": "lua", "rb": "ruby", "php": "php",
            "sql": "database", "db": "database", "sqlite": "database",
        },
        languageIds: {},
    };

    function makeFileIcon(color = "text") {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true">
            <path fill="var(--ctp-${color}, currentColor)" fill-opacity=".24" d="M3 1.25h6.2L13 5.05v9.7H3z"/>
            <path fill="var(--ctp-${color}, currentColor)" d="M9 1v4.25h4v1.5H8.25A.75.75 0 0 1 7.5 6V1z"/>
            <path fill="var(--ctp-${color}, currentColor)" d="M3.75.5h5.56c.2 0 .39.08.53.22l3.44 3.44c.14.14.22.33.22.53v10.06a.75.75 0 0 1-.75.75h-9.5a.75.75 0 0 1-.75-.75V1.25A.75.75 0 0 1 3.25.5zm.25 1.5v12h8V5L9 2z"/>
        </svg>`;
    }

    function makeFolderIcon(color = "blue", open = false) {
        const d = open
            ? "M1.5 4.25A1.25 1.25 0 0 1 2.75 3h3l1.25 1.5h6.25A1.25 1.25 0 0 1 14.5 5.75v1H4.2L2.75 13H2a1 1 0 0 1-1-1V4.75c0-.28.22-.5.5-.5Zm2.05 4L2.3 13.5h9.9a1 1 0 0 0 .97-.76l1.1-4.49Z"
            : "M1.5 3A1.5 1.5 0 0 1 3 1.5h3l1.35 1.5H13A1.5 1.5 0 0 1 14.5 4.5v8A1.5 1.5 0 0 1 13 14H3a1.5 1.5 0 0 1-1.5-1.5Z";
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true"><path fill="var(--ctp-${color}, currentColor)" d="${d}"/></svg>`;
    }

    const iconColors = {
        javascript: "yellow", typescript: "blue", react: "sky", json: "yellow",
        markdown: "lavender", python: "blue", rust: "peach", go: "sky",
        java: "red", csharp: "green", cpp: "blue", html: "peach", css: "blue",
        yaml: "red", config: "overlay1", xml: "peach", image: "mauve",
        archive: "yellow", binary: "red", powershell: "blue", shell: "green",
        lua: "blue", ruby: "red", php: "mauve", database: "teal",
        node: "green", license: "yellow", docker: "blue", git: "peach",
    };

    const icons = {
        _file: makeFileIcon("text"),
        _folder: makeFolderIcon("blue"),
        _folder_open: makeFolderIcon("blue", true),
        folder_git: makeFolderIcon("peach"),
        folder_git_open: makeFolderIcon("peach", true),
        folder_src: makeFolderIcon("mauve"),
        folder_src_open: makeFolderIcon("mauve", true),
        folder_test: makeFolderIcon("green"),
        folder_test_open: makeFolderIcon("green", true),
        folder_docs: makeFolderIcon("lavender"),
        folder_docs_open: makeFolderIcon("lavender", true),
        folder_assets: makeFolderIcon("pink"),
        folder_assets_open: makeFolderIcon("pink", true),
        folder_node: makeFolderIcon("green"),
        folder_node_open: makeFolderIcon("green", true),
    };
    for (const [iconName, color] of Object.entries(iconColors)) {
        icons[iconName] = makeFileIcon(color);
    }

    const styleSheets = createStyleSheetModule({
        document,
        ready: documentReady,
        settings: { get: (prop) => config.get(prop) },
        idPrefix,
        catppuccinPalette,
    });
    // https://github.com/catppuccin/web-file-explorer-icons/blob/2eded13cf948ad05d20d9de91f12fd1f75ff0c23/src/entries/content/lib.ts#L64-L102
    function getIconName(filename, filetype = "file") {
        if (filetype === "submodule") {
            return "folder_git";
        }
        if (filetype === "folder" || filetype === "folder-open") {
            let iconName = "_folder";
            if (filename in associations.folderNames) {
                iconName = associations.folderNames[filename];
            } else if (filename.toLowerCase() in associations.folderNames) {
                iconName = associations.folderNames[filename.toLowerCase()];
            }

            if (filetype === "folder-open") {
                return iconName + "_open";
            } else {
                return iconName;
            }
        }

        // Match by exact file name (case-sensitive first, then case-insensitive)
        if (filename in associations.fileNames)
            return associations.fileNames[filename];
        if (filename.toLowerCase() in associations.fileNames)
            return associations.fileNames[filename.toLowerCase()];

        // Match by exact file name (case-sensitive first, then case-insensitive)
        if (filename in associations.fileNames)
            return associations.fileNames[filename];
        if (filename.toLowerCase() in associations.fileNames)
            return associations.fileNames[filename.toLowerCase()];

        // Compute all possible extensions (e.g. "foo.test.ts" → ["test.ts", "ts"])
        const fileExtensions = [];
        if (filename.length <= 255) {
            for (let i = 0; i < filename.length; i++) {
                if (filename[i] === ".") {
                    fileExtensions.push(filename.toLowerCase().slice(i + 1));
                }
            }
        }
        // Match by extension, then language ID
        for (const ext of fileExtensions) {
            if (ext in associations.fileExtensions)
                return associations.fileExtensions[ext];
            if (ext in associations.languageIds)
                return associations.languageIds[ext];
        }

        // Fallback
        return "_file";
    }
    const iconClass = "ghp-catppuccin-icon";
    const selectors = [
        {
            // Main file explorer
            rows: ".react-directory-row .react-directory-filename-column",
            icon: "svg.octicon",
            filename: ".react-directory-filename-cell a",
        },
        {
            // Main file explorer - parent directory
            rows: "#folder-row-0 a",
            icon: "svg.octicon",
            filename: "div",
        },
        {
            // Sidebar file explorer
            rows: ".PRIVATE_TreeView-item > .PRIVATE_TreeView-item-container > .PRIVATE_TreeView-item-content",
            icon: ".PRIVATE_TreeView-item-visual svg.octicon",
            filename: ".PRIVATE_TreeView-item-content-text",
        },
    ];
    function updateIcons(body = document.body) {
        if (!body || config.get("appearance.catppuccinIcons") === 0) return;
        selectors.forEach(({ rows, icon, filename }) => {
            body.querySelectorAll(rows).forEach((row) => {
                const iconEl = row.querySelector(icon);
                const filenameEl = row.querySelector(filename);
                if (!iconEl || !filenameEl) return;
                let filetype = "file";
                if (
                    iconEl.classList.contains("octicon-file-directory") ||
                    iconEl.classList.contains("octicon-file-directory-fill")
                ) {
                    filetype = "folder";
                } else if (
                    iconEl.classList.contains("octicon-file-directory-open") ||
                    iconEl.classList.contains(
                        "octicon-file-directory-open-fill",
                    )
                ) {
                    filetype = "folder-open";
                } else if (
                    iconEl.classList.contains("octicon-file-submodule")
                ) {
                    filetype = "submodule";
                }

                const name = filenameEl.textContent.trim();
                const iconName = getIconName(name, filetype);
                log(`${name} -> ${iconName}`);
                const fallbackIcon =
                    filetype === "folder-open"
                        ? "_folder_open"
                        : filetype === "folder" || filetype === "submodule"
                          ? "_folder"
                          : "_file";
                const svg = icons[iconName] ?? icons[fallbackIcon] ?? icons._file;
                if (!svg) return;
                const newIcon = new DOMParser()
                    .parseFromString(svg, "image/svg+xml")
                    .querySelector("svg");
                if (newIcon) {
                    newIcon.setAttribute("width", "16");
                    newIcon.setAttribute("height", "16");
                    newIcon.classList.add(iconClass);
                    // Remove existing custom icon if any
                    const existingIcon = row.querySelector(`.${iconClass}`);
                    existingIcon?.remove();
                    // Insert the new icon
                    iconEl.insertAdjacentElement("beforebegin", newIcon);
                } else {
                    warn(`Icon "${iconName}" not found for file "${name}"`);
                }
            });
        });
    }
    // Custom Menu Icon
    function connectCustomMenu(onConnected) {
        let cleanupTimer = null;

        function connect() {
            const menuBtn = $(
                '[data-testid="top-nav-left"] button[data-component="IconButton"]',
            );
            if (!menuBtn || menuBtn.dataset.ghpCustomMenuConnected === "true") {
                return Boolean(menuBtn);
            }

            const originalIcon = menuBtn.children?.[0];
            if (!originalIcon) return false;

            menuBtn.dataset.ghpCustomMenuConnected = "true";
            log("Connecting custom menu icon:", originalIcon);

            const customIcon = document.createElement("span");
            customIcon.classList.add("ghp-custom-menu-icon");

            function customMenuIcon(icon) {
                if (!menuBtn.isConnected) return;
                if (icon) {
                    customIcon.textContent = String(icon);
                    if (originalIcon.isConnected) originalIcon.remove();
                    if (!customIcon.isConnected) menuBtn.appendChild(customIcon);
                } else {
                    if (customIcon.isConnected) customIcon.remove();
                    if (!originalIcon.isConnected) menuBtn.appendChild(originalIcon);
                }
            }

            onConnected(customMenuIcon);
            return true;
        }

        if (connect()) return;

        const root = document.documentElement;
        if (!root) return;

        const obs = new MutationObserver(() => {
            if (connect()) {
                obs.disconnect();
                if (cleanupTimer) clearTimeout(cleanupTimer);
            }
        });
        obs.observe(root, { childList: true, subtree: true });

        // Avoid leaving a document-wide observer alive indefinitely if GitHub
        // changes the navigation markup again.
        cleanupTimer = setTimeout(() => obs.disconnect(), 15000);
    }

    // Release features
    /**
     * Get the release data for the given owner, repo and version.
     * @param {string} owner The owner of the repository.
     * @param {string} repo The repository name.
     * @param {string} version The version tag of the release.
     * @returns {Promise<Object>} The release data, which resolves to an object mapping download link to details.
     */
    async function getReleaseData(owner, repo, version) {
        if (!releaseData[owner]) releaseData[owner] = {};
        if (!releaseData[owner][repo]) releaseData[owner][repo] = {};
        if (!releaseData[owner][repo][version]) {
            const url = `https://api.${topDomain}/repos/${owner}/${repo}/releases/tags/${version}`;
            const promise = fetchWithToken(url)
                .then(async (response) => {
                    const data = await response.json().catch(() => null);
                    if (!response.ok) {
                        throw new Error(
                            `GitHub API ${response.status}: ${data?.message ?? response.statusText}`,
                        );
                    }
                    return data;
                })
                .then((data) => {
                    log(
                        `Fetched release data for ${owner}/${repo}@${version}:`,
                        data,
                    );
                    const assets = {};
                    for (const asset of Array.isArray(data?.assets) ? data.assets : []) {
                        assets[fixDomain(asset.browser_download_url)] = {
                            downloads: asset.download_count,
                            uploader: {
                                name: asset.uploader.login,
                                url: fixDomain(asset.uploader.html_url),
                            },
                        };
                    }
                    log(
                        `Processed release data for ${owner}/${repo}@${version}:`,
                        assets,
                    );
                    return assets;
                })
                .catch((error) => {
                    warn(
                        `Failed to fetch release data for ${owner}/${repo}@${version}:`,
                        error,
                    );
                    return {};
                });
            releaseData[owner][repo][version] = promise;
        }
        return releaseData[owner][repo][version];
    }
    /**
     * Create a link to the uploader's profile.
     * @param {Object} uploader The uploader information.
     * @param {string} uploader.name The name of the uploader.
     * @param {string} uploader.url The URL to the uploader's profile.
     */
    function createUploaderLink(uploader) {
        const link = document.createElement("a");
        link.href = uploader.url;
        link.setAttribute("class", "text-sm-left flex-auto ml-md-3 nowrap");
        if (uploader.url.startsWith(`https://${topDomain}/apps/`)) {
            link.classList.add("color-fg-success");
            // Remove suffix `[bot]` from the name if exists
            const name = uploader.name.endsWith("[bot]")
                ? uploader.name.slice(0, -5)
                : uploader.name;
            link.title = `Uploaded by GitHub App @${name}`;
            link.textContent = `@${name}`;
        } else {
            link.classList.add("color-fg-muted");
            link.setAttribute(
                "data-hovercard-url",
                `/users/${uploader.name}/hovercard`,
            );
            link.title = `Uploaded by @${uploader.name}`;
            link.textContent = `@${uploader.name}`;
        }
        return link;
    }
    /**
     * Create a span element with the given download count.
     * @param {number} downloads The download count.
     */
    function createDownloadCount(downloads) {
        const downloadCount = document.createElement("span");
        downloadCount.textContent = `${downloads} DL`;
        downloadCount.title = `${downloads} downloads`;
        downloadCount.setAttribute(
            "class",
            "color-fg-muted text-sm-left flex-shrink-0 flex-grow-0 ml-md-3 nowrap",
        );
        return downloadCount;
    }
    /**
     * Show a histogram of the download counts for the given release entry.
     * @param {HTMLElement} asset One of the release assets.
     * @param {number} value The download count of the asset.
     * @param {number} max The maximum download count of all assets.
     */
    function showHistogram(asset, value, max) {
        asset.style.setProperty("--percent", `${(value / max) * 100}%`);
    }
    /**
     * Adding additional info (download count) to the release entries under the given element.
     * @param {HTMLElement} el The element to search for release entries.
     * @param {Object} info Additional information about the release (owner, repo, version).
     * @param {string} info.owner The owner of the repository.
     * @param {string} info.repo The repository name.
     * @param {string} info.version The version of the release.
     */
    async function addAdditionalInfoToRelease(el, info) {
        const entries = el.querySelectorAll("ul > li");
        const assets = [];
        const hideArchives = config.get("release.hideArchives");
        entries.forEach((asset) => {
            if (asset.querySelector("svg.octicon-package")) {
                // Release asset
                assets.push(asset);
            } else if (hideArchives) {
                // Source code archive
                asset.remove();
            }
        });
        const releaseData = await getReleaseData(
            info.owner,
            info.repo,
            info.version,
        );
        if (!releaseData) return;
        const maxDownloads = Math.max(
            0,
            ...Object.values(releaseData).map((asset) => asset.downloads),
        );
        assets.forEach((asset) => {
            const downloadLink =
                asset.querySelector('a[href*="/releases/download/"]')?.href ??
                asset.querySelector("a")?.href;
            const statistics = asset.children?.[1] ?? asset;
            const assetInfo = downloadLink ? releaseData[downloadLink] : null;
            if (!assetInfo || !statistics) return;
            asset.classList.add("ghp-release-asset");
            if (
                config.get("release.downloads") &&
                !statistics.querySelector(".ghp-download-count")
            ) {
                const downloadCount = createDownloadCount(assetInfo.downloads);
                downloadCount.classList.add("ghp-download-count");
                statistics.prepend(downloadCount);
            }
            if (
                config.get("release.uploader") &&
                !statistics.querySelector(".ghp-uploader")
            ) {
                const uploaderLink = createUploaderLink(assetInfo.uploader);
                uploaderLink.classList.add("ghp-uploader");
                statistics.prepend(uploaderLink);
            }
            if (
                config.get("release.histogram") &&
                maxDownloads > 0 &&
                assets.length > 1
            ) {
                showHistogram(asset, assetInfo.downloads, maxDownloads);
            }
        });
    }
    /**
     * Handle the `include-fragment-replace` event.
     * @param {CustomEvent} event The event object.
     */
    function onFragmentReplace(event) {
        const self = event.target;
        const src = self?.src || self?.getAttribute?.("src");
        if (!src) return;
        let normalizedSrc;
        try {
            normalizedSrc = new URL(src, location.href).href;
        } catch {
            return;
        }
        const match = expandedAssetsRegex.exec(normalizedSrc);
        if (!match) return;
        const [, owner, repo, version] = match;
        const info = { owner, repo, version };
        const fragment = event.detail?.fragment;
        if (!fragment) return;
        log("Found expanded assets:", fragment);
        for (const child of fragment.children ?? []) {
            void addAdditionalInfoToRelease(child, info);
        }
    }
    /**
     * Find all release entries and setup listeners to show the download count.
     */
    function setupListeners() {
        log("Calling setupListeners");
        if (
            !config.get("release.downloads") &&
            !config.get("release.uploader") &&
            !config.get("release.histogram")
        )
            return; // No need to run
        // IncludeFragmentElement: https://github.com/github/include-fragment-element/blob/main/src/include-fragment-element.ts
        const fragments = document.querySelectorAll(
            '[data-hpc] details[data-view-component="true"] include-fragment[src*="/releases/expanded_assets/"]',
        );
        fragments.forEach((fragment) => {
            if (!fragment.hasAttribute("data-ghp-listening")) {
                fragment.toggleAttribute("data-ghp-listening", true);
                fragment.addEventListener(
                    "include-fragment-replace",
                    onFragmentReplace,
                    { once: true, passive: true },
                );
                if (config.get("release.hideArchives")) {
                    // Fix assets count
                    const summary =
                        fragment.parentElement?.previousElementSibling;
                    if (
                        summary?.tagName === "SUMMARY" &&
                        summary.firstElementChild?.textContent?.trim() === "Assets"
                    ) {
                        const counter = summary.querySelector("span.Counter");
                        if (counter) {
                            const count = parseInt(counter.textContent) - 2; // Exclude the source code archives
                            log(counter, count + 2, count);
                            counter.textContent = count.toString();
                            counter.title = count.toString();
                        }
                    }
                }
            }
        });
    }
    // `include-fragment-replace` avoids reparsing responses or observing the
    // entire document. Feature lifecycle owns initial and Turbo scheduling.

    // Extended user & repo info
    const octicons = {
        repo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path></svg>',
        calendar:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 0 1 4.75 0ZM2.5 7.5v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V7.5Zm10.75-4H2.75a.25.25 0 0 0-.25.25V6h11V3.75a.25.25 0 0 0-.25-.25Z"></path></svg>',
        id_badge:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M3 7.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-3Zm10 .25a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1 0-1.5h4.5a.75.75 0 0 1 .75.75ZM10.25 11a.75.75 0 0 0 0-1.5h-2.5a.75.75 0 0 0 0 1.5h2.5Z"></path><path d="M7.25 0h1.5c.966 0 1.75.784 1.75 1.75V3h3.75c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25v-8.5C0 3.784.784 3 1.75 3H5.5V1.75C5.5.784 6.284 0 7.25 0Zm3.232 4.5A1.75 1.75 0 0 1 8.75 6h-1.5a1.75 1.75 0 0 1-1.732-1.5H1.75a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25ZM7 1.75v2.5c0 .138.112.25.25.25h1.5A.25.25 0 0 0 9 4.25v-2.5a.25.25 0 0 0-.25-.25h-1.5a.25.25 0 0 0-.25.25Z"></path></svg>',
        file_zip:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M3.5 1.75v11.5c0 .09.048.173.126.217a.75.75 0 0 1-.752 1.298A1.748 1.748 0 0 1 2 13.25V1.75C2 .784 2.784 0 3.75 0h5.586c.464 0 .909.185 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v8.586A1.75 1.75 0 0 1 12.25 15h-.5a.75.75 0 0 1 0-1.5h.5a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177L9.513 1.573a.25.25 0 0 0-.177-.073H7.25a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1 0-1.5h-3a.25.25 0 0 0-.25.25Zm3.75 8.75h.5c.966 0 1.75.784 1.75 1.75v3a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1-.75-.75v-3c0-.966.784-1.75 1.75-1.75ZM6 5.25a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 6 5.25Zm.75 2.25h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1 0-1.5ZM8 6.75A.75.75 0 0 1 8.75 6h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 8 6.75ZM8.75 3h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1 0-1.5ZM8 9.75A.75.75 0 0 1 8.75 9h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 8 9.75Zm-1 2.5v2.25h1v-2.25a.25.25 0 0 0-.25-.25h-.5a.25.25 0 0 0-.25.25Z"></path></svg>',
    };
    /**
     * Uses `relative-time` element to format the given timestamp.
     * @param {number} timestamp The timestamp to format.
     * @return {string} The HTML string of the formatted relative time.
     */
    function relativeTime(timestamp) {
        // Convert timestamp to ISO 8601 formatted timestamp
        const date = new Date(timestamp);
        const iso = date.toISOString();
        const fallback = date.toLocaleString();
        return `<relative-time prefix="" datetime="${iso}">${fallback}</relative-time>`;
    }
    function extendedUserInfo() {
        const profile = $(
            ".js-profile-editable-replace .js-profile-editable-area > ul.vcard-details",
        );
        const username = $("meta[property='profile:username']")?.content;
        const existingInfo = profile?.querySelector?.(
            ".ghp-extended-user-info",
        );
        if (!profile || !username || existingInfo) return;
        const fetchPromise = fetchWithToken(
            `https://api.${topDomain}/users/${username}`,
        )
            .then((response) => response.json())
            .catch((error) => {
                warn("Failed to fetch user info:", error);
                return null;
            });
        function addInfoRow(icon_name, name, lambda) {
            const icon = octicons[icon_name] || "";
            const row = document.createElement("li");
            row.classList.add("vcard-detail", "pt-1", "ghp-extended-user-info");
            row.innerHTML = `${icon}<span>${name}: Loading...</span>`;
            row.querySelector("svg")?.classList.add("octicon");
            profile.appendChild(row);
            fetchPromise.then((info) => {
                const span = row.querySelector("span");
                if (info) {
                    span.innerHTML = `${name}: ${lambda(info)}`;
                } else {
                    span.textContent = `${name}: Error`;
                }
            });
            return row;
        }
        addInfoRow("repo", "Public", (info) => {
            function formatCount(count, label) {
                return `${count} ${label}${count !== 1 ? "s" : ""}`;
            }
            const repos = `<a href="/${username}?tab=repositories" class="Link--primary wb-break-all" data-tab-item="repositories" data-turbo-frame="user-profile-frame">${formatCount(info.public_repos, "repo")}</a>`;
            const gists = `<a href="https://gist.github.com/${username}" class="Link--primary wb-break-all" target="_blank">${formatCount(info.public_gists, "gist")}</a>`;
            return `${repos}, ${gists}`;
        });
        addInfoRow("calendar", "Joined", (info) =>
            relativeTime(info.created_at),
        );
        addInfoRow("calendar", "Updated", (info) =>
            relativeTime(info.updated_at),
        );
        addInfoRow("id_badge", "Node ID", (info) => info.node_id);
    }
    function extendedRepoInfo() {
        log("Fetching extended repository info");
        const repoSidebar = $("[data-component='SplitPageLayout.Pane']");
        const properties = repoSidebar?.querySelector(".hide-sm.hide-md");
        const repoLink = $("#code-view-repo-link");
        if (!properties || !repoLink) return;
        const repoName = repoLink.getAttribute("href").slice(1); // Remove leading slash
        if (properties.dataset.ghpExtendedRepoInfo === repoName) return;
        properties.dataset.ghpExtendedRepoInfo = repoName;
        properties
            .querySelectorAll(".ghp-extended-repo-info")
            .forEach((element) => {
                element.remove();
            });
        const reportBtn = properties.querySelector(
            "a[href^='/contact/report-content']",
        );
        const fetchPromise = fetchWithToken(
            `https://api.${topDomain}/repos/${repoName}`,
        )
            .then((response) => response.json())
            .catch((error) => {
                warn("Failed to fetch repository info:", error);
                return null;
            });
        function addRow(icon_name, name, html_cb, title_cb = null) {
            const h3 = document.createElement("h3");
            h3.classList.add("sr-only", "ghp-extended-repo-info");
            h3.textContent = name;
            const icon = octicons[icon_name] || "";
            const container = document.createElement("div");
            container.classList.add("mt-2", "ghp-extended-repo-info");
            const entry = document.createElement("span");
            entry.innerHTML = `${icon} Loading...`;
            entry
                .querySelector("svg")
                ?.classList.add("octicon", "mr-2", "tmp-mr-2");
            entry.title = name;
            container.appendChild(entry);
            if (reportBtn) {
                reportBtn.insertAdjacentElement("beforebegin", h3);
                reportBtn.insertAdjacentElement("beforebegin", container);
            } else {
                properties.appendChild(h3);
                properties.appendChild(container);
            }
            fetchPromise.then((info) => {
                if (info) {
                    entry.innerHTML = `${icon} ${html_cb(info)}`;
                    if (title_cb) {
                        entry.title = title_cb(info);
                    }
                } else {
                    entry.innerHTML = `${icon} Error`;
                }
                entry
                    .querySelector("svg")
                    ?.classList.add("octicon", "mr-2", "tmp-mr-2");
            });
        }
        function formatRepoSize(sizeInKb) {
            const units = ["KB", "MB", "GB", "TB"];
            let size = sizeInKb;
            let unitIndex = 0;
            while (size >= 1024 && unitIndex < units.length - 1) {
                size /= 1024;
                unitIndex++;
            }
            const maximumFractionDigits = unitIndex === 0 ? 0 : 2;
            return `${size.toLocaleString(undefined, {
                maximumFractionDigits,
            })} ${units[unitIndex]}`;
        }
        function addRows() {
            log("Adding extended repository info rows");
            addRow(
                "file_zip",
                "Size",
                (info) => `<strong>${formatRepoSize(info.size)}</strong>`,
                (info) => `Size: ${info.size} KB`, // Raw size in title
            );
            addRow(
                "calendar",
                "Created",
                (info) => "Created: " + relativeTime(info.created_at),
            );
            addRow(
                "calendar",
                "Updated",
                (info) => "Updated: " + relativeTime(info.updated_at),
            );
            addRow(
                "calendar",
                "Pushed",
                (info) => "Pushed: " + relativeTime(info.pushed_at),
            );
            addRow("id_badge", "Node ID", (info) => info.node_id);
        }
        addRows();
    }
    // Tracking prevention
    function preventTracking() {
        log("Calling preventTracking");
        const elements = [
            // Prevents tracking data from being sent to https://collector.github.com/github/collect
            // https://github.githubassets.com/assets/node_modules/@github/hydro-analytics-client/dist/meta-helpers.js
            // Breakpoint on function `getOptionsFromMeta` to see the argument `prefix`, which is `octolytics`
            // Or investigate `hydro-analytics.ts` mentioned above, you may find: `const options = getOptionsFromMeta('octolytics')`
            // Later, this script gathers information from `meta[name^="${prefix}-"]` elements, so we can remove them.
            // If `collectorUrl` is not set, the script will throw an error, thus preventing tracking.
            ...$$("meta[name^=octolytics-]"),
            // Prevents tracking data from being sent to `https://api.github.com/_private/browser/stats`
            // From "Network" tab, we can find that this request is sent by `https://github.githubassets.com/assets/ui/packages/stats/stats.ts` at function `safeSend`, who accepts two arguments: `url` and `data`
            // Search for this function in the current script, and you will find that it is only called once by function `flushStats`
            // `url` parameter is set in this function, by: `const url = ssrSafeDocument?.head?.querySelector<HTMLMetaElement>('meta[name="browser-stats-url"]')?.content`
            // After removing the meta tag, the script will return, so we can remove this meta tag to prevent tracking.
            $("meta[name=browser-stats-url]"),
        ];
        elements.forEach((el) => {
            if (el) {
                log("Preventing tracking:", el.name, el.content);
                el.content = "";
            }
        }); // Clear contents instead of removing, to prevent potential issues
        if (elements.some((el) => el)) {
            GM_setValue(
                "trackingPrevented",
                GM_getValue("trackingPrevented", 0) + 1,
            );
        }
    }
    function preventFetchPatching() {
        // GitHub's current frontend may wrap/replace window.fetch while bootstrapping
        // React and lazy-loaded repository data. Making the property non-writable can
        // leave repository pages stuck on skeleton placeholders. Tracking Prevention
        // therefore limits itself to clearing the tracking metadata above and never
        // mutates the global fetch property.
        log("Fetch protection skipped for GitHub compatibility");
    }
    function showRateLimit() {
        const resetDate = new Date(rateLimit.reset * 1000).toLocaleString();
        alert(
            `Rate limit: remaining ${rateLimit.remaining}/${rateLimit.limit}, resets at ${resetDate}.\nIf you see -1, it means the rate limit has not been fetched yet, or GitHub has not provided the rate limit information.`,
        );
    }

    const featureLifecycle = createFeatureLifecycleModule({
        ready: documentReady,
        settings: {
            get: (prop) => config.get(prop),
            onGet(listener) {
                config.addEventListener("get", (event) =>
                    listener(event.detail),
                );
            },
            onSet(listener) {
                config.addEventListener("set", (event) =>
                    listener(event.detail),
                );
            },
        },
        events: {
            on: (name, listener, options) =>
                document.addEventListener(name, listener, options),
        },
        scheduleFrame: (callback) => requestAnimationFrame(callback),
        environment: {
            isMainSite: location.hostname === topDomain,
            readyState: document.readyState,
        },
        actions: {
            styleSheets,
            refreshIcons: updateIcons,
            connectCustomMenu,
            refreshReleases: setupListeners,
            refreshUserInfo: extendedUserInfo,
            refreshRepoInfo: extendedRepoInfo,
            patchArchivedRepoStars: (root = document) =>
                patchArchivedRepoStarData(root),
            clearTrackingMetadata: preventTracking,
            protectFetch: preventFetchPatching,
            showRateLimit,
            logEvent: (eventName, event) =>
                log(`Event: ${eventName}`, event),
        },
    });
    void featureLifecycle.start().catch((error) => {
        console.error(`[${name}] Failed to initialize:`, error);
    });

    log(`${name} v${version} has been loaded 🎉`);
})();
