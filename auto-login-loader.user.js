// ==UserScript==
// @name         Auto Login - Loader
// @namespace    http://tampermonkey.net/
// @version      2026.10.13.1
// @description  Fetch the current Auto Login code from GitHub on every page load.
// @match        http://*/*
// @match        https://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
// @connect      api.github.com
// @updateURL    https://raw.githubusercontent.com/seemscloud/tampermonkey/main/auto-login-loader.user.js
// @downloadURL  https://raw.githubusercontent.com/seemscloud/tampermonkey/main/auto-login-loader.user.js
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
    "use strict"

    const SOURCE = "https://api.github.com/repos/seemscloud/tampermonkey/contents/auto-login.user.js"
    let loaded = false
    const failed = () => console.warn("Auto Login: could not load the script from GitHub. Reload the page to retry.")

    const fetchCurrent = () => GM_xmlhttpRequest({
        method: "GET",
        url: `${SOURCE}?ref=main&t=${Date.now()}`,
        headers: { Accept: "application/vnd.github.raw+json", "Cache-Control": "no-cache" },
        nocache: true,
        anonymous: true,
        timeout: 15000,
        onload(response) {
            if (loaded) return
            if (response.status === 403 || response.status === 429) {
                console.warn("Auto Login: GitHub API access/rate limit. Try again later; no stale code was executed.")
                return
            }
            const code = response.responseText
            if (response.status !== 200 || typeof code !== "string" ||
                !code.startsWith("// ==UserScript==") ||
                !code.includes("// ==/UserScript==")) {
                failed()
                return
            }
            loaded = true
            try {
                // Run in the page context, like the original @grant none script.
                GM_addElement("script", { textContent: code })
                console.info("Auto Login: injected version", code.match(/^\/\/ @version\s+(.+)$/m)?.[1] || "unknown")
            } catch {
                failed()
            }
        },
        onerror: failed,
        ontimeout: failed,
    })

    // Avoid using GitHub's unauthenticated API quota on unrelated pages.
    const timer = setInterval(() => {
        const login = document.querySelector('input[type="password"], #acknowledge-confirm')
        const grafanaSetup = /grafana/i.test(document.title) && /\/profile\/password/i.test(location.pathname)
        if (!login && !grafanaSetup) return
        clearInterval(timer)
        fetchCurrent()
    }, 300)
})()
