// ==UserScript==
// @name         Auto Login - RabbitMQ (guest / guest)
// @namespace    http://tampermonkey.net/
// @version      2026-10-12
// @description  Automatically fill guest credentials and try logging in up to 3 times per page load
// @match        http://*/*
// @match        https://*/*
// @grant        none
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
    "use strict"

    const USERNAME = "guest"
    const PASSWORD = "guest"
    const MAX_LOGIN_ATTEMPTS = 3
    const RETRY_DELAY_MS = 2000

    const isVisible = (el) => {
        if (!el) return false

        const rect = el.getBoundingClientRect()
        const style = window.getComputedStyle(el)
        return rect.width > 0 && rect.height > 0 &&
            style.visibility !== "hidden" && style.display !== "none"
    }

    const isEnabled = (el) =>
        el && !el.disabled && el.getAttribute("aria-disabled") !== "true"

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
        const looksLikeRabbitMQ = /rabbitmq/i.test(document.title || "") ||
            !!document.querySelector('img[src*="rabbitmq" i], img[alt*="rabbitmq" i]')
        if (!looksLikeRabbitMQ) return null

        // Only the RabbitMQ login form, never queue filters or user editors.
        const form = document.querySelector('#login form[action="#/login"]')
        if (!form) return null

        const userInput = form.querySelector('input[name="username"]')
        const passInput = form.querySelector('input[name="password"][type="password"]')
        const loginBtn = form.querySelector('input[type="submit"], button[type="submit"]')

        if (![userInput, passInput, loginBtn].every(isVisible)) return null
        if (userInput.form !== form || passInput.form !== form) return null

        return { userInput, passInput, loginBtn }
    }

    let loginAttempts = 0
    let lastLoginAttempt = 0

    const timer = setInterval(() => {
        const fields = findLoginFields()

        if (loginAttempts >= MAX_LOGIN_ATTEMPTS || (loginAttempts > 0 && !fields)) {
            clearInterval(timer)
            return
        }

        if (!fields || Date.now() - lastLoginAttempt < RETRY_DELAY_MS) return

        const { userInput, passInput, loginBtn } = fields
        if (![userInput, passInput, loginBtn].every(isEnabled) ||
            userInput.readOnly || passInput.readOnly) return

        if (!setNativeValue(userInput, USERNAME) ||
            !setNativeValue(passInput, PASSWORD)) return

        lastLoginAttempt = Date.now()
        loginAttempts += 1
        loginBtn.click()
    }, 200)
})()
