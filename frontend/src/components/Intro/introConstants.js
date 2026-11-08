// client/src/components/Intro/introConstants.js

export const INTRO_STATES = {
  LOADING: 'LOADING',             // 0 -> 1.5s: counter to 99%, segmented bar, single status line
  ALERT: 'ALERT',                 // 1.5s -> 2.7s: "LARPER DETECTED" banner above loader, 3x orange screen wash (peak 0.25)
  TURN_GREEN: 'TURN_GREEN',       // 2.7s -> 4.1s: cut to green, 3x green wash (peak 0.28), counter 99% -> 100% over 1.4s
  COMPLETE: 'COMPLETE',           // 4.1s -> 4.3s: 100% flash & 0.2s hold, clears loader & banner
  TYPE_LOGO: 'TYPE_LOGO',         // 4.3s -> 6.3s: LARPER OR CODER image typing (1.4s), hold 0.6s
  SWAP: 'SWAP',                   // 6.3s -> 8.5s: backspace (0.4s), then PRESENTED BY CELESTIUS (1.3s), hold 0.5s
  AUTO_ENTER: 'AUTO_ENTER',       // Immediate handover to Splash / Site
};

export const PRESENTER_NAME = 'CELESTIUS';

export const TIMINGS = {
  LOADING_DURATION: 1500,        // 0 to 99% in 1.5s
  ALERT_DURATION: 1200,          // orange alert blink 1.2s
  TURN_GREEN_DURATION: 1400,     // Counter animates 99% -> 100% over 1.4s
  COMPLETE_HOLD: 200,            // 0.2s hold at 100%
  HOLD_LOGO: 600,                // hold logo 0.6s
  TYPE_STEP_SPEED: 108,          // logo typing 1.4s (13 boxes * 108ms = 1404ms)
  BACKSPACE_STEP_SPEED: 30,      // backspace 0.4s (13 boxes * 30ms = 390ms)
  TYPE_PRES_STEP_SPEED: 65,      // presented typing 1.3s (20 boxes * 65ms = 1300ms)
  HOLD_SWAP: 500,                // hold presented 0.5s
  FADE_OUT_DURATION: 0,          // Cut straight to site with no extra delay
  REDUCED_MOTION_HOLD: 1000,
};

export const COLORS = {
  bgBase: '#050507',
  orange: '#F57546',
  orangeGrid: '#C95228',
  orangeEcho: '#7A280D',
  cream: '#F9EDD2',
  creamGrid: '#D8CCAE',
  creamEcho: '#3E3A32',
  yellow: '#FAA012',
  darkText: '#0B0A0D',
  green: '#3DDC84',
  greenGrid: '#228A4E',
  greenEcho: '#11522A',
  borderDark: 'rgba(247, 237, 216, 0.08)',
};

export const STATUS_LINE_LOADING = '> telemetry: scanning memory space...';

export const TOTAL_SEGMENTS = 26;

// Particle density scaling constants
export const PARTICLES_PHONE = 36;
export const PARTICLES_TABLET = 54;
export const PARTICLES_DESKTOP = 72;

export const SESSION_KEYS = {
  INTRO_SEEN: 'larper_or_coder_intro_seen',
  SOUND_ENABLED: 'larper_or_coder_sound_enabled',
};

// Dimensions for typing images
export const LOGO_CANVAS_WIDTH = 840;
export const LOGO_CANVAS_HEIGHT = 328;

export const LOGO_REVEAL_BOXES = [
  // Top line: LARPER
  { id: 'logo-top-0', name: 'L', x: 125, y: 10, w: 105, h: 135, leftPct: '14.88%', topPct: '3.05%', wPct: '12.5%', hPct: '41.16%', cursor: { x: 232, y: 122, w: 38, h: 18 } },
  { id: 'logo-top-1', name: 'A', x: 230, y: 10, w: 103, h: 135, leftPct: '27.38%', topPct: '3.05%', wPct: '12.26%', hPct: '41.16%', cursor: { x: 335, y: 122, w: 38, h: 18 } },
  { id: 'logo-top-2', name: 'R', x: 333, y: 10, w: 97,  h: 135, leftPct: '39.64%', topPct: '3.05%', wPct: '11.55%', hPct: '41.16%', cursor: { x: 432, y: 122, w: 38, h: 18 } },
  { id: 'logo-top-3', name: 'P', x: 430, y: 10, w: 102, h: 135, leftPct: '51.19%', topPct: '3.05%', wPct: '12.14%', hPct: '41.16%', cursor: { x: 534, y: 122, w: 38, h: 18 } },
  { id: 'logo-top-4', name: 'E', x: 532, y: 10, w: 91,  h: 135, leftPct: '63.33%', topPct: '3.05%', wPct: '10.83%', hPct: '41.16%', cursor: { x: 625, y: 122, w: 38, h: 18 } },
  { id: 'logo-top-5', name: 'R', x: 623, y: 10, w: 102, h: 135, leftPct: '74.17%', topPct: '3.05%', wPct: '12.14%', hPct: '41.16%', cursor: { x: 727, y: 122, w: 38, h: 18 } },
  // Middle row: [-- OR --]
  { id: 'logo-mid-0', name: 'TAG_OR', x: 130, y: 140, w: 595, h: 76, leftPct: '15.48%', topPct: '42.68%', wPct: '70.83%', hPct: '23.17%', cursor: { x: 225, y: 282, w: 44, h: 16 } },
  // Bottom line: CODER
  { id: 'logo-bot-0', name: 'C', x: 135, y: 216, w: 100, h: 92, leftPct: '16.07%', topPct: '65.85%', wPct: '11.9%', hPct: '28.05%', cursor: { x: 240, y: 282, w: 44, h: 16 } },
  { id: 'logo-bot-1', name: 'O', x: 235, y: 216, w: 105, h: 92, leftPct: '27.98%', topPct: '65.85%', wPct: '12.5%', hPct: '28.05%', cursor: { x: 348, y: 282, w: 44, h: 16 } },
  { id: 'logo-bot-2', name: 'D', x: 340, y: 216, w: 105, h: 92, leftPct: '40.48%', topPct: '65.85%', wPct: '12.5%', hPct: '28.05%', cursor: { x: 454, y: 282, w: 44, h: 16 } },
  { id: 'logo-bot-3', name: 'E', x: 445, y: 216, w: 100, h: 92, leftPct: '52.98%', topPct: '65.85%', wPct: '11.9%', hPct: '28.05%', cursor: { x: 554, y: 282, w: 44, h: 16 } },
  { id: 'logo-bot-4', name: 'R', x: 545, y: 216, w: 100, h: 92, leftPct: '64.88%', topPct: '65.85%', wPct: '11.9%', hPct: '28.05%', cursor: { x: 653, y: 282, w: 53, h: 16 } },
  // End cursor reveal
  { id: 'logo-cur-0', name: 'CURSOR', x: 650, y: 275, w: 60, h: 28, leftPct: '77.38%', topPct: '83.84%', wPct: '7.14%', hPct: '8.54%', cursor: { x: 653, y: 282, w: 53, h: 16 } },
];

export const PRESENTED_REVEAL_BOXES = [
  // Top line: PRESENTED
  { id: 'pres-top-0', name: 'P', x: 10,  y: 10, w: 90,  h: 132, leftPct: '1.19%', topPct: '3.05%', wPct: '10.71%', hPct: '40.24%', cursor: { x: 102, y: 120, w: 34, h: 18 } },
  { id: 'pres-top-1', name: 'R', x: 100, y: 10, w: 90,  h: 132, leftPct: '11.9%', topPct: '3.05%', wPct: '10.71%', hPct: '40.24%', cursor: { x: 192, y: 120, w: 34, h: 18 } },
  { id: 'pres-top-2', name: 'E', x: 190, y: 10, w: 90,  h: 132, leftPct: '22.62%', topPct: '3.05%', wPct: '10.71%', hPct: '40.24%', cursor: { x: 282, y: 120, w: 34, h: 18 } },
  { id: 'pres-top-3', name: 'S', x: 280, y: 10, w: 87,  h: 132, leftPct: '33.33%', topPct: '3.05%', wPct: '10.36%', hPct: '40.24%', cursor: { x: 370, y: 120, w: 34, h: 18 } },
  { id: 'pres-top-4', name: 'E', x: 367, y: 10, w: 91,  h: 132, leftPct: '43.69%', topPct: '3.05%', wPct: '10.83%', hPct: '40.24%', cursor: { x: 460, y: 120, w: 34, h: 18 } },
  { id: 'pres-top-5', name: 'N', x: 458, y: 10, w: 90,  h: 132, leftPct: '54.52%', topPct: '3.05%', wPct: '10.71%', hPct: '40.24%', cursor: { x: 550, y: 120, w: 34, h: 18 } },
  { id: 'pres-top-6', name: 'T', x: 548, y: 10, w: 90,  h: 132, leftPct: '65.24%', topPct: '3.05%', wPct: '10.71%', hPct: '40.24%', cursor: { x: 640, y: 120, w: 34, h: 18 } },
  { id: 'pres-top-7', name: 'E', x: 638, y: 10, w: 93,  h: 132, leftPct: '75.95%', topPct: '3.05%', wPct: '11.07%', hPct: '40.24%', cursor: { x: 733, y: 120, w: 34, h: 18 } },
  { id: 'pres-top-8', name: 'D', x: 731, y: 10, w: 100, h: 132, leftPct: '87.02%', topPct: '3.05%', wPct: '11.9%', hPct: '40.24%', cursor: { x: 833, y: 120, w: 34, h: 18 } },
  // Middle row: [-- BY --]
  { id: 'pres-mid-0', name: 'TAG_BY', x: 135, y: 138, w: 575, h: 74, leftPct: '16.07%', topPct: '42.07%', wPct: '68.45%', hPct: '22.56%', cursor: { x: 140, y: 295, w: 44, h: 16 } },
  // Bottom line: CELESTIUS
  { id: 'pres-bot-0', name: 'C', x: 50,  y: 212, w: 90, h: 106, leftPct: '5.95%', topPct: '64.63%', wPct: '10.71%', hPct: '32.32%', cursor: { x: 142, y: 295, w: 44, h: 16 } },
  { id: 'pres-bot-1', name: 'E', x: 140, y: 212, w: 84, h: 106, leftPct: '16.67%', topPct: '64.63%', wPct: '10.0%', hPct: '32.32%', cursor: { x: 226, y: 295, w: 44, h: 16 } },
  { id: 'pres-bot-2', name: 'L', x: 224, y: 212, w: 84, h: 106, leftPct: '26.67%', topPct: '64.63%', wPct: '10.0%', hPct: '32.32%', cursor: { x: 310, y: 295, w: 44, h: 16 } },
  { id: 'pres-bot-3', name: 'E', x: 308, y: 212, w: 84, h: 106, leftPct: '36.67%', topPct: '64.63%', wPct: '10.0%', hPct: '32.32%', cursor: { x: 394, y: 295, w: 44, h: 16 } },
  { id: 'pres-bot-4', name: 'S', x: 392, y: 212, w: 84, h: 106, leftPct: '46.67%', topPct: '64.63%', wPct: '10.0%', hPct: '32.32%', cursor: { x: 478, y: 295, w: 44, h: 16 } },
  { id: 'pres-bot-5', name: 'T', x: 476, y: 212, w: 78, h: 106, leftPct: '56.67%', topPct: '64.63%', wPct: '9.29%', hPct: '32.32%', cursor: { x: 556, y: 295, w: 40, h: 16 } },
  { id: 'pres-bot-6', name: 'I', x: 554, y: 212, w: 50, h: 106, leftPct: '65.95%', topPct: '64.63%', wPct: '5.95%', hPct: '32.32%', cursor: { x: 606, y: 295, w: 40, h: 16 } },
  { id: 'pres-bot-7', name: 'U', x: 604, y: 212, w: 88, h: 106, leftPct: '71.9%', topPct: '64.63%', wPct: '10.48%', hPct: '32.32%', cursor: { x: 694, y: 295, w: 44, h: 16 } },
  { id: 'pres-bot-8', name: 'S', x: 692, y: 212, w: 84, h: 106, leftPct: '82.38%', topPct: '64.63%', wPct: '10.0%', hPct: '32.32%', cursor: { x: 776, y: 295, w: 53, h: 16 } },
  // End cursor reveal
  { id: 'pres-cur-0', name: 'CURSOR', x: 774, y: 288, w: 60, h: 30, leftPct: '92.14%', topPct: '87.8%', wPct: '7.14%', hPct: '9.15%', cursor: { x: 776, y: 295, w: 53, h: 16 } },
];

