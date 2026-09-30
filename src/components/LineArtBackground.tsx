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

  // $2M Studio Line-Art Palette (Luminous neon strokes + subtle glassmorphic silhouette fills)
  const strokeInk = 'rgba(148, 163, 184, 0.65)'; // Elegant slate contour
  const strokeInkLight = 'rgba(203, 213, 225, 0.75)'; // Highlight contour
  const strokeEmerald = 'rgba(52, 211, 153, 0.85)'; // Vibrant money emerald
  const strokeTeal = 'rgba(45, 212, 191, 0.75)'; // Interaction line
  const strokeGold = 'rgba(251, 191, 36, 0.95)'; // Radiant 24k gold
  const bodyFillDark = 'rgba(15, 23, 42, 0.80)'; // Subtle dark silhouette body fill
  const bodyFillEmerald = 'rgba(16, 185, 129, 0.12)';
  const bodyFillGold = 'rgba(245, 158, 11, 0.18)';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none absolute inset-0 overflow-hidden z-0 ${className}`}
      style={{
        maskImage:
          'radial-gradient(ellipse 65% 72% at 50% 46%, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.20) 42%, rgba(0, 0, 1) 82%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 65% 72% at 50% 46%, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.20) 42%, rgba(0, 0, 1) 82%)',
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
          {/* Gold Coin Gradient with metallic highlight */}
          <linearGradient id="goldCoinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="45%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Emerald Banknote Gradient */}
          <linearGradient id="emeraldNoteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(52, 211, 153, 0.25)" />
            <stop offset="50%" stopColor="rgba(52, 211, 153, 0.45)" />
            <stop offset="100%" stopColor="rgba(45, 212, 191, 0.25)" />
          </linearGradient>

          {/* Subtle Ground Runway Glow */}
          <linearGradient id="groundRunwayGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(52, 211, 153, 0)" />
            <stop offset="25%" stopColor="rgba(52, 211, 153, 0.45)" />
            <stop offset="75%" stopColor="rgba(45, 212, 191, 0.45)" />
            <stop offset="100%" stopColor="rgba(45, 212, 191, 0)" />
          </linearGradient>
        </defs>

        {/* ── Architectural Ground Runway Baseline at y = 390 (Grounded Reality) ── */}
        <g>
          {/* Glowing neon baseline */}
          <line x1="60" y1="390" x2="1380" y2="390" stroke="url(#groundRunwayGlow)" strokeWidth="1.8" strokeLinecap="round" />
          {/* Secondary perspective dashed runway */}
          <line x1="60" y1="398" x2="1380" y2="398" stroke={strokeInk} strokeWidth="0.8" strokeDasharray="6 14" opacity="0.35" />

          {/* Perspective Runway Floor Ticks */}
          {[140, 260, 380, 500, 620, 740, 860, 980, 1100, 1220, 1340].map((x) => (
            <line key={x} x1={x} y1="390" x2={x - 14} y2="406" stroke={strokeInk} strokeWidth="0.9" opacity="0.25" />
          ))}
        </g>

        {/* ========================================================================= */}
        {/* SCENE 1: Man gives money                                                  */}
        {/* A simple man reaches into pocket, takes out wallet, opens it, and gives   */}
        {/* money to approaching woman. She takes it and leaves; man puts wallet away.*/}
        {/* ========================================================================= */}
        <g className={currentScene === 0 ? 'lineart-scene-active' : 'lineart-scene-inactive'}>
          {/* Man on Left (standing grounded at y = 390, facing right) */}
          <g transform="translate(260, 180)">
            {/* Man Head & Styled Hair Profile */}
            <path
              d="M 64 36 C 60 26, 68 15, 80 15 C 92 15, 102 24, 98 38 C 96 46, 88 52, 78 50 C 72 48, 66 44, 64 36 Z"
              fill={bodyFillDark}
              stroke={strokeInkLight}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Neck & Sophisticated Overcoat Silhouette */}
            <path
              d="M 76 50 L 78 72 C 86 76, 96 82, 94 105 L 90 148 C 88 180, 84 210, 68 210 C 56 210, 54 180, 58 135 C 60 102, 68 76, 76 50 Z"
              fill={bodyFillDark}
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Coat Lapel Accent Lines */}
            <path d="M 78 72 L 72 108 L 84 108" stroke={strokeEmerald} strokeWidth="1.4" strokeLinecap="round" />

            {/* Tailored Straight Slacks & Minimalist Shoes (Feet firmly on floor y = 210 => 390) */}
            {/* Left leg & shoe */}
            <path
              d="M 64 210 L 60 252 L 46 254 C 44 254, 44 250, 48 248 L 68 246"
              fill={bodyFillDark}
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Right leg & shoe */}
            <path
              d="M 74 210 L 78 252 L 92 254 C 94 254, 94 250, 90 248 L 72 246"
              fill={bodyFillDark}
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />

            {/* Man's Right Arm, Wallet & Handing Motion (Keyframed Step-by-Step) */}
            <g className="animate-s1-man-arm">
              {/* Arm sleeve contour */}
              <path
                d="M 76 82 C 92 90, 114 96, 140 98 L 138 108 C 114 106, 90 98, 76 90 Z"
                fill={bodyFillDark}
                stroke={strokeEmerald}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Articulated Hand holding wallet */}
              <path d="M 140 98 C 146 96, 152 98, 156 95 L 152 104 C 146 106, 140 104, 138 108 Z" fill={bodyFillDark} stroke={strokeEmerald} strokeWidth="1.4" />

              {/* Styled Bifold Leather Wallet with money slot */}
              <g transform="translate(138, 88)">
                <path d="M 0 16 L 24 10 L 26 24 L 2 28 Z" fill="rgba(15, 23, 42, 0.9)" stroke={strokeTeal} strokeWidth="1.4" />
                <path d="M 0 16 L 22 18 L 24 30 L 2 28 Z" fill="rgba(45, 212, 191, 0.2)" stroke={strokeTeal} strokeWidth="1.4" />
                <line x1="4" y1="18" x2="20" y2="14" stroke={strokeEmerald} strokeWidth="1" />
              </g>
            </g>
          </g>

          {/* Luminous Emerald Banknote Transferring Across from Man to Woman */}
          <g transform="translate(415, 274)">
            <g className="animate-s1-banknote">
              <rect
                x="0"
                y="-10"
                width="38"
                height="22"
                rx="3"
                fill="url(#emeraldNoteGrad)"
                stroke={strokeEmerald}
                strokeWidth="1.6"
              />
              <circle cx="19" cy="1" r="5" stroke={strokeEmerald} strokeWidth="1.3" fill="rgba(52, 211, 153, 0.3)" />
              <line x1="6" y1="1" x2="10" y2="1" stroke={strokeEmerald} strokeWidth="1.2" strokeLinecap="round" />
              <line x1="28" y1="1" x2="32" y2="1" stroke={strokeEmerald} strokeWidth="1.2" strokeLinecap="round" />
            </g>
          </g>

          {/* Woman on Right (Graceful stride along floor y = 390, receives banknote, leaves) */}
          <g transform="translate(560, 180)" className="animate-s1-woman">
            {/* Elegant Head with Ponytail / Low Bun */}
            <path
              d="M 166 32 C 174 32, 184 40, 182 52 C 180 62, 168 68, 160 62 C 154 54, 156 40, 164 34 Z"
              fill={bodyFillDark}
              stroke={strokeInkLight}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Hair Bun silhouette */}
            <circle cx="184" cy="42" r="6" fill={bodyFillDark} stroke={strokeInkLight} strokeWidth="1.3" />

            {/* Tailored Belted Trench Coat Silhouette */}
            <path
              d="M 162 65 C 170 70, 178 82, 176 102 L 180 145 C 182 180, 174 210, 158 210 C 146 210, 148 180, 150 145 C 152 105, 154 75, 162 65 Z"
              fill={bodyFillDark}
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Belt buckle accent */}
            <rect x="156" y="112" width="16" height="5" rx="1" fill={strokeTeal} stroke={strokeTeal} strokeWidth="1" />

            {/* Walking Stride Legs & Chic Ankle Boots on floor */}
            <path
              d="M 158 210 L 148 252 L 134 254 C 132 254, 132 250, 136 248 L 152 246"
              fill={bodyFillDark}
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M 168 210 L 178 252 L 192 254 C 194 254, 194 250, 190 248 L 174 246"
              fill={bodyFillDark}
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />

            {/* Reaching Arm to Receive Money */}
            <path
              d="M 158 92 C 135 96, 100 98, 62 98 L 60 106 C 98 106, 135 102, 158 98 Z"
              fill={bodyFillDark}
              stroke={strokeTeal}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Open receiving hand */}
            <path d="M 62 98 C 54 97, 46 99, 42 96 L 46 104 C 52 106, 58 104, 60 106 Z" fill={bodyFillDark} stroke={strokeTeal} strokeWidth="1.4" />
          </g>
        </g>

        {/* ========================================================================= */}
        {/* SCENE 2: Rolling coin                                                     */}
        {/* A single coin rolls from one side. A man enters, notices it, bends down,  */}
        {/* picks it up, and walks away.                                              */}
        {/* ========================================================================= */}
        <g className={currentScene === 1 ? 'lineart-scene-active' : 'lineart-scene-inactive'}>
          {/* The High-End Metallic 24K Gold Coin (Rolls along floor y = 390, then lifts) */}
          <g transform="translate(680, 376)">
            <g className="animate-s2-coin">
              {/* Outer coin rim with gradient bevel */}
              <circle cx="0" cy="0" r="14" fill="url(#goldCoinGrad)" stroke={strokeGold} strokeWidth="2" />
              {/* Milled inner coin border */}
              <circle cx="0" cy="0" r="10" stroke="#fef08a" strokeWidth="1" strokeDasharray="3 3" fill="rgba(245, 158, 11, 0.25)" />
              {/* Embossed currency monogram */}
              <path d="M -4 -4 L 4 4 M 4 -4 L -4 4" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
            </g>
          </g>

          {/* Golden Discovery Glint Sparkle */}
          <g transform="translate(680, 350)" className="animate-glint">
            <line x1="0" y1="-9" x2="0" y2="9" stroke={strokeGold} strokeWidth="1.6" strokeLinecap="round" />
            <line x1="-9" y1="0" x2="9" y2="0" stroke={strokeGold} strokeWidth="1.6" strokeLinecap="round" />
          </g>

          {/* Passerby Enters, Stops, Bends down to Floor, Plucks Coin, Walks Away */}
          <g transform="translate(730, 180)" className="animate-s2-man">
            {/* Lower Body & Legs firmly on floor y = 252 (390 in stage) */}
            <path
              d="M 64 210 L 60 252 L 46 254"
              fill={bodyFillDark}
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M 74 210 L 78 252 L 92 254"
              fill={bodyFillDark}
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />

            {/* Torso & Head Hinges Down Gracefully to Pluck Coin from Floor */}
            <g className="animate-s2-man-torso">
              {/* Head Profile */}
              <path
                d="M 64 36 C 60 26, 68 15, 80 15 C 92 15, 102 24, 98 38 C 96 46, 88 52, 78 50 C 72 48, 66 44, 64 36 Z"
                fill={bodyFillDark}
                stroke={strokeInkLight}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              {/* Torso silhouette */}
              <path
                d="M 76 50 L 78 72 C 86 76, 94 84, 90 115 L 86 150 C 84 185, 80 210, 68 210 C 58 210, 56 185, 60 145 C 62 105, 68 76, 76 50 Z"
                fill={bodyFillDark}
                stroke={strokeInk}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Arm reaching straight down to the floor at the coin */}
              <path
                d="M 70 80 C 45 115, 15 155, -34 195 L -30 202 C 18 162, 50 120, 72 84 Z"
                fill={bodyFillDark}
                stroke={strokeEmerald}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              {/* Fingers cupping coin */}
              <path d="M -34 195 C -40 197, -46 199, -48 195 L -44 203 C -38 205, -30 202, -30 202 Z" fill={bodyFillDark} stroke={strokeEmerald} strokeWidth="1.4" />
            </g>
          </g>
        </g>

        {/* ========================================================================= */}
        {/* SCENE 3: Shop purchase                                                    */}
        {/* A simple shop owner waits behind a minimal counter. A female customer     */}
        {/* approaches, takes a small product, pays the owner, and leaves with item.  */}
        {/* ========================================================================= */}
        <g className={currentScene === 2 ? 'lineart-scene-active' : 'lineart-scene-inactive'}>
          {/* Architectural Boutique Counter & Shopkeeper on Left */}
          <g transform="translate(360, 160)">
            {/* Minimalist Ceiling Pendant Lamp */}
            <line x1="160" y1="0" x2="160" y2="45" stroke={strokeInk} strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <path d="M 148 45 L 172 45 L 166 56 L 154 56 Z" fill={bodyFillGold} stroke={strokeGold} strokeWidth="1.3" />

            {/* Shopkeeper Behind Counter (Refined hospitality poise) */}
            <path
              d="M 88 48 C 82 40, 86 28, 96 28 C 106 28, 114 38, 110 50 C 106 58, 96 62, 90 58 Z"
              fill={bodyFillDark}
              stroke={strokeInkLight}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Apron & Shirt silhouette */}
            <path
              d="M 94 62 L 90 150 L 114 150 L 110 62 Z"
              fill={bodyFillDark}
              stroke={strokeInk}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Welcoming arms resting on counter and receiving payment */}
            <path
              d="M 90 75 C 105 92, 130 110, 162 118"
              stroke={strokeEmerald}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path d="M 162 118 C 170 116, 178 118, 182 114" stroke={strokeEmerald} strokeWidth="1.5" strokeLinecap="round" />

            {/* Sleek Polished Counter Bar (y = 120 -> ground y = 230 => 390 in stage) */}
            <rect x="40" y="120" width="240" height="9" rx="2" fill="rgba(15, 23, 42, 0.95)" stroke={strokeTeal} strokeWidth="1.6" />
            {/* Slender architectural brass frame legs */}
            <line x1="60" y1="129" x2="60" y2="230" stroke={strokeInk} strokeWidth="1.6" />
            <line x1="260" y1="129" x2="260" y2="230" stroke={strokeInk} strokeWidth="1.6" />

            {/* Packaged Boutique Box with Ribbon (Taken by customer) */}
            <g transform="translate(198, 98)" className="animate-s3-product">
              <rect x="0" y="0" width="22" height="22" rx="3" fill={bodyFillEmerald} stroke={strokeEmerald} strokeWidth="1.5" />
              <line x1="11" y1="0" x2="11" y2="22" stroke={strokeEmerald} strokeWidth="1.3" />
              <line x1="0" y1="11" x2="22" y2="11" stroke={strokeEmerald} strokeWidth="1.3" />
              {/* Little bow ribbon */}
              <circle cx="11" cy="0" r="3" stroke={strokeGold} strokeWidth="1.2" fill={bodyFillGold} />
            </g>

            {/* Sliding Gold Payment Coin across Counter */}
            <g transform="translate(178, 116)" className="animate-s3-coin-slide">
              <circle cx="0" cy="0" r="7" fill="url(#goldCoinGrad)" stroke={strokeGold} strokeWidth="1.6" />
              <line x1="-3" y1="0" x2="3" y2="0" stroke="#ffffff" strokeWidth="1" />
            </g>
          </g>

          {/* Customer on Right: Approaches Counter, Takes Product, Pays, and Leaves */}
          <g transform="translate(680, 180)" className="animate-s3-customer">
            {/* Head Profile */}
            <path
              d="M 160 32 C 168 32, 178 40, 176 52 C 174 62, 162 68, 154 62 C 148 54, 150 40, 158 34 Z"
              fill={bodyFillDark}
              stroke={strokeInkLight}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Coat Body */}
            <path
              d="M 156 65 C 164 70, 172 82, 170 102 L 174 145 C 176 180, 168 210, 152 210 C 140 210, 142 180, 144 145 C 146 105, 148 75, 156 65 Z"
              fill={bodyFillDark}
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Legs on floor y = 210 => 390 */}
            <path d="M 152 210 L 142 252 L 128 254" fill={bodyFillDark} stroke={strokeInk} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M 162 210 L 172 252 L 186 254" fill={bodyFillDark} stroke={strokeInk} strokeWidth="1.6" strokeLinecap="round" />

            {/* Arm reaching forward across counter */}
            <path
              d="M 150 85 C 125 96, 85 106, 40 108 L 42 116 C 85 114, 125 104, 150 93 Z"
              fill={bodyFillDark}
              stroke={strokeEmerald}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path d="M 40 108 C 32 106, 24 108, 20 105 L 24 112 C 30 114, 38 112, 42 116 Z" fill={bodyFillDark} stroke={strokeEmerald} strokeWidth="1.4" />
          </g>
        </g>

        {/* ========================================================================= */}
        {/* SCENE 4: Wallet → coin → child                                            */}
        {/* A man on the left opens wallet; coin drops, hits ground, and rolls right. */}
        {/* A small boy notices it, picks it up, and runs off to right.               */}
        {/* ========================================================================= */}
        <g className={currentScene === 3 ? 'lineart-scene-active' : 'lineart-scene-inactive'}>
          {/* Man on Left (standing grounded at y = 390, opens wallet) */}
          <g transform="translate(260, 180)">
            {/* Head */}
            <path
              d="M 64 36 C 60 26, 68 15, 80 15 C 92 15, 102 24, 98 38 C 96 46, 88 52, 78 50 C 72 48, 66 44, 64 36 Z"
              fill={bodyFillDark}
              stroke={strokeInkLight}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Torso & Coat */}
            <path
              d="M 76 50 L 78 72 C 86 76, 96 82, 94 105 L 90 148 C 88 180, 84 210, 68 210 C 56 210, 54 180, 58 135 C 60 102, 68 76, 76 50 Z"
              fill={bodyFillDark}
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Legs on floor */}
            <path d="M 64 210 L 60 252 L 46 254" fill={bodyFillDark} stroke={strokeInk} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M 74 210 L 78 252 L 92 254" fill={bodyFillDark} stroke={strokeInk} strokeWidth="1.6" strokeLinecap="round" />

            {/* Hands holding open bifold wallet */}
            <path d="M 74 80 C 88 92, 108 100, 132 102" stroke={strokeTeal} strokeWidth="1.5" strokeLinecap="round" />
            <g transform="translate(130, 92)">
              <path d="M 0 16 L 24 10 L 26 24 L 2 28 Z" fill="rgba(15, 23, 42, 0.9)" stroke={strokeEmerald} strokeWidth="1.4" />
              <path d="M 0 16 L 20 18 L 22 30 L 2 28 Z" fill={bodyFillEmerald} stroke={strokeEmerald} strokeWidth="1.4" />
            </g>

            {/* Dropping and Bouncing Gold Coin */}
            <g transform="translate(148, 96)" className="animate-s4-coin-bounce">
              <circle cx="0" cy="0" r="10" fill="url(#goldCoinGrad)" stroke={strokeGold} strokeWidth="1.8" />
              <circle cx="0" cy="0" r="6" stroke="#fef08a" strokeWidth="1" strokeDasharray="2 2" fill="rgba(245, 158, 11, 0.3)" />
            </g>
          </g>

          {/* Small Boy on Right (Grounded on floor y = 390! Proportional height ~120px) */}
          <g transform="translate(720, 255)" className="animate-s4-boy">
            {/* Boy's Legs Running on the Floor (Feet touch y = 135 => 390 in stage) */}
            <path
              d="M 44 95 L 56 135 L 68 135"
              fill={bodyFillDark}
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M 38 95 L 24 125 L 12 127"
              fill={bodyFillDark}
              stroke={strokeInk}
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Boy's Torso with Hoodie & Backwards Baseball Cap (Hinges down to scoop coin) */}
            <g className="animate-s4-boy-torso">
              {/* Backwards Cap with Visor */}
              <path
                d="M 46 25 C 40 25, 34 31, 36 39 C 38 47, 48 50, 54 44 C 58 38, 54 29, 48 26 Z"
                fill={bodyFillDark}
                stroke={strokeInkLight}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              {/* Cap Visor pointing backward */}
              <path d="M 34 33 L 22 31" stroke={strokeTeal} strokeWidth="1.6" strokeLinecap="round" />

              {/* Young Boy Hoodie Silhouette */}
              <path
                d="M 46 44 C 52 52, 54 68, 48 95 L 36 95 C 32 68, 36 52, 46 44 Z"
                fill={bodyFillDark}
                stroke={strokeInk}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Front arm scooping down to floor to catch rolling coin */}
              <path
                d="M 46 55 C 30 75, 10 105, -14 134 L -10 140 C 14 110, 34 80, 48 60 Z"
                fill={bodyFillDark}
                stroke={strokeEmerald}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              {/* Little Hand holding coin */}
              <circle cx="-14" cy="135" r="7" fill="url(#goldCoinGrad)" stroke={strokeGold} strokeWidth="1.6" />

              {/* Back Arm Pumping in athletic kid sprint */}
              <path d="M 48 58 C 60 70, 72 78, 80 72" stroke={strokeTeal} strokeWidth="1.6" strokeLinecap="round" />
            </g>
          </g>
        </g>
      </svg>

      {/* ── Super-Premium Story Navigation & Scene Indicator (Bottom Bar) ── */}
      <div className="absolute bottom-3 left-4 sm:left-8 right-4 sm:right-8 z-10 flex items-center justify-between pointer-events-auto">
        {/* Current Story Title (Quiet, elegant fintech badge) */}
        <div className="text-[11px] font-medium text-slate-300 tracking-wide flex items-center space-x-2 bg-slate-900/60 backdrop-blur-md px-3 py-1 rounded-full border border-slate-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{SCENE_NAMES[currentScene]}</span>
        </div>

        {/* 4 Interactive Story Buttons */}
        <div className="flex items-center space-x-2 bg-slate-900/60 backdrop-blur-md p-1 rounded-full border border-slate-800/60">
          {SCENE_NAMES.map((name, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentScene(idx)}
              title={name}
              aria-label={`Jump to ${name}`}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                currentScene === idx
                  ? 'w-7 h-2 bg-gradient-to-r from-emerald-400 to-teal-400 shadow-sm shadow-emerald-500/30'
                  : 'w-2 h-2 bg-slate-600/70 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
