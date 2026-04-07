import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
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
                IntersectionObserver: "readonly",
                L: "readonly",
                bootstrap: "readonly",
                IMask: "readonly",
            },
        },
    },
];
