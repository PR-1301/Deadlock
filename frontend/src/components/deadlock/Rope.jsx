import React from 'react';

const Rope = ({ offsetVw, safeTug }) => {
    return (
        <div
            className="hero-rope-assembly"
            style={{
                transform: `translate(calc(-50% + ${offsetVw}vw), -50%)`
            }}
        >
            {/* Extended Pulled Cable with brand yellow (left) meeting muted opponent slate (right) */}
            <div className="hero-cable-track">
                <div className="cable-line" />
            </div>

            {/* Heavy Weighted Center Marker */}
            <div className="hero-marker-assembly" aria-label={`Marker offset ${offsetVw}vw`}>
                <div className="marker-body">
                    <span className="marker-ridge" />
                    <span className="marker-ridge" />
                    <span className="marker-ridge" />
                </div>
                <div className="marker-pointer top" />
                <div className="marker-pointer bottom" />
            </div>
        </div>
    );
};

export default Rope;
