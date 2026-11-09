import React from 'react';

const ResultOverlay = React.memo(({ result, onClose }) => {
    React.useEffect(() => {
        if (result && result.verdict !== 'AC') {
            const timer = setTimeout(() => {
                onClose();
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [result?.verdict, onClose]);

    // Removed the "AURA SURGED" pop up on success - floating +1 AURA and rope momentum handle feedback
    if (!result || result.verdict === 'AC') return null;

    const isConflict = result.verdict === 'CONFLICT';
    const isFailure = !isConflict;

    return (
        <div className="result-overlay-backdrop" onClick={onClose}>
            <div
                className={`result-card ${isConflict ? 'verdict-CONFLICT' : 'verdict-FAIL'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {isConflict && (
                    <>
                        <div className="verdict-headline conflict" data-text="TOO SLOW!">
                            TOO SLOW!
                        </div>
                        <div className="verdict-subtext conflict">
                            &gt; OPPONENT SOLVED FIRST // RELOADING NEW PROBLEM
                        </div>
                    </>
                )}

                {isFailure && (
                    <>
                        <div className="verdict-headline fail" data-text="TESTS FAILED">
                            TESTS FAILED
                        </div>
                        <div className="verdict-subtext fail">
                            &gt; EVALUATION FAILED // LOCK IN AND TRY AGAIN
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});

export default ResultOverlay;
