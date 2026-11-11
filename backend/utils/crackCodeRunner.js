const crypto = require("crypto");
const { runCode, isOciContainerError } = require("./piston");
const { FUNCTION_NAME } = require("../config/crackCodeQuestions");

const SUPPORTED_LANGUAGES = ["python", "javascript", "cpp", "java"];

/*
  All test cases of a batch run inside ONE program execution.
  The driver prints a marker line before and after each call:

      <nonce>|B|<i>      begin case i (anything until the next marker is the user's log)
      <nonce>|R|<i>      the next line is the return value of case i
      <nonce>|E|<i>      the next lines are the exception raised by case i

  The nonce is random per run so user output cannot be mistaken for a marker.
*/

// --- stdin encoding ----------------------------------------------------------

// Python / JS read JSON: [[arg0, arg1, ...], ...]
const jsonStdin = (cases) => JSON.stringify(cases.map((c) => c.args));

// C++ / Java read whitespace separated tokens:
//   T, then for each case each param: int -> "x", int[] -> "n a1 ... an"
const tokenStdin = (question, cases) => {
  const lines = [String(cases.length)];
  for (const c of cases) {
    question.params.forEach((p, i) => {
      const v = c.args[i];
      lines.push(p.type === "int[]" ? [v.length, ...v].join(" ") : String(v));
    });
  }
  return lines.join("\n") + "\n";
};

// --- drivers -----------------------------------------------------------------

const pythonDriver = (code, nonce) => `from typing import *

${code}

import sys as __cc_sys, json as __cc_json
if __name__ == "__main__":
    __cc_cases = __cc_json.loads(__cc_sys.stdin.read())
    for __cc_i, __cc_args in enumerate(__cc_cases):
        print("\\n${nonce}|B|" + str(__cc_i), flush=True)
        try:
            __cc_ret = ${FUNCTION_NAME}(*__cc_args)
            __cc_out = __cc_json.dumps(__cc_ret, separators=(",", ":"))
            print("\\n${nonce}|R|" + str(__cc_i))
            print(__cc_out, flush=True)
        except Exception as __cc_e:
            print("\\n${nonce}|E|" + str(__cc_i))
            print(type(__cc_e).__name__ + ": " + str(__cc_e), flush=True)
`;

const jsDriver = (code, nonce) => `${code}

;(() => {
    const __ccCases = JSON.parse(require("fs").readFileSync(0, "utf-8"));
    __ccCases.forEach((__ccArgs, __ccI) => {
        console.log("\\n${nonce}|B|" + __ccI);
        try {
            const __ccRet = ${FUNCTION_NAME}(...__ccArgs);
            console.log("\\n${nonce}|R|" + __ccI);
            console.log(__ccRet === undefined ? "undefined" : JSON.stringify(__ccRet));
        } catch (__ccE) {
            console.log("\\n${nonce}|E|" + __ccI);
            console.log(String((__ccE && __ccE.message) || __ccE));
        }
    });
})();
`;

const cppDriver = (code, nonce, question) => {
  const reads = question.params
    .map((p, i) =>
      p.type === "int[]"
        ? `            vector<int> cc_drv_a${i}; { int n; cin >> n; cc_drv_a${i}.resize(n); for (auto& x : cc_drv_a${i}) cin >> x; }`
        : `            int cc_drv_a${i}; cin >> cc_drv_a${i};`
    )
    .join("\n");
  const args = question.params.map((_, i) => `cc_drv_a${i}`).join(", ");

  return `#include <bits/stdc++.h>
using namespace std;

${code}

template <typename T> void cc_drv_print(const T& v) { cout << v; }
template <typename T> void cc_drv_print(const vector<T>& v) {
    cout << "[";
    for (size_t i = 0; i < v.size(); ++i) { if (i) cout << ","; cout << v[i]; }
    cout << "]";
}

int main() {
    int cc_drv_t;
    if (!(cin >> cc_drv_t)) return 0;
    for (int cc_drv_i = 0; cc_drv_i < cc_drv_t; ++cc_drv_i) {
${reads}
        cout << "\\n${nonce}|B|" << cc_drv_i << endl;
        try {
            Solution cc_drv_s;
            auto cc_drv_r = cc_drv_s.${FUNCTION_NAME}(${args});
            cout << "\\n${nonce}|R|" << cc_drv_i << "\\n";
            cc_drv_print(cc_drv_r);
            cout << endl;
        } catch (const exception& e) {
            cout << "\\n${nonce}|E|" << cc_drv_i << "\\n" << e.what() << endl;
        } catch (...) {
            cout << "\\n${nonce}|E|" << cc_drv_i << "\\nUnknown exception" << endl;
        }
    }
    return 0;
}
`;
};

const javaDriver = (code, nonce, question) => {
  const lines = code.split("\n");
  const imports = lines.filter((l) => l.trim().startsWith("import ")).join("\n");
  const body = lines
    .filter((l) => !l.trim().startsWith("import ") && !l.trim().startsWith("package "))
    .join("\n");

  const reads = question.params
    .map((p, i) =>
      p.type === "int[]"
        ? `            int[] cc_drv_a${i} = new int[cc_drv_sc.nextInt()]; for (int k = 0; k < cc_drv_a${i}.length; k++) cc_drv_a${i}[k] = cc_drv_sc.nextInt();`
        : `            int cc_drv_a${i} = cc_drv_sc.nextInt();`
    )
    .join("\n");
  const args = question.params.map((_, i) => `cc_drv_a${i}`).join(", ");

  return `${imports}
import java.util.*;

// Not public: Wandbox saves the source as prog.java, and the first class is the entry point.
class Main {
    static String cc_drv_fmt(Object o) {
        if (o instanceof int[]) return Arrays.toString((int[]) o);
        if (o instanceof long[]) return Arrays.toString((long[]) o);
        if (o instanceof Object[]) return Arrays.deepToString((Object[]) o);
        return String.valueOf(o);
    }

    public static void main(String[] cc_drv_argv) {
        Scanner cc_drv_sc = new Scanner(System.in);
        int cc_drv_t = cc_drv_sc.nextInt();
        for (int cc_drv_i = 0; cc_drv_i < cc_drv_t; cc_drv_i++) {
${reads}
            System.out.println();
            System.out.println("${nonce}|B|" + cc_drv_i);
            try {
                Object cc_drv_r = new Solution().${FUNCTION_NAME}(${args});
                System.out.println();
                System.out.println("${nonce}|R|" + cc_drv_i);
                System.out.println(cc_drv_fmt(cc_drv_r));
            } catch (Throwable e) {
                System.out.println();
                System.out.println("${nonce}|E|" + cc_drv_i);
                System.out.println(e.toString());
            }
            System.out.flush();
        }
    }
}

${body}
`;
};

const buildProgram = ({ language, code, question, cases, nonce }) => {
  switch (language) {
    case "python":
      return { source: pythonDriver(code, nonce), stdin: jsonStdin(cases) };
    case "javascript":
      return { source: jsDriver(code, nonce), stdin: jsonStdin(cases) };
    case "cpp":
      return { source: cppDriver(code, nonce, question), stdin: tokenStdin(question, cases) };
    case "java":
      return { source: javaDriver(code, nonce, question), stdin: tokenStdin(question, cases) };
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
};

// --- output parsing ----------------------------------------------------------

const parseOutput = (stdout, nonce, count) => {
  const markerRe = new RegExp(`^${nonce}\\|([BRE])\\|(\\d+)$`, "gm");
  const markers = [...stdout.matchAll(markerRe)].map((m) => ({
    kind: m[1],
    idx: Number(m[2]),
    start: m.index,
    end: m.index + m[0].length,
  }));

  const cases = Array.from({ length: count }, () => ({ log: "", status: "missing", value: "" }));

  markers.forEach((m, n) => {
    if (m.idx >= count) return;
    const segment = stdout.slice(m.end, n + 1 < markers.length ? markers[n + 1].start : stdout.length).trim();
    if (m.kind === "B") cases[m.idx].log = segment;
    if (m.kind === "R") Object.assign(cases[m.idx], { status: "ok", value: segment.split("\n")[0].trim() });
    if (m.kind === "E") Object.assign(cases[m.idx], { status: "error", value: segment });
  });

  // Text printed before the first marker (rare) - prepend to first case log.
  const preamble = (markers.length ? stdout.slice(0, markers[0].start) : stdout).trim();
  return { cases, preamble };
};

const normalize = (s) => String(s).replace(/\s+/g, "");

// Retries are handled inside piston.js; map exhausted rate/container limits to EXECUTOR_BUSY.
const executeWithBusyHandling = async (payload) => {
  try {
    const exec = await runCode(payload);
    const stderr = (exec.run.stderr || "").trim();
    if (isOciContainerError(stderr)) {
      const busyErr = new Error(stderr);
      busyErr.code = "EXECUTOR_BUSY";
      throw busyErr;
    }
    return exec;
  } catch (err) {
    const status = err.response && err.response.status;
    if (status === 429 || status === 502 || status === 503 || status === 504) {
      err.code = "EXECUTOR_BUSY";
    }
    throw err;
  }
};

/**
 * Runs `cases` against the user's code in a single execution.
 * Returns one result per case: { isCorrect, result, log }.
 */
const runCases = async ({ language, code, question, cases }) => {
  const nonce = `CC${crypto.randomBytes(8).toString("hex")}`;
  const { source, stdin } = buildProgram({ language, code, question, cases, nonce });

  const exec = await executeWithBusyHandling({ language, code: source, input: stdin });
  const stdout = exec.run.stdout || "";
  const stderr = (exec.run.stderr || "").trim();

  const { cases: parsed, preamble } = parseOutput(stdout, nonce, cases.length);

  return parsed.map((p, i) => {
    const expected = JSON.stringify(cases[i].output);
    let log = i === 0 && preamble ? `${preamble}\n${p.log}`.trim() : p.log;

    if (p.status === "ok") {
      return { isCorrect: normalize(p.value) === normalize(expected), result: p.value, log };
    }
    if (p.status === "error") {
      return { isCorrect: false, result: "Runtime Error", log: [log, p.value].filter(Boolean).join("\n") };
    }
    // No result: compile error, crash, timeout, or a previous case killed the process.
    log = [log, stderr || "Program terminated before producing a result."].filter(Boolean).join("\n");
    return { isCorrect: false, result: "Error", log };
  });
};

const hashSubmission = (language, code) =>
  crypto.createHash("sha256").update(`${language}\n${code}`).digest("hex");

module.exports = {
  SUPPORTED_LANGUAGES,
  runCases,
  hashSubmission,
  // exported for tests
  buildProgram,
  parseOutput,
};
