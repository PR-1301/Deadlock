// client/src/components/Intro/ImageTypewriter.jsx
import React from 'react';
import celestiusLogo from '../../assets/celestius-logo.png';

export default function ImageTypewriter({
  imageSrc,
  boxes = [],
  revealedCount = 0,
  showActiveCursor = true,
  isComplete = false,
  isPresented = false,
  alt = 'Logo'
}) {
  const currentBox =
    revealedCount > 0 && revealedCount <= boxes.length
      ? boxes[revealedCount - 1]
      : null;
  const cursor = currentBox?.cursor;

  if (isPresented) {
    // Elegant pixel-styled presentation for "PRESENTED BY CELESTIUS"
    const fullText = "PRESENTED BY CELESTIUS";
    const displayedCount = Math.min(revealedCount, fullText.length);
    const displayedText = fullText.slice(0, displayedCount);

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.25rem',
          width: '100%',
          height: '100%',
        }}
        role="img"
        aria-label={alt}
      >
        <div
          style={{
            fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
            fontSize: 'clamp(1.2rem, 3.8vw, 2.4rem)',
            fontWeight: 800,
            letterSpacing: '0.12em',
            color: '#F9EDD2',
            textShadow: '0 0 20px rgba(245, 117, 70, 0.6), 0 0 40px rgba(250, 160, 18, 0.3)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span>{displayedText}</span>
          {showActiveCursor && !isComplete && (
            <span
              style={{
                display: 'inline-block',
                width: '0.6em',
                height: '1em',
                backgroundColor: '#FFA012',
                marginLeft: '6px',
                animation: 'cursorBlink 0.4s infinite alternate',
              }}
            />
          )}
        </div>

        {revealedCount >= 12 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 22px',
              borderRadius: '9999px',
              background: 'rgba(20, 20, 22, 0.75)',
              border: '1px solid rgba(247, 237, 216, 0.15)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(250, 160, 18, 0.25)',
              animation: 'fadeIn 300ms ease-out',
            }}
          >
            <img
              src={celestiusLogo}
              alt="Celestius"
              style={{ height: '32px', width: 'auto', display: 'block' }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        viewBox="0 0 840 328"
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: '100%',
          display: 'block',
        }}
        role="img"
        aria-label={alt}
      >
        <defs>
          <clipPath id="logo-typing-clip">
            {isComplete ? (
              <rect x="0" y="0" width="840" height="328" />
            ) : (
              boxes.slice(0, revealedCount).map((b) => (
                <rect key={b.id} x={b.x} y={b.y} width={b.w} height={b.h} />
              ))
            )}
          </clipPath>
        </defs>

        <image
          href={imageSrc}
          x="0"
          y="0"
          width="840"
          height="328"
          preserveAspectRatio="xMidYMid meet"
          clipPath="url(#logo-typing-clip)"
        />

        {showActiveCursor && !isComplete && cursor && (
          <rect
            x={cursor.x}
            y={cursor.y}
            width={cursor.w}
            height={cursor.h}
            fill="#FAA012"
            opacity="0.95"
            style={{ animation: 'cursorBlink 0.4s infinite alternate' }}
          />
        )}
      </svg>
    </div>
  );
}

