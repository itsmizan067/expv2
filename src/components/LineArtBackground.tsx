import React, { useEffect, useState, useRef } from 'react';
import './LineArtBackground.css';

interface LineArtBackgroundProps {
  className?: string;
}

const SCENE_NAMES = [
  '1. Man gives money',
  '2. Rolling coin',
  '3. Shop purchase',
  '4. Wallet → coin → child',
];

const TOTAL_SCENES = 4;
const SCENE_DURATION_MS = 8500;

export const LineArtBackground: React.FC<LineArtBackgroundProps> = ({ className = '' }) => {
  const [currentScene, setCurrentScene] = useState<number>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check accessibility motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Cyclical sequence across the 4 stories
  useEffect(() => {
    if (prefersReducedMotion) return;

    timerRef.current = setInterval(() => {
      setCurrentScene((prev) => (prev + 1) % TOTAL_SCENES);
    }, SCENE_DURATION_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [prefersReducedMotion, currentScene]);

  // Clean, consistent line-art palette
  const strokeInk = 'rgba(148, 163, 184, 0.42)'; // Elegant slate contour
  const strokeInkFaint = 'rgba(148, 163, 184, 0.20)'; // Subtle detail line
  const strokeEmerald = 'rgba(52, 211, 153, 0.70)'; // Clean money line
  const strokeTeal = 'rgba(45, 212, 191, 0.55)'; // Accent / interaction line
  const strokeGold = 'rgba(251, 191, 36, 0.85)'; // Coin gold line
  const fillGold = 'rgba(251, 191, 36, 0.15)';
  const fillEmerald = 'rgba(52, 211, 153, 0.12)';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none absolute inset-0 overflow-hidden z-0 ${className}`}
      style={{
        maskImage:
          'radial-gradient(ellipse 65% 72% at 50% 46%, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0.22) 42%, rgba(0, 0, 1) 82%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 65% 72% at 50% 46%, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0.22) 42%, rgba(0, 0, 1) 82%)',
      }}
    >
      {/* ── Unified Panoramic Vector Canvas (1440 x 480) ── */}
      <svg
        className="w-full h-full min-h-[520px] max-h-[700px] object-cover"
        viewBox="0 0 1440 480"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(251, 191, 36, 0.95)" />
            <stop offset="100%" stopColor="rgba(245, 158, 11, 0.5)" />
          </linearGradient>
          <linearGradient id="groundGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(52, 211, 153, 0.1)" />
            <stop offset="50%" stopColor="rgba(52, 211, 153, 0.4)" />
            <stop offset="100%" stopColor="rgba(45, 212, 191, 0.1)" />
          </linearGradient>
        </defs>

        {/* ── Continuous Horizon Baseline at y = 390 (Connects the Entire Scene) ── */}
        <g opacity="0.45">
          <line x1="40" y1="390" x2="1400" y2="390" stroke={strokeInk} strokeWidth="1.4" strokeLinecap="round" />
          <line x1="40" y1="396" x2="1400" y2="396" stroke={strokeInkFaint} strokeWidth="0.8" strokeDasharray="4 8" />
          {[160, 320, 480, 640, 800, 960, 1120, 1280].map((x) => (
            <line key={x} x1={x} y1="390" x2={x - 10} y2="402" stroke={strokeInkFaint} strokeWidth="1" />
          ))}
        </g>

        {/* ========================================================================= */}
        {/* 1. MAN GIVES MONEY                                                        */}
        {/* A simple man reaches into pocket, takes out wallet, opens it, and gives    */}
        {/* money to approaching woman. She takes it and leaves; man puts wallet away.*/}
        {/* ========================================================================= */}
        <g className={currentScene === 0 ? 'lineart-scene-active' : 'lineart-scene-inactive'}>
          {/* Man on Left (standing at x = 280, facing right) */}
          <g transform="translate(280, 170)">
            {/* Man Head & Face Profile */}
            <path
              d="M 60 48 C 55 40, 60 26, 72 25 C 84 24, 94 34, 90 48 C 88 58, 78 64, 68 60"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Collar & Coat Body */}
            <path d="M 74 58 L 76 80 C 78 86, 68 92, 60 110" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            <path
              d="M 76 80 C 68 118, 70 165, 60 220"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Legs down to ground at y = 220 (which is y = 390 in stage) */}
            <path d="M 62 220 L 58 240 L 46 242" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 72 220 L 76 240 L 88 242" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />

            {/* Man's Right Arm with Wallet and Hand Gesture (Animated in Steps) */}
            <g className="animate-s1-man-arm">
              {/* Arm reaching / extending */}
              <path
                d="M 76 88 C 94 98, 115 104, 142 106"
                stroke={strokeEmerald}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              {/* Fingers holding wallet */}
              <path d="M 142 106 C 148 105, 154 107, 158 104" stroke={strokeEmerald} strokeWidth="1.5" strokeLinecap="round" />

              {/* Bifold Wallet */}
              <g transform="translate(136, 96)">
                {/* Back flap */}
                <path d="M 0 16 L 24 10 L 26 24 L 2 28 Z" stroke={strokeTeal} strokeWidth="1.3" fill="rgba(45, 212, 191, 0.1)" />
                {/* Open front flap */}
                <path d="M 0 16 L 22 18 L 24 30 L 2 28 Z" stroke={strokeTeal} strokeWidth="1.3" fill="rgba(45, 212, 191, 0.1)" />
              </g>
            </g>
          </g>

          {/* The Banknote Moving from Man's Hand to Woman's Hand and Away */}
          <g transform="translate(425, 266)">
            <g className="animate-s1-note">
              <rect
                x="0"
                y="-10"
                width="36"
                height="22"
                rx="2.5"
                stroke={strokeEmerald}
                strokeWidth="1.6"
                fill={fillEmerald}
              />
              <circle cx="18" cy="1" r="5" stroke={strokeEmerald} strokeWidth="1.2" />
              <line x1="5" y1="1" x2="9" y2="1" stroke={strokeEmerald} strokeWidth="1" />
              <line x1="27" y1="1" x2="31" y2="1" stroke={strokeEmerald} strokeWidth="1" />
            </g>
          </g>

          {/* Woman on Right (Approaches, takes money, turns, and leaves) */}
          <g transform="translate(560, 170)" className="animate-s1-woman">
            {/* Elegant Walking Woman Profile with hair bun */}
            <path
              d="M 170 42 C 178 42, 186 52, 184 64 C 182 76, 170 82, 162 74 C 156 66, 158 50, 168 44"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle cx="186" cy="52" r="6" stroke={strokeInk} strokeWidth="1.3" strokeDasharray="2 3" />
            {/* Flowing Trench Coat */}
            <path d="M 164 78 L 162 96 C 160 102, 170 110, 180 128" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            <path
              d="M 162 96 C 155 130, 158 170, 170 220"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Walking legs */}
            <path d="M 166 220 L 154 240 L 142 242" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 174 220 L 184 240 L 196 242" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />

            {/* Arm Reaching Out to Take the Money */}
            <path
              d="M 160 105 C 130 108, 90 108, 50 106"
              stroke={strokeTeal}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Open receiving fingers */}
            <path d="M 50 106 C 42 105, 36 108, 30 104" stroke={strokeTeal} strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </g>

        {/* ========================================================================= */}
        {/* 2. ROLLING COIN                                                           */}
        {/* A single coin rolls from one side. A man enters, notices it, bends down,  */}
        {/* picks it up, and walks away.                                              */}
        {/* ========================================================================= */}
        <g className={currentScene === 1 ? 'lineart-scene-active' : 'lineart-scene-inactive'}>
          {/* The Single Rolling Coin (Rolls from left, stops at x = 700, then is picked up) */}
          <g transform="translate(680, 376)">
            <g className="animate-s2-coin">
              <circle cx="0" cy="0" r="14" stroke="url(#coinGrad)" strokeWidth="1.8" fill={fillGold} />
              <circle cx="0" cy="0" r="9.5" stroke={strokeGold} strokeWidth="1" strokeDasharray="3 3" />
              <line x1="-5" y1="0" x2="5" y2="0" stroke={strokeGold} strokeWidth="1.3" />
              <line x1="0" y1="-5" x2="0" y2="5" stroke={strokeGold} strokeWidth="1.3" />
            </g>
          </g>

          {/* Discovery Sparkle above the stopped coin */}
          <g transform="translate(680, 345)" className="animate-sparkle-burst">
            <line x1="0" y1="-8" x2="0" y2="8" stroke={strokeGold} strokeWidth="1.4" strokeLinecap="round" />
            <line x1="-8" y1="0" x2="8" y2="0" stroke={strokeGold} strokeWidth="1.4" strokeLinecap="round" />
          </g>

          {/* Man Enters from Right, Stops by Coin, Bends Down, Picks It Up, Walks Away */}
          <g transform="translate(730, 170)" className="animate-s2-man">
            {/* Lower Body & Legs */}
            <path d="M 68 180 L 62 220 L 50 222" stroke={strokeInk} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M 78 180 L 82 220 L 96 222" stroke={strokeInk} strokeWidth="1.6" strokeLinecap="round" />

            {/* Torso & Head that Bends Down towards the Coin on Ground */}
            <g className="animate-s2-man-torso">
              {/* Head */}
              <path
                d="M 60 48 C 55 40, 60 26, 72 25 C 84 24, 94 34, 90 48 C 88 58, 78 64, 68 60"
                stroke={strokeInk}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              {/* Jacket Body */}
              <path
                d="M 72 65 C 76 95, 74 135, 68 180"
                stroke={strokeInk}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              {/* Arm reaching straight down to the coin on ground */}
              <path
                d="M 70 85 C 45 125, 15 170, -35 204"
                stroke={strokeEmerald}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              {/* Hand cupping coin */}
              <path d="M -35 204 C -42 206, -48 208, -50 204" stroke={strokeEmerald} strokeWidth="1.5" strokeLinecap="round" />
            </g>
          </g>
        </g>

        {/* ========================================================================= */}
        {/* 3. SHOP PURCHASE                                                          */}
        {/* A simple shop owner waits behind a minimal counter. A female customer     */}
        {/* approaches, takes a small product, pays the owner, and leaves with item.  */}
        {/* ========================================================================= */}
        <g className={currentScene === 2 ? 'lineart-scene-active' : 'lineart-scene-inactive'}>
          {/* Minimal Boutique Counter & Shop Owner on Left */}
          <g transform="translate(380, 160)">
            {/* Minimal Canopy / Shop Sign Line above */}
            <path d="M 40 30 L 260 30 C 265 30, 270 34, 268 42 L 32 42" stroke={strokeInkFaint} strokeWidth="1.2" strokeLinecap="round" />

            {/* Shop Owner Standing Behind Counter */}
            <path
              d="M 88 58 C 82 52, 86 40, 96 40 C 106 40, 114 50, 110 62 C 106 70, 96 74, 90 70"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Apron lines */}
            <path d="M 94 72 L 90 135 M 106 72 L 110 135" stroke={strokeInk} strokeWidth="1.4" strokeLinecap="round" />
            {/* Hands resting on counter & receiving coin */}
            <path
              d="M 90 85 C 105 105, 128 120, 160 130"
              stroke={strokeEmerald}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path d="M 160 130 C 168 128, 175 130, 180 126" stroke={strokeEmerald} strokeWidth="1.5" strokeLinecap="round" />

            {/* Minimal Counter Top (y = 132 -> ground y = 230) */}
            <rect x="50" y="132" width="220" height="7" rx="1.5" stroke={strokeTeal} strokeWidth="1.5" fill="rgba(45, 212, 191, 0.08)" />
            {/* Counter legs */}
            <line x1="68" y1="139" x2="68" y2="230" stroke={strokeInk} strokeWidth="1.5" />
            <line x1="252" y1="139" x2="252" y2="230" stroke={strokeInk} strokeWidth="1.5" />

            {/* Sliding Coin Payment across Counter */}
            <g transform="translate(185, 128)" className="animate-s3-coin-pay">
              <circle cx="0" cy="0" r="6" stroke={strokeGold} strokeWidth="1.5" fill={fillGold} />
              <line x1="-3" y1="0" x2="3" y2="0" stroke={strokeGold} strokeWidth="1" />
            </g>

            {/* Small Product on Counter (Box with ribbon/bow, taken by customer) */}
            <g transform="translate(210, 114)" className="animate-s3-product">
              <rect x="0" y="0" width="18" height="18" rx="2" stroke={strokeEmerald} strokeWidth="1.5" fill={fillEmerald} />
              <line x1="9" y1="0" x2="9" y2="18" stroke={strokeEmerald} strokeWidth="1.2" />
              <line x1="0" y1="9" x2="18" y2="9" stroke={strokeEmerald} strokeWidth="1.2" />
            </g>
          </g>

          {/* Female Customer Approaches Counter, Takes Product, Pays, and Leaves */}
          <g transform="translate(680, 170)" className="animate-s3-customer">
            {/* Head */}
            <path
              d="M 160 42 C 168 42, 176 52, 174 64 C 172 76, 160 82, 152 74 C 146 66, 148 50, 158 44"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Coat Body */}
            <path
              d="M 156 84 C 148 120, 152 165, 164 220"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Legs */}
            <path d="M 160 220 L 150 240 L 138 242" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 168 220 L 178 240 L 190 242" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />

            {/* Arm reaching forward to take product & place payment */}
            <path
              d="M 152 94 C 125 106, 85 116, 40 120"
              stroke={strokeEmerald}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path d="M 40 120 C 32 118, 25 120, 20 117" stroke={strokeEmerald} strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </g>

        {/* ========================================================================= */}
        {/* 4. WALLET → COIN → CHILD                                                  */}
        {/* A man on the left opens wallet; a coin drops, hits ground, and rolls to   */}
        {/* the right. A small boy notices it, picks it up, and runs off to right.    */}
        {/* ========================================================================= */}
        <g className={currentScene === 3 ? 'lineart-scene-active' : 'lineart-scene-inactive'}>
          {/* Man on Left (Opens wallet, coin drops out) */}
          <g transform="translate(280, 170)">
            {/* Head */}
            <path
              d="M 60 48 C 55 40, 60 26, 72 25 C 84 24, 94 34, 90 48 C 88 58, 78 64, 68 60"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Coat Body */}
            <path
              d="M 74 65 C 68 115, 70 165, 60 220"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Legs */}
            <path d="M 62 220 L 58 240 L 46 242" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 72 220 L 76 240 L 88 242" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />

            {/* Arms holding open wallet */}
            <path d="M 70 85 C 85 98, 105 106, 128 108" stroke={strokeTeal} strokeWidth="1.5" strokeLinecap="round" />
            {/* Open Wallet */}
            <g transform="translate(124, 98)">
              <path d="M 0 14 L 22 8 L 24 22 L 2 26 Z" stroke={strokeEmerald} strokeWidth="1.4" fill={fillEmerald} />
              <path d="M 0 14 L 18 16 L 20 28 L 2 26 Z" stroke={strokeEmerald} strokeWidth="1.4" fill={fillEmerald} />
            </g>

            {/* Coin Dropping, Bouncing 2x and Rolling Across Floor */}
            <g transform="translate(146, 102)" className="animate-s4-bouncing-coin">
              <circle cx="0" cy="0" r="10" stroke={strokeGold} strokeWidth="1.8" fill={fillGold} />
              <circle cx="0" cy="0" r="6" stroke={strokeGold} strokeWidth="1" strokeDasharray="2 2" />
            </g>
          </g>

          {/* Small Boy Enters from Right, Spots Rolling Coin, Scoops It Up, and Runs Off */}
          <g transform="translate(720, 220)" className="animate-s4-boy">
            {/* Boy's Legs in Running Stride */}
            <path d="M 50 130 L 64 168 L 74 170" stroke={strokeInk} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M 44 130 L 28 160 L 18 164" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />

            {/* Boy's Torso & Cap (Stoops down to scoop, then stands up celebrating) */}
            <g className="animate-s4-boy-torso">
              {/* Backwards baseball cap */}
              <path
                d="M 50 40 C 44 40, 38 46, 40 54 C 42 62, 52 65, 58 59 C 62 53, 58 44, 52 41"
                stroke={strokeInk}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path d="M 38 48 L 26 46" stroke={strokeTeal} strokeWidth="1.5" strokeLinecap="round" />

              {/* Young Boy Hoodie Torso */}
              <path
                d="M 50 60 C 56 80, 52 105, 46 130"
                stroke={strokeInk}
                strokeWidth="1.6"
                strokeLinecap="round"
              />

              {/* Front Arm reaching down to floor to scoop the rolling coin */}
              <path
                d="M 50 75 C 30 100, 10 135, -15 166"
                stroke={strokeEmerald}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              {/* Little Hand catching coin */}
              <circle cx="-15" cy="166" r="6" stroke={strokeGold} strokeWidth="1.5" fill={fillGold} />

              {/* Trailing Arm in energetic run */}
              <path d="M 52 78 C 66 90, 78 98, 86 92" stroke={strokeTeal} strokeWidth="1.5" strokeLinecap="round" />
            </g>
          </g>
        </g>
      </svg>

      {/* ── Discreet Story Navigation & Scene Title (Bottom Bar) ── */}
      <div className="absolute bottom-3 left-4 sm:left-8 right-4 sm:right-8 z-10 flex items-center justify-between pointer-events-auto">
        {/* Current Story Title (Quiet, elegant indicator) */}
        <div className="text-[11px] font-medium text-slate-400/80 tracking-wide flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{SCENE_NAMES[currentScene]}</span>
        </div>

        {/* 4 Interactive Story Dots */}
        <div className="flex items-center space-x-2">
          {SCENE_NAMES.map((name, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentScene(idx)}
              title={name}
              aria-label={`Jump to ${name}`}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                currentScene === idx
                  ? 'w-6 h-1.5 bg-emerald-400'
                  : 'w-1.5 h-1.5 bg-slate-600/70 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
