// ==UserScript==
// @name         Auto Login - Loader
// @namespace    http://tampermonkey.net/
// @version      2026.10.12.1
// @description  Fetch the current Auto Login code from GitHub on every page load.
// @match        http://*/*
// @match        https://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
// @connect      raw.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/seemscloud/tampermonkey/main/auto-login-loader.user.js
// @downloadURL  https://raw.githubusercontent.com/seemscloud/tampermonkey/main/auto-login-loader.user.js
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
    "use strict"

    const SOURCE = "https://raw.githubusercontent.com/seemscloud/tampermonkey/main/auto-login.user.js"
    let loaded = false
    const failed = () => console.warn("Auto Login: could not load the script from GitHub. Reload the page to retry.")

    GM_xmlhttpRequest({
        method: "GET",
        url: `${SOURCE}?t=${Date.now()}`,
        nocache: true,
        anonymous: true,
        timeout: 15000,
        onload(response) {
            if (loaded) return
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
            } catch {
                failed()
            }
        },
        onerror: failed,
        ontimeout: failed,
    })
})()
