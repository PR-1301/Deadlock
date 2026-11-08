/*
  Crack the Code question bank.

  Players never see the title: they only see visible test cases (input -> output)
  and must reverse-engineer the logic. Every question uses the same function name
  (`decodeLogic`) so the starter code does not give the problem away.

  Supported param / return types: "int", "int[]".
  `args` must be in the same order as `params`.
  Hidden test cases never leave the server.
*/

const FUNCTION_NAME = "decodeLogic";

const QUESTIONS = [
  {
    id: "two-sum-ii",
    title: "Two Sum II - Input Array Is Sorted",
    params: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ],
    returnType: "int[]",
    testCases: [
      { args: [[2, 7, 11, 15], 9], output: [1, 2] },
      { args: [[2, 3, 4], 6], output: [1, 3] },
      { args: [[-1, 0], -1], output: [1, 2] },
    ],
    hiddenTestCases: [
      { args: [[1, 2, 3, 4, 4, 9, 56, 90], 8], output: [4, 5] },
      { args: [[-10, -3, 0, 5, 9, 14], 4], output: [1, 6] },
      { args: [[5, 25, 75], 100], output: [2, 3] },
    ],
  },
  {
    id: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    testCases: [
      { args: [[7, 1, 5, 3, 6, 4]], output: 5 },
      { args: [[7, 6, 4, 3, 1]], output: 0 },
      { args: [[2, 4, 1]], output: 2 },
    ],
    hiddenTestCases: [
      { args: [[3, 2, 6, 5, 0, 3]], output: 4 },
      { args: [[1]], output: 0 },
      { args: [[2, 1, 2, 1, 0, 1, 2]], output: 2 },
    ],
  },
  {
    id: "majority-element",
    title: "Majority Element",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    testCases: [
      { args: [[3, 2, 3]], output: 3 },
      { args: [[2, 2, 1, 1, 1, 2, 2]], output: 2 },
      { args: [[1, 4, 4, 4, 1]], output: 4 },
    ],
    hiddenTestCases: [
      { args: [[1]], output: 1 },
      { args: [[6, 5, 5]], output: 5 },
      { args: [[-1, -1, -1, 4, 4]], output: -1 },
      { args: [[8, 8, 7, 7, 7, 8, 8, 7, 8]], output: 8 },
    ],
  },
];

const DEFAULT_QUESTION_ID = QUESTIONS[0].id;

const getQuestionById = (id) => QUESTIONS.find((q) => q.id === id) || null;

// --- Starter code generation -------------------------------------------------

const CPP_TYPES = { int: "int", "int[]": "vector<int>" };
const JAVA_TYPES = { int: "int", "int[]": "int[]" };
const CPP_DEFAULT_RETURN = { int: "0", "int[]": "{}" };
const JAVA_DEFAULT_RETURN = { int: "0", "int[]": "new int[0]" };

const buildStarterCode = (question) => {
  const names = question.params.map((p) => p.name).join(", ");
  const cppParams = question.params
    .map((p) => (p.type === "int[]" ? `vector<int>& ${p.name}` : `int ${p.name}`))
    .join(", ");
  const javaParams = question.params.map((p) => `${JAVA_TYPES[p.type]} ${p.name}`).join(", ");

  return {
    python: `# Write your Python code here
def ${FUNCTION_NAME}(${names}):
    # Implement your logic here
    pass
`,
    cpp: `// Write your C++ code here
#include <iostream>
#include <vector>
using namespace std;

class Solution {
public:
    ${CPP_TYPES[question.returnType]} ${FUNCTION_NAME}(${cppParams}) {
        // Implement your logic here
        return ${CPP_DEFAULT_RETURN[question.returnType]};
    }
};
`,
    javascript: `// Write your JavaScript code here
function ${FUNCTION_NAME}(${names}) {
    // Implement your logic here
}
`,
    java: `// Write your Java code here
import java.util.*;

class Solution {
    public ${JAVA_TYPES[question.returnType]} ${FUNCTION_NAME}(${javaParams}) {
        // Implement your logic here
        return ${JAVA_DEFAULT_RETURN[question.returnType]};
    }
}
`,
  };
};

const formatInput = (question, args) =>
  question.params.map((p, i) => `${p.name} = ${JSON.stringify(args[i])}`).join(", ");

// Payload safe to send to players: no title, no hidden test cases.
const toPublicQuestion = (question) => ({
  functionName: FUNCTION_NAME,
  starterCode: buildStarterCode(question),
  testCases: question.testCases.map((tc) => ({
    input: formatInput(question, tc.args),
    output: JSON.stringify(tc.output),
  })),
  hiddenCount: question.hiddenTestCases.length,
});

// Summary for the admin panel (no test data).
const toAdminSummary = (question) => ({
  id: question.id,
  title: question.title,
  visibleCount: question.testCases.length,
  hiddenCount: question.hiddenTestCases.length,
});

module.exports = {
  FUNCTION_NAME,
  QUESTIONS,
  DEFAULT_QUESTION_ID,
  getQuestionById,
  toPublicQuestion,
  toAdminSummary,
};
