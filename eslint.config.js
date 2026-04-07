import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                document: "readonly",
                window: "readonly",
                navigator: "readonly",
                location: "readonly",
                URLSearchParams: "readonly",
                console: "readonly",
                fetch: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                Map: "readonly",
                Set: "readonly",
                Promise: "readonly",
                IntersectionObserver: "readonly",
                L: "readonly",
                bootstrap: "readonly",
                IMask: "readonly",
                API_BASE: "writable",
                API_ERROR_MSG: "writable",
                httpFetch: "writable",
                matchStatus: "writable",
                showToast: "writable",
                showApiErrorToast: "writable",
                getDirectionsURL: "writable",
                isIOS: "writable",
            },
        },
    },
];
