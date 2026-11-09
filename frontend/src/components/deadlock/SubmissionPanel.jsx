import React from 'react';

const SubmissionPanel = ({ onSubmit, isSubmitting }) => {
    return (
        <div className="clean-submission-bar">
            <div className="submission-hint">
                <span>Press</span> <kbd className="shortcut-key">Ctrl</kbd> + <kbd className="shortcut-key">↵</kbd> <span>to submit</span>
            </div>
            <button
                className={`clean-submit-btn ${isSubmitting ? 'submitting' : ''}`}
                onClick={onSubmit}
                disabled={isSubmitting}
                aria-label="Submit solution (Ctrl+Enter)"
            >
                {isSubmitting ? (
                    <>
                        <span className="submit-spinner" />
                        <span>Evaluating...</span>
                    </>
                ) : (
                    <span>Submit Solution</span>
                )}
            </button>
        </div>
    );
};

export default SubmissionPanel;
