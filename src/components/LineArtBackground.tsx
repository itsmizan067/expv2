import React, { useEffect, useState, useRef } from 'react';
import './LineArtBackground.css';

interface LineArtBackgroundProps {
  className?: string;
}

const TOTAL_SCENES = 5;
const SCENE_DURATION_MS = 7500;

export const LineArtBackground: React.FC<LineArtBackgroundProps> = ({ className = '' }) => {
  const [currentScene, setCurrentScene] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check user motion preferences
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Automatic scene cycling
  useEffect(() => {
    if (prefersReducedMotion) return;

    timerRef.current = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentScene((prev) => (prev + 1) % TOTAL_SCENES);
        setIsTransitioning(false);
      }, 700);
    }, SCENE_DURATION_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [prefersReducedMotion, currentScene]);

  // Common stroke styling attributes
  const strokeInk = 'rgba(148, 163, 184, 0.32)'; // Slate-400 ink
  const strokeEmerald = 'rgba(52, 211, 153, 0.48)'; // Emerald-400 money/prosperity
  const strokeTeal = 'rgba(45, 212, 191, 0.40)'; // Teal-400
  const strokeAmber = 'rgba(251, 191, 36, 0.55)'; // Amber-400 gold coin
  const strokeCyan = 'rgba(56, 189, 248, 0.35)'; // Sky/cyan accent

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none absolute inset-0 overflow-hidden z-0 ${className}`}
      style={{
        maskImage:
          'radial-gradient(ellipse 65% 75% at 50% 48%, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.25) 48%, rgba(0, 0, 0, 1) 85%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 65% 75% at 50% 48%, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.25) 48%, rgba(0, 0, 0, 1) 85%)',
      }}
    >
      {/* ── Background Subtle Ground Horizon Lines (connects edges) ── */}
      <svg
        className="absolute bottom-6 left-0 w-full h-16 opacity-30 pointer-events-none"
        preserveAspectRatio="none"
        viewBox="0 0 1440 60"
        fill="none"
      >
        <path
          d="M0 45 L 360 45 M 1080 45 L 1440 45"
          stroke={strokeInk}
          strokeWidth="1.2"
          strokeDasharray="4 8"
          strokeLinecap="round"
        />
        <circle cx="220" cy="45" r="2" fill={strokeTeal} />
        <circle cx="1220" cy="45" r="2" fill={strokeEmerald} />
      </svg>

      {/* ── Container for Side Stages with Scene Crossfading ── */}
      <div
        className={`w-full h-full transition-opacity duration-700 ease-in-out ${
          isTransitioning ? 'opacity-0 scale-[0.99]' : 'opacity-100 scale-100'
        }`}
      >
        {/* ========================================================================= */}
        {/* SCENE 0: Stressed Person Surrounded by Bills → Breathing & Relief        */}
        {/* ========================================================================= */}
        {currentScene === 0 && (
          <div className="absolute inset-0">
            {/* Left Flank: Seated Stressed Figure */}
            <div className="absolute left-2 sm:left-6 md:left-12 lg:left-16 top-24 sm:top-28 w-[240px] sm:w-[280px] lg:w-[320px] h-[340px]">
              <svg viewBox="0 0 300 320" className="w-full h-full" fill="none">
                {/* Minimal Stool / Chair */}
                <path
                  d="M110 240 L110 295 M150 240 L150 295 M105 240 L155 240"
                  stroke={strokeInk}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className="sketch-path delay-1"
                  pathLength="100"
                />

                {/* Stressed Person Contour (Single continuous hand-drawn line) */}
                {/* Legs & Torso sitting */}
                <path
                  d="M130 240 C125 210, 115 190, 120 160 C122 145, 126 130, 122 110"
                  stroke={strokeInk}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="sketch-path delay-2"
                  pathLength="100"
                />
                {/* Crossed/Folded Knee & Leg */}
                <path
                  d="M130 240 L115 270 L80 272 M125 240 L135 275 L160 275"
                  stroke={strokeInk}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className="sketch-path delay-2"
                  pathLength="100"
                />
                {/* Head tilted with hand to forehead */}
                <path
                  d="M122 110 C120 95, 130 82, 142 85 C154 88, 158 102, 148 115 C140 125, 128 122, 122 110 Z"
                  stroke={strokeInk}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="sketch-path delay-1"
                  pathLength="100"
                />
                {/* Arm raised supporting forehead */}
                <path
                  d="M124 150 C110 150, 95 135, 105 118 C112 105, 125 98, 134 94"
                  stroke={strokeEmerald}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="sketch-path delay-3"
                  pathLength="100"
                />
                {/* Other relaxed arm on lap */}
                <path
                  d="M120 155 C115 175, 110 195, 102 215"
                  stroke={strokeInk}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className="sketch-path delay-3"
                  pathLength="100"
                />

                {/* Floating Abstract Bills / Receipt Outlines with Drift */}
                {/* Bill 1 */}
                <g className="animate-float-bill" style={{ animation: 'lineArtFloatBill 4.5s ease-in-out infinite' }}>
                  <rect
                    x="75"
                    y="110"
                    width="26"
                    height="38"
                    rx="3"
                    stroke={strokeTeal}
                    strokeWidth="1.2"
                    strokeDasharray="2 3"
                    transform="rotate(-12 88 129)"
                  />
                  <path d="M80 120 L96 120 M80 128 L94 128 M80 136 L90 136" stroke={strokeTeal} strokeWidth="1" />
                </g>

                {/* Bill 2 */}
                <g style={{ animation: 'lineArtFloatBillAlt 5.2s ease-in-out infinite 0.6s' }}>
                  <rect
                    x="160"
                    y="100"
                    width="28"
                    height="40"
                    rx="3"
                    stroke={strokeInk}
                    strokeWidth="1.2"
                    transform="rotate(16 174 120)"
                  />
                  <path d="M166 112 L182 112 M166 120 L180 120 M166 128 L176 128" stroke={strokeInk} strokeWidth="1" />
                </g>

                {/* Bill 3: Small floating receipt */}
                <g style={{ animation: 'lineArtFloatBill 4.8s ease-in-out infinite 1.2s' }}>
                  <path
                    d="M140 60 L160 55 L164 80 L144 85 Z"
                    stroke={strokeEmerald}
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                  <path d="M146 68 L158 65 M147 74 L157 71" stroke={strokeEmerald} strokeWidth="1" />
                </g>

                {/* Calming breath aura (gentle pulse settling in) */}
                <circle
                  cx="135"
                  cy="100"
                  r="34"
                  stroke={strokeEmerald}
                  strokeWidth="1"
                  strokeDasharray="4 6"
                  className="animate-sparkle"
                  style={{ animation: 'lineArtSparkle 4s ease-in-out infinite 2s' }}
                />
              </svg>
            </div>

            {/* Right Flank: Calming Horizon Sketch & Abstract Solution Sparkle */}
            <div className="hidden sm:block absolute right-4 sm:right-8 md:right-14 lg:right-20 top-32 w-[220px] lg:w-[260px] h-[280px]">
              <svg viewBox="0 0 260 280" className="w-full h-full" fill="none">
                {/* Floating curved balance line */}
                <path
                  d="M30 180 C80 140, 140 210, 220 160"
                  stroke={strokeTeal}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className="sketch-path delay-2"
                  pathLength="100"
                />
                <circle cx="220" cy="160" r="3.5" fill={strokeTeal} />

                {/* Small abstract currency spark (calm indicator) */}
                <g style={{ animation: 'lineArtSparkle 3s ease-in-out infinite' }}>
                  <path d="M130 90 L130 115 M118 102.5 L142 102.5" stroke={strokeEmerald} strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="130" cy="102.5" r="14" stroke={strokeEmerald} strokeWidth="1" strokeDasharray="3 4" />
                </g>
                <text x="110" y="145" fill="rgba(148, 163, 184, 0.4)" fontSize="11" fontFamily="sans-serif" letterSpacing="2">
                  CLARITY
                </text>
              </svg>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCENE 1: Man Gives Money to Approaching Woman                             */}
        {/* ========================================================================= */}
        {currentScene === 1 && (
          <div className="absolute inset-0">
            {/* Left Flank: Man Reaching into Pocket & Giving Money */}
            <div className="absolute left-2 sm:left-6 md:left-12 lg:left-16 top-24 sm:top-28 w-[240px] sm:w-[280px] lg:w-[320px] h-[340px]">
              <svg viewBox="0 0 300 320" className="w-full h-full" fill="none">
                {/* Man Figure: Head & Hair Swoop */}
                <path
                  d="M100 70 C92 70, 85 80, 87 94 C89 108, 102 114, 114 105 C122 96, 118 78, 106 72"
                  stroke={strokeInk}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="sketch-path delay-1"
                  pathLength="100"
                />
                {/* Neck & Shoulder */}
                <path
                  d="M104 108 L105 125 C105 130, 85 138, 75 160"
                  stroke={strokeInk}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className="sketch-path delay-2"
                  pathLength="100"
                />
                {/* Spine & Coat Hem */}
                <path
                  d="M105 125 C115 155, 112 205, 100 245"
                  stroke={strokeInk}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="sketch-path delay-2"
                  pathLength="100"
                />
                {/* Trousers & Shoes */}
                <path
                  d="M100 245 L94 285 L84 287 M108 245 L116 285 L126 287"
                  stroke={strokeInk}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className="sketch-path delay-3"
                  pathLength="100"
                />
                {/* Left hand tucked into pocket */}
                <path
                  d="M75 160 C70 185, 74 205, 84 218 L92 216"
                  stroke={strokeInk}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className="sketch-path delay-3"
                  pathLength="100"
                />
                {/* Right Arm Reaching Forward with Wallet & Banknote */}
                <path
                  d="M108 132 C125 140, 145 145, 175 148"
                  stroke={strokeEmerald}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="sketch-path delay-3"
                  pathLength="100"
                />
                {/* Hand silhouette */}
                <path
                  d="M175 148 C182 147, 188 149, 192 146"
                  stroke={strokeEmerald}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className="sketch-path delay-4"
                  pathLength="100"
                />
                {/* Minimalist Slim Folded Wallet */}
                <rect
                  x="152"
                  y="152"
                  width="18"
                  height="12"
                  rx="2"
                  stroke={strokeTeal}
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                  className="sketch-path delay-4"
                  pathLength="100"
                />
                {/* Banknote being handed over */}
                <g className="sketch-path delay-4">
                  <rect
                    x="185"
                    y="138"
                    width="28"
                    height="16"
                    rx="2"
                    stroke={strokeEmerald}
                    strokeWidth="1.3"
                    fill="rgba(52, 211, 153, 0.08)"
                    transform="rotate(-6 199 146)"
                  />
                  <circle cx="199" cy="146" r="3" stroke={strokeEmerald} strokeWidth="1" />
                </g>
              </svg>
            </div>

            {/* Right Flank: Woman Approaching, Receiving Money */}
            <div className="absolute right-2 sm:right-6 md:right-12 lg:right-16 top-24 sm:top-28 w-[240px] sm:w-[280px] lg:w-[320px] h-[340px]">
              <svg viewBox="0 0 300 320" className="w-full h-full" fill="none">
                {/* Woman Silhouette in Gentle Walking Motion */}
                <g style={{ animation: 'lineArtWalkBob 4s ease-in-out infinite' }}>
                  {/* Head & Hair Contour */}
                  <path
                    d="M190 74 C198 74, 208 82, 206 96 C204 110, 190 114, 182 104 C175 96, 178 78, 190 74"
                    stroke={strokeInk}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="sketch-path delay-1"
                    pathLength="100"
                  />
                  {/* Flowing ponytail / collar sketch */}
                  <path
                    d="M204 88 C215 92, 222 104, 225 118"
                    stroke={strokeInk}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    className="sketch-path delay-2"
                    pathLength="100"
                  />
                  {/* Neck & Graceful Stance */}
                  <path
                    d="M185 110 L184 126 C184 135, 195 142, 205 165"
                    stroke={strokeInk}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    className="sketch-path delay-2"
                    pathLength="100"
                  />
                  {/* Flowing Jacket/Dress Hem */}
                  <path
                    d="M184 126 C176 155, 178 200, 192 245"
                    stroke={strokeInk}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="sketch-path delay-2"
                    pathLength="100"
                  />
                  {/* Walking Stride Legs */}
                  <path
                    d="M188 245 L176 284 L164 286 M194 245 L208 284 L220 286"
                    stroke={strokeInk}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    className="sketch-path delay-3"
                    pathLength="100"
                  />
                  {/* Extended Arm Meeting the Note */}
                  <path
                    d="M183 134 C165 140, 145 144, 122 147"
                    stroke={strokeTeal}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="sketch-path delay-3"
                    pathLength="100"
                  />
                  {/* Fingers gently taking edge of banknote */}
                  <path
                    d="M122 147 C116 146, 110 148, 106 145"
                    stroke={strokeTeal}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    className="sketch-path delay-4"
                    pathLength="100"
                  />
                  {/* Small decorative coin/sparkle in receipt */}
                  <circle
                    cx="114"
                    cy="146"
                    r="4"
                    stroke={strokeAmber}
                    strokeWidth="1.2"
                    className="sketch-path delay-4"
                  />
                </g>
              </svg>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCENE 2: Rolling Coin & Passerby Bends Down to Pick It Up                 */}
        {/* ========================================================================= */}
        {currentScene === 2 && (
          <div className="absolute inset-0">
            {/* Ground Track */}
            <div className="absolute bottom-10 left-0 right-0 h-10 pointer-events-none">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 40">
                <path d="M40 30 L 960 30" stroke={strokeInk} strokeWidth="1" strokeDasharray="3 6" />
              </svg>
            </div>

            {/* Left Flank: Coin Rolling Animation */}
            <div className="absolute left-6 sm:left-14 md:left-24 lg:left-32 bottom-8 w-[160px] h-[80px]">
              <svg viewBox="0 0 160 80" className="w-full h-full" fill="none">
                {/* Rolling Coin with Motion Spokes and Trail */}
                <g style={{ animation: 'lineArtCoinRoll 5.5s cubic-bezier(0.2, 0.8, 0.4, 1) infinite' }}>
                  {/* Outer Coin Ring */}
                  <circle
                    cx="40"
                    cy="50"
                    r="16"
                    stroke={strokeAmber}
                    strokeWidth="1.5"
                    fill="rgba(251, 191, 36, 0.06)"
                  />
                  {/* Inner Ring */}
                  <circle
                    cx="40"
                    cy="50"
                    r="11"
                    stroke={strokeAmber}
                    strokeWidth="1"
                    strokeDasharray="2 3"
                  />
                  {/* Internal Currency Stroke (৳ / Coin Sparkle) */}
                  <path
                    d="M37 45 L43 55 M43 45 L37 55"
                    stroke={strokeAmber}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  {/* Rolling Dust / Speed Whispers */}
                  <path
                    d="M18 58 C12 58, 8 54, 4 58 M22 62 L10 62"
                    stroke={strokeTeal}
                    strokeWidth="1"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                </g>
              </svg>
            </div>

            {/* Right Flank: Passerby Entering, Bending Down, Picking Coin */}
            <div className="absolute right-2 sm:right-8 md:right-14 lg:right-20 top-20 sm:top-24 w-[260px] sm:w-[300px] lg:w-[340px] h-[360px]">
              <svg viewBox="0 0 320 360" className="w-full h-full" fill="none">
                {/* Passerby Bending Pose in Continuous Line Art */}
                {/* Head tilted down towards ground */}
                <path
                  d="M130 140 C122 138, 116 148, 118 160 C120 172, 132 176, 142 168 C148 160, 144 145, 134 140"
                  stroke={strokeInk}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="sketch-path delay-1"
                  pathLength="100"
                />
                {/* Torso arched down at 45 degree angle */}
                <path
                  d="M138 168 C155 185, 175 205, 190 235"
                  stroke={strokeInk}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="sketch-path delay-2"
                  pathLength="100"
                />
                {/* Flexed knees & Stance */}
                <path
                  d="M190 235 L198 275 L186 312 L172 314 M194 235 L220 270 L235 312 L248 314"
                  stroke={strokeInk}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className="sketch-path delay-2"
                  pathLength="100"
                />
                {/* Reaching arm extending straight down to pick up coin */}
                <path
                  d="M142 172 C125 210, 105 255, 92 298"
                  stroke={strokeEmerald}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="sketch-path delay-3"
                  pathLength="100"
                />
                {/* Fingers gently cupping coin on ground */}
                <path
                  d="M92 298 C88 300, 84 306, 80 305 M92 298 C90 304, 88 308, 85 310"
                  stroke={strokeEmerald}
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  className="sketch-path delay-4"
                  pathLength="100"
                />
                {/* Coin at fingertips */}
                <circle
                  cx="82"
                  cy="307"
                  r="8"
                  stroke={strokeAmber}
                  strokeWidth="1.4"
                  fill="rgba(251, 191, 36, 0.15)"
                  className="sketch-path delay-4"
                />
                {/* Discovery Sparkles */}
                <g style={{ animation: 'lineArtSparkle 2.5s ease-in-out infinite' }}>
                  <path d="M72 292 L72 284 M68 288 L76 288" stroke={strokeAmber} strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M96 290 L96 282 M92 286 L100 286" stroke={strokeTeal} strokeWidth="1" strokeLinecap="round" />
                </g>
              </svg>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCENE 3: Shop Purchase at Minimalist Counter                              */}
        {/* ========================================================================= */}
        {currentScene === 3 && (
          <div className="absolute inset-0">
            {/* Left Flank: Minimalist Shop Counter & Shop Owner */}
            <div className="absolute left-2 sm:left-6 md:left-12 lg:left-16 top-20 sm:top-24 w-[260px] sm:w-[300px] lg:w-[340px] h-[360px]">
              <svg viewBox="0 0 320 360" className="w-full h-full" fill="none">
                {/* Minimalist Awning / Shop Canopy Line */}
                <path
                  d="M40 70 L 180 70 C 185 70, 190 75, 185 85 L 45 85"
                  stroke={strokeInk}
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  className="sketch-path delay-1"
                  pathLength="100"
                />
                <path d="M70 70 L65 85 M105 70 L100 85 M145 70 L140 85" stroke={strokeInk} strokeWidth="1" />

                {/* Slender Shop Counter Bar & Legs */}
                <path
                  d="M50 190 L210 190 M65 190 L65 295 M195 190 L195 295"
                  stroke={strokeTeal}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="sketch-path delay-2"
                  pathLength="100"
                />

                {/* Minimal Display Item on Counter (e.g. coffee cup / small box) */}
                <rect
                  x="145"
                  y="174"
                  width="16"
                  height="16"
                  rx="3"
                  stroke={strokeEmerald}
                  strokeWidth="1.3"
                  fill="rgba(52, 211, 153, 0.08)"
                  className="sketch-path delay-3"
                  pathLength="100"
                />

                {/* Shopkeeper Standing Behind Counter */}
                {/* Head */}
                <path
                  d="M100 105 C94 105, 88 114, 90 124 C92 134, 102 138, 110 132 C116 126, 114 112, 104 106"
                  stroke={strokeInk}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="sketch-path delay-1"
                  pathLength="100"
                />
                {/* Apron / Collar Line */}
                <path
                  d="M96 135 L90 190 M108 135 L114 190 M92 155 L112 155"
                  stroke={strokeInk}
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  className="sketch-path delay-2"
                  pathLength="100"
                />
                {/* Welcoming Arms Reaching onto Counter to Receive Payment */}
                <path
                  d="M88 145 C105 160, 135 175, 175 186"
                  stroke={strokeEmerald}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className="sketch-path delay-3"
                  pathLength="100"
                />
                {/* Payment coin on counter */}
                <circle
                  cx="184"
                  cy="186"
                  r="5"
                  stroke={strokeAmber}
                  strokeWidth="1.3"
                  fill="rgba(251, 191, 36, 0.2)"
                  className="sketch-path delay-4"
                />
              </svg>
            </div>

            {/* Right Flank: Female Customer Taking Product & Paying */}
            <div className="absolute right-2 sm:right-6 md:right-12 lg:right-16 top-22 sm:top-26 w-[240px] sm:w-[280px] lg:w-[320px] h-[340px]">
              <svg viewBox="0 0 300 340" className="w-full h-full" fill="none">
                <g style={{ animation: 'lineArtGentleBob 4s ease-in-out infinite' }}>
                  {/* Head & Elegant Hair Knot */}
                  <path
                    d="M160 85 C168 85, 176 94, 174 106 C172 118, 160 122, 152 114 C146 106, 150 90, 160 85"
                    stroke={strokeInk}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="sketch-path delay-1"
                    pathLength="100"
                  />
                  {/* Shoulder Tote Bag Strap */}
                  <path
                    d="M155 125 C145 145, 140 180, 142 205 L152 205"
                    stroke={strokeTeal}
                    strokeWidth="1.3"
                    strokeDasharray="3 3"
                    className="sketch-path delay-2"
                    pathLength="100"
                  />
                  {/* Torso & Long Coat */}
                  <path
                    d="M160 122 C168 150, 165 195, 155 240"
                    stroke={strokeInk}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="sketch-path delay-2"
                    pathLength="100"
                  />
                  {/* Legs */}
                  <path
                    d="M155 240 L148 285 L136 287 M162 240 L172 285 L184 287"
                    stroke={strokeInk}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    className="sketch-path delay-3"
                    pathLength="100"
                  />
                  {/* Arm Reaching Forward with Coin */}
                  <path
                    d="M156 136 C138 145, 115 158, 88 174"
                    stroke={strokeEmerald}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="sketch-path delay-3"
                    pathLength="100"
                  />
                  {/* Coin in Customer's Hand */}
                  <circle
                    cx="84"
                    cy="175"
                    r="5"
                    stroke={strokeAmber}
                    strokeWidth="1.4"
                    fill="rgba(251, 191, 36, 0.2)"
                    className="sketch-path delay-4"
                  />
                  {/* Other Hand Holding Purchased Item */}
                  <path
                    d="M160 140 C175 160, 185 180, 182 195"
                    stroke={strokeInk}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    className="sketch-path delay-4"
                    pathLength="100"
                  />
                  <rect
                    x="176"
                    y="190"
                    width="14"
                    height="14"
                    rx="2"
                    stroke={strokeTeal}
                    strokeWidth="1.2"
                    fill="rgba(45, 212, 191, 0.1)"
                  />
                </g>
              </svg>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCENE 4: Wallet Drops Coin → Small Child Picks It Up & Runs               */}
        {/* ========================================================================= */}
        {currentScene === 4 && (
          <div className="absolute inset-0">
            {/* Ground Track */}
            <div className="absolute bottom-10 left-0 right-0 h-10 pointer-events-none">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 40">
                <path d="M40 30 L 960 30" stroke={strokeInk} strokeWidth="1" strokeDasharray="3 6" />
              </svg>
            </div>

            {/* Left Flank: Man Holding Wallet with Dropping/Bouncing Coin */}
            <div className="absolute left-2 sm:left-6 md:left-12 lg:left-16 top-20 sm:top-24 w-[280px] sm:w-[320px] lg:w-[360px] h-[360px]">
              <svg viewBox="0 0 340 360" className="w-full h-full" fill="none">
                {/* Man Standing Profiling Right */}
                <path
                  d="M90 75 C82 75, 76 86, 78 98 C80 110, 92 116, 102 108 C108 100, 105 84, 94 77"
                  stroke={strokeInk}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="sketch-path delay-1"
                  pathLength="100"
                />
                {/* Torso */}
                <path
                  d="M94 114 C98 145, 96 195, 88 245"
                  stroke={strokeInk}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="sketch-path delay-2"
                  pathLength="100"
                />
                {/* Legs */}
                <path
                  d="M88 245 L80 290 L70 292 M94 245 L102 290 L114 292"
                  stroke={strokeInk}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className="sketch-path delay-3"
                  pathLength="100"
                />
                {/* Both Hands Holding Open Wallet */}
                <path
                  d="M94 130 C108 145, 125 155, 145 158"
                  stroke={strokeTeal}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className="sketch-path delay-3"
                  pathLength="100"
                />
                {/* Open Wallet Graphic */}
                <path
                  d="M142 152 L164 148 L170 166 L148 170 Z"
                  stroke={strokeEmerald}
                  strokeWidth="1.4"
                  fill="rgba(52, 211, 153, 0.08)"
                  className="sketch-path delay-3"
                  pathLength="100"
                />

                {/* Coin Dropping and Bouncing Path Arcs */}
                <path
                  d="M166 166 Q 190 220 205 292 Q 220 250 235 292 Q 245 275 258 292"
                  stroke={strokeAmber}
                  strokeWidth="1"
                  strokeDasharray="3 4"
                  opacity="0.45"
                />

                {/* Animated Bouncing Coin */}
                <g style={{ animation: 'lineArtCoinDropBounce 4.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite' }}>
                  <circle
                    cx="166"
                    cy="166"
                    r="8"
                    stroke={strokeAmber}
                    strokeWidth="1.4"
                    fill="rgba(251, 191, 36, 0.25)"
                  />
                  <circle cx="166" cy="166" r="5" stroke={strokeAmber} strokeWidth="1" strokeDasharray="2 2" />
                </g>
              </svg>
            </div>

            {/* Right Flank: Small Lively Child Running & Picking Up Coin */}
            <div className="absolute right-2 sm:right-6 md:right-12 lg:right-16 top-24 sm:top-28 w-[240px] sm:w-[280px] lg:w-[320px] h-[340px]">
              <svg viewBox="0 0 300 340" className="w-full h-full" fill="none">
                {/* Small Boy Silhouette in Dynamic Sprint / Stoop Pose */}
                <g style={{ animation: 'lineArtWalkBob 2s ease-in-out infinite' }}>
                  {/* Cap with Visor */}
                  <path
                    d="M170 120 C162 120, 156 128, 158 138 C160 148, 172 152, 180 145 C186 138, 182 125, 174 121"
                    stroke={strokeInk}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="sketch-path delay-1"
                    pathLength="100"
                  />
                  <path
                    d="M178 126 L194 124"
                    stroke={strokeTeal}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />

                  {/* Playful Compact Spine / Torso (Slight Forward Lean) */}
                  <path
                    d="M172 150 C182 170, 180 195, 175 225"
                    stroke={strokeInk}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="sketch-path delay-2"
                    pathLength="100"
                  />

                  {/* Energetic Running Legs (Wide Stride) */}
                  {/* Front leg lunging forward */}
                  <path
                    d="M175 225 L198 250 L195 285 L208 287"
                    stroke={strokeInk}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="sketch-path delay-3"
                    pathLength="100"
                  />
                  {/* Back leg kicked behind in mid-sprint */}
                  <path
                    d="M175 225 L155 245 L135 258 L125 252"
                    stroke={strokeInk}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    className="sketch-path delay-3"
                    pathLength="100"
                  />

                  {/* Front Arm Scooping Up the Coin */}
                  <path
                    d="M172 165 C155 185, 130 220, 115 250"
                    stroke={strokeEmerald}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="sketch-path delay-3"
                    pathLength="100"
                  />
                  {/* Happy Little Hand with Coin */}
                  <circle
                    cx="112"
                    cy="252"
                    r="6.5"
                    stroke={strokeAmber}
                    strokeWidth="1.4"
                    fill="rgba(251, 191, 36, 0.3)"
                    className="sketch-path delay-4"
                  />

                  {/* Back Arm Trailing in Sprint Motion */}
                  <path
                    d="M175 168 C192 180, 205 190, 215 185"
                    stroke={strokeTeal}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    className="sketch-path delay-4"
                    pathLength="100"
                  />

                  {/* Joyful Energy Dashes Around Child */}
                  <g style={{ animation: 'lineArtSparkle 2s ease-in-out infinite' }}>
                    <path d="M102 240 L96 235 M106 232 L106 225 M116 235 L122 230" stroke={strokeAmber} strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M222 178 L228 175 M220 188 L226 192" stroke={strokeEmerald} strokeWidth="1.2" strokeLinecap="round" />
                  </g>
                </g>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* ── Discreet Scene Timeline Indicator (Very subtle in bottom corner) ── */}
      <div className="absolute bottom-3 right-4 sm:right-8 z-10 flex items-center space-x-1.5 opacity-25 hover:opacity-75 transition-opacity duration-300 pointer-events-auto">
        {[0, 1, 2, 3, 4].map((idx) => (
          <button
            key={idx}
            onClick={() => {
              setIsTransitioning(true);
              setTimeout(() => {
                setCurrentScene(idx);
                setIsTransitioning(false);
              }, 400);
            }}
            title={`Story scene ${idx}`}
            aria-label={`Jump to scene ${idx + 1}`}
            className={`transition-all duration-300 rounded-full ${
              currentScene === idx
                ? 'w-4 h-1 bg-emerald-400'
                : 'w-1 h-1 bg-slate-600 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
