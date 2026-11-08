const { runCode } = require('./piston');

/**
 * Wraps user code into a driver script for verification.
 */
const wrapCode = ({ language, code, functionName, parameters }) => {
    // Python and JS are dynamic, so they handle polymorphic inputs gracefully.
    // We only need strict generation for C++ and Java.

    if (language === 'python') {
        return `
import json
import sys
from typing import *

${code}

if __name__ == "__main__":
    sol = Solution()
    try:
        input_data = sys.stdin.read().strip()
        if "|" in input_data:
            parts = [json.loads(p.strip().replace("'", '"')) for p in input_data.split("|")]
        else:
            parts = [json.loads(input_data.replace("'", '"'))] if input_data else []
            
        result = sol.${functionName}(*parts)
        
        if isinstance(result, bool):
            print(json.dumps(result).lower())
        else:
            print(json.dumps(result, separators=(',', ':')))
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
`;
    }

    if (language === 'js' || language === 'javascript') {
        const lang = 'javascript';
        return `
const fs = require('fs');

${code}

(function() {
    try {
        const sol = new Solution();
        const inputData = fs.readFileSync(0, 'utf8').trim();
        let parts = [];
        const cleanInput = inputData.replace(/'/g, '"');
        if (cleanInput.includes('|')) {
            parts = cleanInput.split('|').map(p => JSON.parse(p.trim()));
        } else if (cleanInput) {
            parts = [JSON.parse(cleanInput)];
        }
        
        const result = sol.${functionName}(...parts);
        console.log(JSON.stringify(result));
    } catch (e) {
        process.stderr.write(e.message);
        process.exit(1);
    }
})();
`;
    }

    // --- STATIC TYPED LANGUAGES ---

    // Helper to determine call signature
    const getCallLogic = (lang, params) => {
        // params example: "int n" or "string s" or "int a, int b"
        // If params isn't provided (legacy), default to empty string
        const pList = params ? params.split(',').map(p => p.trim()) : [];

        // C++ Generation
        if (lang === 'cpp') {
            let preparations = "";
            let args = [];

            pList.forEach((p, idx) => {
                const varName = `arg${idx}`;
                if (p.startsWith("int ") || p === "int") {
                    preparations += `        int ${varName} = stoi(parts[${idx}]);\n`;
                    args.push(varName);
                } else if (p.startsWith("string ") || p.includes("string")) {
                    // Remove surrounding quotes from input part if present
                    preparations += `        string ${varName} = parts[${idx}];\n`;
                    preparations += `        if (${varName}.size() >= 2 && ${varName}.front() == '"' && ${varName}.back() == '"') {\n`;
                    preparations += `            ${varName} = ${varName}.substr(1, ${varName}.size() - 2);\n`;
                    preparations += `        }\n`;
                    args.push(varName);
                } else if (p.includes("vector") && p.includes("int")) {
                    // Basic vector<int> parsing: "[1,2,3]" -> vector
                    preparations += `        vector<int> ${varName};\n`;
                    preparations += `        string raw${idx} = parts[${idx}];\n`;
                    preparations += `        if (raw${idx}.size() >= 2 && raw${idx}.front() == '[' && raw${idx}.back() == ']') raw${idx} = raw${idx}.substr(1, raw${idx}.size() - 2);\n`;
                    preparations += `        stringstream ss${idx}(raw${idx});\n`;
                    preparations += `        string segment${idx};\n`;
                    preparations += `        while(getline(ss${idx}, segment${idx}, ',')) { if(!segment${idx}.empty()) ${varName}.push_back(stoi(segment${idx})); }\n`;
                    args.push(varName);
                }
                // Add more types as needed (char, etc)
                else if (p.startsWith("char ")) {
                    preparations += `        char ${varName} = parts[${idx}][1];\n`; // "'a'" -> 'a'
                    args.push(varName);
                }
                else {
                    // Fallback for unknown types - ensure code compiles by guessing int? No, safer to skip or defaulting.
                    // But for now, let's assume valid seeder data.
                }
            });

            return {
                prep: preparations,
                call: `sol.${functionName}(${args.join(', ')})`
            };
        }

        // Java Generation
        if (lang === 'java') {
            let preparations = "";
            let args = [];

            pList.forEach((p, idx) => {
                const varName = `arg${idx}`;
                if (p.startsWith("int ") || p === "int") {
                    preparations += `            int ${varName} = Integer.parseInt(parts[${idx}].trim());\n`;
                    args.push(varName);
                } else if (p.startsWith("String ") || p.includes("String")) {
                    preparations += `            String ${varName} = parts[${idx}];\n`;
                    preparations += `            if (${varName}.length() >= 2 && ${varName}.startsWith("\\"") && ${varName}.endsWith("\\"")) {\n`;
                    preparations += `                ${varName} = ${varName}.substring(1, ${varName}.length() - 1);\n`;
                    preparations += `            }\n`;
                    args.push(varName);
                } else if (p.includes("int[]")) {
                    // Basic int[] parsing: "[1,2,3]"
                    preparations += `            String raw${idx} = parts[${idx}].trim();\n`;
                    preparations += `            if (raw${idx}.startsWith("[") && raw${idx}.endsWith("]")) raw${idx} = raw${idx}.substring(1, raw${idx}.length() - 1);\n`;
                    preparations += `            String[] spl${idx} = raw${idx}.length() > 0 ? raw${idx}.split(",") : new String[0];\n`;
                    preparations += `            int[] ${varName} = new int[spl${idx}.length];\n`;
                    preparations += `            for(int i=0; i<spl${idx}.length; i++) ${varName}[i] = Integer.parseInt(spl${idx}[i].trim());\n`;
                    args.push(varName);
                }
                else if (p.startsWith("char ")) {
                    preparations += `            char ${varName} = parts[${idx}].charAt(1);\n`;
                    args.push(varName);
                }
            });
            return {
                prep: preparations,
                call: `sol.${functionName}(${args.join(', ')})`
            };
        }

        return { prep: "", call: "" };
    };

    if (language === 'cpp') {
        const { prep, call } = getCallLogic('cpp', parameters['cpp']);
        return `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <sstream>

using namespace std;

// Helper to print vectors
template<typename T>
ostream& operator<<(ostream& os, const vector<T>& v) {
    os << "[";
    for (size_t i = 0; i < v.size(); ++i) {
        os << v[i];
        if (i != v.size() - 1) os << ",";
    }
    os << "]";
    return os;
}

// Helper to print vector of strings (with quotes)
ostream& operator<<(ostream& os, const vector<string>& v) {
    os << "[";
    for (size_t i = 0; i < v.size(); ++i) {
        os << "\\"" << v[i] << "\\"";
        if (i != v.size() - 1) os << ",";
    }
    os << "]";
    return os;
}

${code}

int main() {
    Solution sol;
    string inputData;
    if (!getline(cin, inputData)) inputData = "";
    
    stringstream ss(inputData);
    string segment;
    vector<string> parts;
    
    if (inputData.find('|') != string::npos) {
        while(getline(ss, segment, '|')) parts.push_back(segment);
    } else if (!inputData.empty()) {
        parts.push_back(inputData);
    }

    try {
${prep}
        cout << boolalpha << ${call} << endl;
    } catch (exception& e) {
        cerr << e.what() << endl;
        return 1;
    }

    return 0;
}
`;
    }

    if (language === 'java') {
        const { prep, call } = getCallLogic('java', parameters['java']);
        // Java requires imports before any class, so hoist the user's imports above Main.
        const lines = code.split('\n');
        const userImports = lines.filter(l => l.trim().startsWith('import ')).join('\n');
        const userBody = lines
            .filter(l => !l.trim().startsWith('import ') && !l.trim().startsWith('package '))
            .join('\n');
        // Main must NOT be public: Wandbox saves the source as prog.java, and a public
        // class has to match the file name. The first class in the file is the entry point.
        return `
${userImports}
import java.util.*;
import java.util.stream.*;

class Main {
    // Helper to print arrays/lists recursively
    public static void printResult(Object obj) {
        if (obj == null) {
            System.out.println("null");
        } else if (obj instanceof int[]) {
            System.out.println(Arrays.toString((int[]) obj));
        } else if (obj instanceof String[]) {
            System.out.print("[");
            String[] arr = (String[]) obj;
            for (int i = 0; i < arr.length; i++) {
                System.out.print("\\"" + arr[i] + "\\"");
                if (i < arr.length - 1) System.out.print(",");
            }
            System.out.println("]");
        } else if (obj instanceof Object[]) {
            System.out.println(Arrays.deepToString((Object[]) obj));
        } else if (obj instanceof List) {
            System.out.println(obj.toString());
        } else {
            System.out.println(obj);
        }
    }

    public static void main(String[] args) {
        try {
            Solution sol = new Solution();
            Scanner sc = new Scanner(System.in);
            if (!sc.hasNextLine()) return;
            String inputData = sc.nextLine().trim();
            
            String[] parts;
            if (inputData.contains("|")) {
                parts = inputData.split("\\\\|");
            } else {
                parts = new String[]{inputData};
            }

${prep}
            printResult(${call});
            
        } catch (Exception e) {
            System.err.println(e.getMessage());
            System.exit(1);
        }
    }
}

${userBody}
`;
    }

    return code;
};

/**
 * Executes code against a test case and returns the result.
 */
exports.validateSubmission = async ({ language, code, question, testCase }) => {
    // Ensure parameters are passed; if legacy call without params in question object, fallback might break for C++/Java
    // But since this is specific to Deadlock, question object typically has parameters.
    const fullCode = wrapCode({
        language,
        code,
        functionName: question.functionName,
        parameters: question.parameters || {}
    });

    const result = await runCode({
        language,
        code: fullCode,
        input: testCase.input
    });

    // Check for non-zero exit code as the primary indicator of Runtime Error
    if (result.run.code !== 0) {
        return { success: false, verdict: "RUNTIME_ERROR", error: result.run.stderr.trim() || "Runtime Error" };
    }

    let output = result.run.stdout.trim();
    let expected = testCase.output.trim();

    if (output.toLowerCase() === "true") output = "true";
    if (output.toLowerCase() === "false") output = "false";
    if (expected.toLowerCase() === "true") expected = "true";
    if (expected.toLowerCase() === "false") expected = "false";

    if (output.startsWith('[') || output.startsWith('{')) {
        try {
            output = JSON.stringify(JSON.parse(output.replace(/'/g, '"')));
        } catch (e) { }
    }
    if (expected.startsWith('[') || expected.startsWith('{')) {
        try {
            expected = JSON.stringify(JSON.parse(expected.replace(/'/g, '"')));
        } catch (e) { }
    }

    // Special handling for strings: if output is quoted like "value" but expected is value
    if (output.startsWith('"') && output.endsWith('"') && !expected.startsWith('"')) {
        output = output.slice(1, -1);
    }

    if (output === expected) {
        return { success: true, verdict: "AC" };
    } else {
        return { success: false, verdict: "WRONG_ANSWER", actual: output, expected: expected };
    }
};
