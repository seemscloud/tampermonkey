```js
// ==UserScript==
// @name         MinIO Auto Login + Ack (react-safe)
// @namespace    http://tampermonkey.net/
// @version      2026-06-28
// @description  Auto login helper for MinIO console login pages and the acknowledge prompt
// @match        http://*/*
// @match        https://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    const USERNAME = "minioadmin"
    const PASSWORD = "minioadmin"
    const MAX_LOGIN_ATTEMPTS = 3
    const MAX_ACK_ATTEMPTS = 3

    const setNativeValue = (el, value) => {
        const setter =
            Object.getOwnPropertyDescriptor(el.constructor.prototype, "value")?.set ||
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set
        setter.call(el, value)
        el.dispatchEvent(new Event("input", { bubbles: true }))
        el.dispatchEvent(new Event("change", { bubbles: true }))
    }

    const isVisible = (el) => {
        if (!el) return false

        const rect = el.getBoundingClientRect()
        const style = window.getComputedStyle(el)
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none"
    }

    const firstVisible = (selectors, root = document) => {
        for (const selector of selectors) {
            const elements = Array.from(root.querySelectorAll(selector))
            const found = elements.find(isVisible)
            if (found) return found
        }

        return null
    }

    const looksLikeMinio = () => {
        const title = (document.title || "").toLowerCase()
        const body = document.body
        const bodyText = (body?.innerText || "").toLowerCase()
        const minioAsset = document.querySelector(
            'link[href*="minio"], script[src*="minio"], img[src*="minio"], [class*="minio"], [id*="minio"]'
        )

        return (
            title.includes("minio") ||
            bodyText.includes("minio") ||
            !!minioAsset ||
            !!document.querySelector("#accessKey, #secretKey, #do-login")
        )
    }

    const findLoginFields = () => {
        const userInput = firstVisible([
            "#accessKey",
            'input[name="accessKey"]',
            'input[name="username"]',
            'input[autocomplete="username"]',
            'input[placeholder*="access" i]',
            'input[aria-label*="access" i]',
            'input[type="text"]',
        ])
        const passInput = firstVisible([
            "#secretKey",
            'input[name="secretKey"]',
            'input[name="password"]',
            'input[autocomplete="current-password"]',
            'input[placeholder*="secret" i]',
            'input[aria-label*="secret" i]',
            'input[type="password"]',
        ])
        const form = userInput?.closest("form") || passInput?.closest("form")
        const loginBtn =
            firstVisible(["#do-login", 'button[type="submit"], input[type="submit"]'], form || document) ||
            firstVisible(["#do-login", 'button[type="submit"], input[type="submit"]'])

        return { userInput, passInput, loginBtn }
    }

    let loginAttempts = 0
    let ackAttempts = 0
    let lastLoginAttempt = 0
    let lastAckAttempt = 0

    setInterval(() => {
        if (!looksLikeMinio()) return

        const { userInput, passInput, loginBtn } = findLoginFields()
        const ackBtn = firstVisible(["#acknowledge-confirm"])

        if (userInput && userInput.value !== USERNAME) {
            userInput.focus()
            setNativeValue(userInput, USERNAME)
            userInput.blur()
        }

        if (passInput && passInput.value !== PASSWORD) {
            passInput.focus()
            setNativeValue(passInput, PASSWORD)
            passInput.blur()
        }

        const now = Date.now()

        if (
            userInput &&
            passInput &&
            loginBtn &&
            !loginBtn.disabled &&
            loginBtn.getAttribute("aria-disabled") !== "true" &&
            loginAttempts < MAX_LOGIN_ATTEMPTS &&
            now - lastLoginAttempt >= 2000
        ) {
            lastLoginAttempt = now
            loginAttempts += 1
            loginBtn.click()
        }

        if (
            ackBtn &&
            !ackBtn.disabled &&
            ackBtn.getAttribute("aria-disabled") !== "true" &&
            ackAttempts < MAX_ACK_ATTEMPTS &&
            now - lastAckAttempt >= 1000
        ) {
            lastAckAttempt = now
            ackAttempts += 1
            ackBtn.click()
        }
    }, 200)
})()
```
