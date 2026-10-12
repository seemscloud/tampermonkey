// ==UserScript==
// @name         Auto Login - Airflow (airflow / airflow)
// @namespace    http://tampermonkey.net/
// @version      2026-06-26
// @description  Auto login helper for Airflow login pages
// @match        http://*/*
// @match        https://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    const USERNAME = "airflow"
    const PASSWORD = "airflow"

    const setNativeValue = (el, value) => {
        const setter =
            Object.getOwnPropertyDescriptor(el.constructor.prototype, "value")?.set ||
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set
        setter.call(el, value)
        el.dispatchEvent(new Event("input", { bubbles: true }))
        el.dispatchEvent(new Event("change", { bubbles: true }))
    }

    const isLoginPath = () => {
        const path = window.location.pathname.toLowerCase()
        return path.includes("/login") || path.includes("/auth/login")
    }

    const findLoginFields = () => {
        const userInput = document.querySelector(
            '#username, input[name="username"], input[autocomplete="username"], input[type="text"]'
        )
        const passInput = document.querySelector(
            '#password, input[name="password"], input[autocomplete="current-password"], input[type="password"]'
        )
        const form = userInput?.closest("form") || passInput?.closest("form")
        const submitBtn =
            form?.querySelector('button[type="submit"], input[type="submit"], button:not([type])') ||
            document.querySelector('button[type="submit"], input[type="submit"]')

        return { userInput, passInput, submitBtn }
    }

    const nextLooksLikeAirflowHome = () => {
        const next = new URLSearchParams(window.location.search).get("next")
        if (!next) return false

        try {
            const nextUrl = new URL(next, window.location.origin)
            return nextUrl.origin === window.location.origin && nextUrl.pathname.replace(/\/+$/, "") === "/home"
        } catch {
            return false
        }
    }

    const looksLikeAirflowLogin = () => {
        if (!isLoginPath()) return false

        const title = (document.title || "").toLowerCase()
        const bodyText = (document.body?.innerText || "").toLowerCase()
        const airflowAsset = document.querySelector(
            'link[href*="airflow"], script[src*="airflow"], img[src*="airflow"]'
        )
        const { userInput, passInput, submitBtn } = findLoginFields()
        const hasLoginForm = !!userInput && !!passInput && !!submitBtn

        return hasLoginForm && (
            title.includes("airflow") ||
            bodyText.includes("airflow") ||
            bodyText.includes("enter your login and password below") ||
            !!airflowAsset ||
            nextLooksLikeAirflowHome()
        )
    }

    let lastAttempt = 0

    setInterval(() => {
        if (!looksLikeAirflowLogin()) return

        const { userInput, passInput, submitBtn } = findLoginFields()

        if (!userInput || !passInput || !submitBtn) {
            return
        }

        const now = Date.now()
        if (now - lastAttempt < 2000) return
        lastAttempt = now

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

        if (!submitBtn.disabled) {
            submitBtn.click()
        }
    }, 200)
})()
