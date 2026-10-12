// ==UserScript==
// @name         Seems Cloud / Auto Login - Grafana (admin / admin)
// @namespace    http://tampermonkey.net/
// @version      2026-06-28
// @description  Auto login helper for Grafana login pages and the initial password setup skip screen
// @match        http://*/*
// @match        https://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    const USERNAME = "admin"
    const PASSWORD = "admin"
    const MAX_LOGIN_ATTEMPTS = 3

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

    const clickableButtons = () => {
        return Array.from(document.querySelectorAll("button, input[type='button'], input[type='submit']"))
            .filter(isVisible)
            .filter((el) => !el.disabled && el.getAttribute("aria-disabled") !== "true")
    }

    const textOf = (el) => {
        return `${el.innerText || ""} ${el.textContent || ""} ${el.value || ""} ${el.getAttribute("aria-label") || ""}`
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase()
    }

    const findButtonByText = (patterns) => {
        return clickableButtons().find((button) => {
            const text = textOf(button)
            return patterns.some((pattern) => text.includes(pattern))
        })
    }

    const looksLikeGrafana = () => {
        const title = (document.title || "").toLowerCase()
        const body = document.body
        const bodyText = (body?.innerText || "").toLowerCase()
        const bootData = window.grafanaBootData
        const grafanaAsset = document.querySelector(
            'link[href*="grafana"], script[src*="grafana"], img[src*="grafana"], [class*="grafana"]'
        )

        return (
            !!bootData ||
            body?.classList.contains("app-grafana") ||
            title.includes("grafana") ||
            bodyText.includes("grafana") ||
            !!grafanaAsset
        )
    }

    const isGrafanaLoginPage = () => {
        if (!looksLikeGrafana()) return false

        const path = window.location.pathname.toLowerCase()
        const bootUser = window.grafanaBootData?.user
        return path.includes("/login") || bootUser?.isSignedIn === false
    }

    const findLoginFields = () => {
        const userSelectors = [
            'input[name="user"]',
            'input[name="username"]',
            'input[autocomplete="username"]',
            'input[placeholder*="email" i]',
            'input[placeholder*="username" i]',
            'input[aria-label*="email" i]',
            'input[aria-label*="username" i]',
            'input[type="email"]',
            'input[type="text"]',
        ]
        const passwordSelectors = [
            'input[name="password"]',
            'input[autocomplete="current-password"]',
            'input[aria-label*="password" i]',
            'input[type="password"]',
        ]

        const userInput = firstVisible(userSelectors)
        const passInput = firstVisible(passwordSelectors)
        const form = userInput?.closest("form") || passInput?.closest("form")
        const submitBtn =
            firstVisible(['button[type="submit"], input[type="submit"]'], form || document) ||
            findButtonByText(["log in", "login", "sign in", "sign-in"])

        return { userInput, passInput, submitBtn }
    }

    const looksLikePasswordSetupPage = () => {
        if (!looksLikeGrafana()) return false

        const path = window.location.pathname.toLowerCase()
        const bodyText = (document.body?.innerText || "").toLowerCase()

        return (
            path.includes("/profile/password") ||
            bodyText.includes("change your password") ||
            bodyText.includes("update your password") ||
            bodyText.includes("new password") && bodyText.includes("confirm password")
        )
    }

    let lastLoginAttempt = 0
    let loginAttempts = 0
    let lastSkipAttempt = 0

    setInterval(() => {
        if (looksLikePasswordSetupPage()) {
            const now = Date.now()
            if (now - lastSkipAttempt > 1000) {
                lastSkipAttempt = now
                const skipBtn = findButtonByText(["skip"])
                if (skipBtn) skipBtn.click()
            }
            return
        }

        if (!isGrafanaLoginPage()) return
        if (loginAttempts >= MAX_LOGIN_ATTEMPTS) return

        const { userInput, passInput, submitBtn } = findLoginFields()

        if (!userInput || !passInput || !submitBtn) {
            return
        }

        const now = Date.now()
        if (now - lastLoginAttempt < 2000) return
        lastLoginAttempt = now

        if (userInput.value !== USERNAME) {
            userInput.focus()
            setNativeValue(userInput, USERNAME)
            userInput.blur()
        }

        if (passInput.value !== PASSWORD) {
            passInput.focus()
            setNativeValue(passInput, PASSWORD)
            passInput.blur()
        }

        if (!submitBtn.disabled && submitBtn.getAttribute("aria-disabled") !== "true") {
            loginAttempts += 1
            submitBtn.click()
        }
    }, 200)
})()
