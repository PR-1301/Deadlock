const axios = require("axios");
const ThrottleQueue = require("./throttleQueue");

const WANDBOX_URL = "https://wandbox.org/api/compile.json";
const wandboxQueue = new ThrottleQueue(2); // 2 requests per second for public Wandbox
const pistonQueue = new ThrottleQueue(8);  // Higher throughput for local/self-hosted Piston
const REQUEST_TIMEOUT_MS = 15000;
const TRANSIENT_RETRIES = 3;

const wandboxLanguageMap = {
    python: "cpython-3.10.15",
    js: "nodejs-18.20.4",
    javascript: "nodejs-18.20.4",
    java: "openjdk-jdk-21+35",
    cpp: "gcc-11.4.0",
    "c++": "gcc-11.4.0"
};

const pistonLanguageMap = {
    python: { language: "python", fileName: "main.py" },
    js: { language: "javascript", fileName: "main.js" },
    javascript: { language: "javascript", fileName: "main.js" },
    java: { language: "java", fileName: "Main.java" },
    cpp: { language: "c++", fileName: "main.cpp" },
    "c++": { language: "c++", fileName: "main.cpp" }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isOciContainerError = (stderr = "") =>
    /OCI runtime error|crun:\s*clone|Resource temporarily unavailable/i.test(stderr);

const isRetryableHttpError = (err) => {
    const status = err?.response?.status;
    return status === 429 || status === 502 || status === 503 || status === 504 || err?.code === "ECONNABORTED";
};

const resolvePistonExecuteUrl = (rawUrl) => {
    const trimmed = String(rawUrl || "").trim().replace(/\/+$/, "");
    if (!trimmed) return "";
    if (trimmed.endsWith("/api/v2/execute") || trimmed.endsWith("/execute")) return trimmed;
    return `${trimmed}/api/v2/execute`;
};

const normalizeWandboxResponse = (data = {}) => ({
    run: {
        stdout: data.program_output || "",
        stderr: (data.program_error || "") + (data.compiler_error || ""),
        code: parseInt(data.status, 10) || 0
    }
});

const normalizePistonResponse = (data = {}) => {
    const compile = data.compile;
    if (compile && compile.code !== 0) {
        return {
            run: {
                stdout: compile.stdout || "",
                stderr: compile.stderr || compile.output || "Compilation failed",
                code: Number.isInteger(compile.code) ? compile.code : (parseInt(compile.code, 10) || 1)
            }
        };
    }

    const run = data.run || {};
    return {
        run: {
            stdout: run.stdout || "",
            stderr: run.stderr || "",
            code: Number.isInteger(run.code) ? run.code : (parseInt(run.code, 10) || 0)
        }
    };
};

const runViaPiston = async ({ executeUrl, language, code, input }) => {
    const spec = pistonLanguageMap[language];
    if (!spec) {
        throw new Error("Unsupported language");
    }

    const response = await pistonQueue.add(() =>
        axios.post(
            executeUrl,
            {
                language: spec.language,
                version: "*",
                files: [{ name: spec.fileName, content: code }],
                stdin: input || ""
            },
            { timeout: REQUEST_TIMEOUT_MS }
        )
    );

    return normalizePistonResponse(response.data);
};

const runViaWandbox = async ({ language, code, input }) => {
    const compiler = wandboxLanguageMap[language];

    if (!compiler) {
        throw new Error("Unsupported language");
    }

    for (let attempt = 0; ; attempt++) {
        try {
            // Queue only the outbound HTTP call so backoff sleeps do not block other requests
            const response = await wandboxQueue.add(() =>
                axios.post(
                    WANDBOX_URL,
                    {
                        compiler,
                        code,
                        stdin: input,
                        save: false
                    },
                    { timeout: REQUEST_TIMEOUT_MS }
                )
            );

            const normalized = normalizeWandboxResponse(response.data);
            if (isOciContainerError(normalized.run.stderr) && attempt < TRANSIENT_RETRIES) {
                await sleep(800 * 2 ** attempt + Math.random() * 400);
                continue;
            }

            return normalized;
        } catch (err) {
            if (!isRetryableHttpError(err) || attempt >= TRANSIENT_RETRIES) {
                throw err;
            }
            await sleep(900 * 2 ** attempt + Math.random() * 450);
        }
    }
};

exports.isOciContainerError = isOciContainerError;

exports.runCode = async ({ language, code, input }) => {
    if (!pistonLanguageMap[language] && !wandboxLanguageMap[language]) {
        throw new Error("Unsupported language");
    }

    const pistonExecuteUrl = resolvePistonExecuteUrl(process.env.PISTON_URL);
    if (pistonExecuteUrl) {
        try {
            return await runViaPiston({ executeUrl: pistonExecuteUrl, language, code, input });
        } catch (err) {
            const detail = err?.response?.status
                ? `HTTP ${err.response.status}`
                : (err?.code || err?.message || "unknown error");
            console.warn(`[RUNNER] Piston (${pistonExecuteUrl}) failed (${detail}); falling back to Wandbox.`);
        }
    }

    return runViaWandbox({ language, code, input });
};
