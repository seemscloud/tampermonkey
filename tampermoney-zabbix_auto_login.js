// ==UserScript==
// @name         Seems Cloud / Auto Login - Zabbix (Admin / zabbix)
// @namespace    http://tampermonkey.net/
// @version      2026-10-12
// @description  Auto login to Zabbix; at most 3 attempts per tab and installation, including reloads
// @match        http://*/*
// @match        https://*/*
// @grant        none
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
    "use strict"

    const USERNAME = "Admin"
    const PASSWORD = "zabbix"
    const MAX_LOGIN_ATTEMPTS = 3
    const RETRY_DELAY_MS = 2000
    // sessionStorage survives failed-login reloads. Close the tab to reset.
    const installationPath = location.pathname.replace(/[^/]*$/, "")
    const STORAGE_KEY = `tamper:zabbix:auto-login:${installationPath}`

    const isVisible = (el) => {
        if (!el) return false
        const rect = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        return rect.width > 0 && rect.height > 0 &&
            style.display !== "none" && style.visibility !== "hidden"
    }

    const isEnabled = (el) =>
        !el.disabled && el.getAttribute("aria-disabled") !== "true"

    const setNativeValue = (el, value) => {
        const setter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype, "value"
        )?.set
        if (!setter) return false
        setter.call(el, value)
        el.dispatchEvent(new Event("input", { bubbles: true }))
        el.dispatchEvent(new Event("change", { bubbles: true }))
        return el.value === value
    }

    const findLoginFields = () => {
        const looksLikeZabbix = /zabbix/i.test(document.title || "") ||
            !!document.querySelector('.signin-logo .zabbix-logo, img[alt*="zabbix" i], img[src*="zabbix" i]')
        if (!looksLikeZabbix) return null

        for (const form of document.querySelectorAll("form")) {
            const userInput = form.querySelector('input[name="name"]')
            const passInput = form.querySelector('input[name="password"][type="password"]')
            const loginBtn = form.querySelector('button[name="enter"][type="submit"], input[name="enter"][type="submit"]')
            if (![userInput, passInput, loginBtn].every(isVisible)) continue
            if (userInput.form !== form || passInput.form !== form) continue
            return { userInput, passInput, loginBtn }
        }
        return null
    }

    const timer = setInterval(() => {
        const fields = findLoginFields()
        if (!fields) return

        const { userInput, passInput, loginBtn } = fields
        if (![userInput, passInput, loginBtn].every(isEnabled) ||
            userInput.readOnly || passInput.readOnly) return

        let state
        try {
            state = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ||
                '{"attempts":0,"lastAttempt":0}')
            if (!state || !Number.isInteger(state.attempts) || state.attempts < 0 ||
                !Number.isFinite(state.lastAttempt)) throw new Error("Invalid retry state")
        } catch {
            clearInterval(timer)
            console.warn("Zabbix Auto Login: cannot read retry counter; automatic login stopped.")
            return
        }

        if (state.attempts >= MAX_LOGIN_ATTEMPTS) {
            clearInterval(timer)
            return
        }
        if (Date.now() - state.lastAttempt < RETRY_DELAY_MS) return

        if (!setNativeValue(userInput, USERNAME) ||
            !setNativeValue(passInput, PASSWORD)) return

        // Persist before submitting: Zabbix reloads the page on login failure.
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                attempts: state.attempts + 1,
                lastAttempt: Date.now(),
            }))
        } catch {
            clearInterval(timer)
            console.warn("Zabbix Auto Login: cannot save retry counter; automatic login stopped.")
            return
        }
        loginBtn.click()
    }, 200)
})()
