import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                document: "readonly",
                window: "readonly",
                navigator: "readonly",
                URLSearchParams: "readonly",
                console: "readonly",
                fetch: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                Map: "readonly",
                Set: "readonly",
                Promise: "readonly",
                L: "readonly",
                bootstrap: "readonly",
                IMask: "readonly",
                API_BASE: "readonly",
                API_ERROR_MSG: "readonly",
                httpFetch: "readonly",
                matchStatus: "readonly",
                showToast: "readonly",
                showApiErrorToast: "readonly",
                getDirectionsURL: "readonly",
                isIOS: "readonly",
            },
        },
    },
];
