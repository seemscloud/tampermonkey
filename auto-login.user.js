// ==UserScript==
// @name         Auto Login - Airflow, Grafana, JFrog, MinIO, RabbitMQ, Zabbix
// @namespace    http://tampermonkey.net/
// @version      2026.10.13.1
// @description  Detect the service and log in with its default credentials (up to 3 attempts).
// @match        http://*/*
// @match        https://*/*
// @updateURL    https://raw.githubusercontent.com/seemscloud/tampermonkey/main/auto-login.user.js
// @downloadURL  https://raw.githubusercontent.com/seemscloud/tampermonkey/main/auto-login.user.js
// @grant        none
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
    "use strict"

    const CREDENTIALS = {
        airflow: ["airflow", "airflow"],
        grafana: ["admin", "admin"],
        jfrog: ["admin", "password"],
        minio: ["minioadmin", "minioadmin"],
        rabbitmq: ["guest", "guest"],
        zabbix: ["Admin", "zabbix"],
    }
    const MAX_ATTEMPTS = 3
    const RETRY_DELAY_MS = 2000
    // Counters survive reloads in this tab. Close the tab to start again.
    const blocked = new Set()

    const visible = (el) => {
        if (!el) return false
        const rect = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        return rect.width > 0 && rect.height > 0 &&
            style.display !== "none" && style.visibility !== "hidden"
    }
    const enabled = (el) => el && !el.disabled &&
        el.getAttribute("aria-disabled") !== "true"
    const first = (selectors, root = document) => {
        for (const selector of selectors) {
            const el = [...root.querySelectorAll(selector)].find(visible)
            if (el) return el
        }
        return null
    }
    const setValue = (el, value) => {
        if (el.value === value) return true
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
        if (!setter) return false
        setter.call(el, value)
        el.dispatchEvent(new Event("input", { bubbles: true }))
        el.dispatchEvent(new Event("change", { bubbles: true }))
        return el.value === value
    }
    const buttonByText = (pattern) => [...document.querySelectorAll(
        'button, input[type="button"], input[type="submit"]'
    )].find((el) => visible(el) && enabled(el) &&
        pattern.test((el.textContent || el.value || el.getAttribute("aria-label") || "").trim()))

    const detect = () => {
        const title = document.title || ""
        const matches = []
        const asset = (name) => !!document.querySelector(
            `img[src*="${name}" i], img[alt*="${name}" i], script[src*="${name}" i], link[href*="${name}" i]`
        )
        if (/airflow/i.test(title) || asset("airflow")) matches.push("airflow")
        if (/grafana/i.test(title) || asset("grafana") || window.grafanaBootData ||
            document.body?.classList.contains("app-grafana")) matches.push("grafana")
        if (/minio/i.test(title) || asset("minio") ||
            document.querySelector('input#accessKey') && document.querySelector('input#secretKey')) matches.push("minio")
        if (/rabbitmq/i.test(title) || asset("rabbitmq")) matches.push("rabbitmq")
        if (/zabbix/i.test(title) || asset("zabbix") ||
            document.querySelector('.signin-logo .zabbix-logo')) matches.push("zabbix")
        if (/jfrog|artifactory/i.test(title) || asset("jfrog") || asset("artifactory") ||
            [...document.querySelectorAll("h1, h2, h3, h4")].some((el) =>
                /^welcome to jfrog$/i.test(el.textContent.trim()))) matches.push("jfrog")
        // Do not guess credentials on ambiguous pages.
        return matches.length === 1 ? matches[0] : null
    }

    const loginFields = (service) => {
        if (service === "jfrog") {
            // Only a sign-in action with one password field, never password setup.
            const password = first(['input[type="password"]'])
            if (!password || password.autocomplete === "new-password") return null
            const form = password.closest("form")
            if (!form) return null
            if ([...form.querySelectorAll('input[type="password"]')].filter(visible).length !== 1) return null
            const user = first(['input[name="username" i]', 'input[name="user" i]',
                'input#username', 'input#user', 'input[autocomplete="username"]',
                'input[placeholder="Username" i]', 'input[aria-label="Username" i]'], form)
            const submit = [...form.querySelectorAll('button, input[type="submit"]')].find((el) =>
                visible(el) && /^(?:login|log in|sign in)$/i.test((el.textContent || el.value || "").trim()))
            if (!user || !submit || user.form !== password.form) return null
            return { user, password, submit }
        }
        if (service === "airflow" && !/\/login(?:\/|$)/i.test(location.pathname)) return null
        if (service === "grafana" && !/\/login(?:\/|$)/i.test(location.pathname) &&
            window.grafanaBootData?.user?.isSignedIn !== false) return null

        const root = service === "rabbitmq"
            ? document.querySelector('#login form[action="#/login"]') : document
        if (!root) return null
        const password = first(['input#secretKey[type="password"]', 'input[name="password"][type="password"]',
            'input[type="password"]'], root)
        if (!password) return null
        const form = password.closest("form")
        const scope = form || root
        const users = {
            airflow: ['input#username', 'input[name="username"]', 'input[autocomplete="username"]'],
            grafana: ['input[name="user"]', 'input[name="username"]', 'input[autocomplete="username"]', 'input[type="email"]', 'input[type="text"]'],
            minio: ['input#accessKey', 'input[name="accessKey"]', 'input[name="username"]', 'input[autocomplete="username"]'],
            rabbitmq: ['input[name="username"]'],
            zabbix: ['input[name="name"]'],
        }
        const user = first(users[service], scope)
        const submit = service === "zabbix"
            ? first(['button[name="enter"][type="submit"], input[name="enter"][type="submit"]'], scope)
            : first(service === "minio"
                ? ['#do-login', 'button[type="submit"], input[type="submit"]']
                : ['button[type="submit"], input[type="submit"]'], scope)
        if (!user || !submit || user === password || user.form !== password.form) return null
        if (!form && !["minio", "grafana"].includes(service)) return null
        return { user, password, submit }
    }

    const attempt = (service, action, callback) => {
        // Key by service and installation prefix, not query/hash routing.
        const prefix = location.pathname.replace(/\/(?:login|profile)(?:\/.*)?$/i, "/")
            .replace(/[^/]*$/, "")
        const key = `auto-login:v1:${service}:${prefix}:${action}`
        if (blocked.has(key)) return
        try {
            const state = JSON.parse(sessionStorage.getItem(key) || '{"count":0,"time":0}')
            if (!state || !Number.isInteger(state.count) || state.count < 0 ||
                !Number.isFinite(state.time)) throw new Error("Invalid retry counter")
            if (state.count >= MAX_ATTEMPTS || Date.now() - state.time < RETRY_DELAY_MS) return
            // Save before clicking because a form submit can reload the document.
            sessionStorage.setItem(key, JSON.stringify({ count: state.count + 1, time: Date.now() }))
        } catch {
            blocked.add(key)
            console.warn(`Auto Login: ${service} stopped because the retry counter is unavailable.`)
            return
        }
        callback()
    }

    setInterval(() => {
        const service = detect()
        if (!service) return

        if (service === "minio") {
            const ack = first(["#acknowledge-confirm"])
            if (enabled(ack)) {
                attempt(service, "acknowledge", () => ack.click())
                return
            }
        }
        if (service === "grafana") {
            const text = document.body?.innerText || ""
            const setup = /\/profile\/password/i.test(location.pathname) ||
                /change your password|update your password/i.test(text) ||
                /new password/i.test(text) && /confirm password/i.test(text)
            if (setup) {
                const skip = buttonByText(/^skip(?: for now)?$/i)
                if (skip) attempt(service, "skip-password", () => skip.click())
                return
            }
        }

        const fields = loginFields(service)
        if (!fields) return
        const { user, password, submit } = fields
        if (![user, password, submit].every(enabled) || user.readOnly || password.readOnly) return
        attempt(service, "login", () => {
            const [username, secret] = CREDENTIALS[service]
            if (setValue(user, username) && setValue(password, secret) && enabled(submit)) submit.click()
        })
    }, 200)
})()
