import React from 'react';

// Format input and output into clean code syntax: e.g. "l = 10, w = 5 -> 30"
const formatExampleIo = (rawInput, rawOutput, question) => {
    if (!rawInput && !rawOutput) return null;

    const inputClean = (rawInput || '').trim();
    const outputClean = (rawOutput || '').trim();

    // Try extracting param names from parameters or templates
    let paramNames = [];
    const paramStr = question?.parameters?.python || question?.parameters?.cpp || question?.parameters?.java || '';
    if (paramStr) {
        paramNames = paramStr
            .split(',')
            .map(p => p.trim().split(/\s+/).pop().replace(/[*&]/g, ''))
            .filter(Boolean);
    }

    if (paramNames.length === 0 && question?.templates?.python) {
        const match = question.templates.python.match(/def\s+\w+\s*\(([^)]+)\)/);
        if (match) {
            paramNames = match[1]
                .split(',')
                .map(p => p.trim())
                .filter(p => p && p !== 'self');
        }
    }

    // Split input tokens by '|' or whitespace
    const tokens = inputClean.includes('|')
        ? inputClean.split('|').map(s => s.trim())
        : inputClean.includes('\n')
        ? inputClean.split('\n').map(s => s.trim()).filter(Boolean)
        : inputClean.split(/\s+/);

    let formattedInput = '';
    if (paramNames.length > 0 && paramNames.length === tokens.length) {
        formattedInput = paramNames.map((name, i) => `${name} = ${tokens[i]}`).join(', ');
    } else if (tokens.length > 1) {
        formattedInput = tokens.join(', ');
    } else {
        formattedInput = inputClean;
    }

    return {
        formattedInput,
        formattedOutput: outputClean
    };
};

const QuestionPanel = ({ question }) => {
    if (!question) {
        return (
            <div className="clean-question-panel">
                <div className="panel-empty-state">
                    <span className="empty-dot" />
                    <span>Loading problem...</span>
                </div>
            </div>
        );
    }

    const firstVisibleCase = question.testCases?.find(t => !t.isHidden);
    const example = firstVisibleCase ? formatExampleIo(firstVisibleCase.input, firstVisibleCase.output, question) : null;

    const difficulty = (question.difficulty || 'medium').toLowerCase();

    return (
        <div className="clean-question-panel">
            {/* Top Row: Difficulty Tag */}
            <div className="question-meta-row">
                <span className={`difficulty-pill ${difficulty}`}>
                    {difficulty.toUpperCase()}
                </span>
                {question.category && (
                    <span className="category-pill">{question.category}</span>
                )}
            </div>

            {/* Bigger, clean problem title */}
            <h1 className="clean-problem-title">{question.title}</h1>

            {/* Scrollable Problem Body */}
            <div className="clean-problem-scroll">
                {/* Readable Description */}
                <div className="clean-problem-desc">
                    {question.description}
                </div>

                {/* Example shown as a real code block */}
                {example && (
                    <div className="code-example-block">
                        <div className="example-header-label">Example 1</div>
                        <pre className="example-code-pre">
                            <code>
                                <span className="kw">Input:  </span>
                                <span className="val">{example.formattedInput}</span>
                                {'\n'}
                                <span className="kw">Output: </span>
                                <span className="val-out">{example.formattedOutput}</span>
                            </code>
                        </pre>
                    </div>
                )}

                {/* Constraints as a simple list with no box */}
                <div className="constraints-section">
                    <h3 className="constraints-heading">Constraints</h3>
                    <ul className="constraints-simple-list">
                        <li>Implement the declared class and method signature.</li>
                        <li>Return values directly from the function.</li>
                        <li>Solution must pass all hidden test evaluations within time limits.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default QuestionPanel;
