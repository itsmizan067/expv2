import React, { useEffect, useState, useRef } from 'react';
import './LineArtBackground.css';

interface LineArtBackgroundProps {
  className?: string;
}

const TOTAL_SCENES = 5;
const SCENE_DURATION_MS = 8000;

export const LineArtBackground: React.FC<LineArtBackgroundProps> = ({ className = '' }) => {
  const [currentScene, setCurrentScene] = useState<number>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect accessibility motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Seamless 8-second cyclical transitions
  useEffect(() => {
    if (prefersReducedMotion) return;

    timerRef.current = setInterval(() => {
      setCurrentScene((prev) => (prev + 1) % TOTAL_SCENES);
    }, SCENE_DURATION_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [prefersReducedMotion]);

  // Refined architectural line-art palette
  const strokeInk = 'rgba(148, 163, 184, 0.40)'; // Elegant slate contour
  const strokeInkFaint = 'rgba(148, 163, 184, 0.22)'; // Soft secondary contour
  const strokeEmerald = 'rgba(52, 211, 153, 0.65)'; // Radiant money / prosperity line
  const strokeTeal = 'rgba(45, 212, 191, 0.50)'; // Fluid transaction line
  const strokeGold = 'rgba(251, 191, 36, 0.75)'; // Glistening coin gold
  const fillGold = 'rgba(251, 191, 36, 0.12)';
  const fillEmerald = 'rgba(52, 211, 153, 0.08)';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none absolute inset-0 overflow-hidden z-0 ${className}`}
      style={{
        maskImage:
          'radial-gradient(ellipse 65% 72% at 50% 46%, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0.22) 42%, rgba(0, 0, 0, 1) 82%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 65% 72% at 50% 46%, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0.22) 42%, rgba(0, 0, 0, 1) 82%)',
      }}
    >
      {/* ── Unified Panoramic Vector Stage (1440 x 480) ── */}
      <svg
        className="w-full h-full min-h-[520px] max-h-[700px] object-cover"
        viewBox="0 0 1440 480"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          {/* Subtle linear glow for money transfer arcs */}
          <linearGradient id="moneyStreamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(52, 211, 153, 0.2)" />
            <stop offset="50%" stopColor="rgba(52, 211, 153, 0.85)" />
            <stop offset="100%" stopColor="rgba(45, 212, 191, 0.3)" />
          </linearGradient>

          {/* Gold coin gradient */}
          <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(251, 191, 36, 0.85)" />
            <stop offset="100%" stopColor="rgba(245, 158, 11, 0.4)" />
          </linearGradient>
        </defs>

        {/* ── Continuous Horizon Line & Architectural Floor Grid (Unifies Entire Stage) ── */}
        <g opacity="0.45">
          {/* Main Ground Line at y = 400 */}
          <line x1="40" y1="400" x2="1400" y2="400" stroke={strokeInk} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="40" y1="408" x2="1400" y2="408" stroke={strokeInkFaint} strokeWidth="0.8" strokeDasharray="6 12" />

          {/* Perspective pavement tick marks across the baseline */}
          {[120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200, 1320].map((x) => (
            <line key={x} x1={x} y1="400" x2={x - 12} y2="414" stroke={strokeInkFaint} strokeWidth="1" />
          ))}
        </g>

        {/* ── Living Value Flow Stream (Connecting Left and Right across the center) ── */}
        <g opacity="0.35" className="lineart-flow-glow">
          {/* Continuous sweeping connecting arc */}
          <path
            d="M 120 370 C 420 310, 1020 310, 1320 370"
            stroke="url(#moneyStreamGrad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="lineart-flow-dash"
          />
          {/* Subtle floating currency particles traveling along the flow */}
          <circle cx="380" cy="336" r="2.5" fill={strokeEmerald} className="animate-glisten" />
          <circle cx="720" cy="324" r="3" fill={strokeTeal} className="animate-glisten" />
          <circle cx="1060" cy="336" r="2.5" fill={strokeGold} className="animate-glisten" />
        </g>

        {/* ===================================================================== */}
        {/* SCENE 0: Overwhelmed by Bills → Harmonizing Flow & Financial Calm    */}
        {/* ===================================================================== */}
        <g className={currentScene === 0 ? 'lineart-scene-active' : 'lineart-scene-inactive'}>
          {/* Left: Realistic Professional at Minimalist Desk */}
          <g transform="translate(180, 190)">
            {/* Minimalist Desk & Chair */}
            <path
              d="M 30 210 L 190 210 M 50 210 L 50 210 M 170 210 L 170 210"
              stroke={strokeInk}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Desk legs */}
            <line x1="45" y1="210" x2="45" y2="210" stroke={strokeInk} strokeWidth="1.5" />
            <line x1="175" y1="210" x2="175" y2="210" stroke={strokeInk} strokeWidth="1.5" />
            {/* Chair outline */}
            <path d="M 15 150 L 15 210 L 25 210" stroke={strokeInkFaint} strokeWidth="1.2" strokeLinecap="round" />

            {/* Laptop / Screen Contour on desk */}
            <path d="M 115 210 L 140 180 L 160 180 L 160 210 Z" stroke={strokeTeal} strokeWidth="1.2" />

            {/* Realistic Seated Figure with realistic posture (hand on temple, breathing) */}
            {/* Head and refined facial profile */}
            <path
              d="M 68 85 C 64 74, 72 62, 85 64 C 96 66, 102 78, 98 90 C 94 98, 86 102, 76 98"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Neck and tailored shirt collar */}
            <path d="M 82 98 L 86 112 C 86 116, 75 122, 65 136" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            {/* Curved spine & back contour */}
            <path
              d="M 86 112 C 78 135, 76 168, 68 200"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Seated thigh & leg */}
            <path d="M 68 200 L 115 200 L 120 210" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            {/* Arm resting on desk with hand to forehead */}
            <path
              d="M 86 118 C 102 130, 114 150, 108 178 L 102 178"
              stroke={strokeInk}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M 108 178 C 104 150, 95 110, 84 82"
              stroke={strokeEmerald}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>

          {/* Center Connection: Chaotic Bills Harmonizing into Clean Straight Stream */}
          <g transform="translate(420, 260)">
            {/* Bill 1 */}
            <g className="animate-bills-harmonize-1">
              <rect x="0" y="0" width="32" height="44" rx="3" stroke={strokeTeal} strokeWidth="1.3" />
              <line x1="6" y1="12" x2="26" y2="12" stroke={strokeTeal} strokeWidth="1" />
              <line x1="6" y1="20" x2="22" y2="20" stroke={strokeTeal} strokeWidth="1" />
              <line x1="6" y1="28" x2="18" y2="28" stroke={strokeTeal} strokeWidth="1" />
            </g>
            {/* Bill 2 */}
            <g className="animate-bills-harmonize-2" transform="translate(60, -20)">
              <rect x="0" y="0" width="30" height="42" rx="3" stroke={strokeInk} strokeWidth="1.2" strokeDasharray="3 3" />
              <line x1="6" y1="12" x2="24" y2="12" stroke={strokeInk} strokeWidth="1" />
              <line x1="6" y1="20" x2="20" y2="20" stroke={strokeInk} strokeWidth="1" />
            </g>
            {/* Bill 3 */}
            <g className="animate-bills-harmonize-3" transform="translate(130, -10)">
              <rect x="0" y="0" width="28" height="38" rx="3" stroke={strokeEmerald} strokeWidth="1.4" />
              <line x1="6" y1="10" x2="22" y2="10" stroke={strokeEmerald} strokeWidth="1" />
            </g>

            {/* Glowing trajectory line leading towards the right */}
            <path
              d="M 30 20 C 140 -10, 360 -5, 560 30"
              stroke="url(#moneyStreamGrad)"
              strokeWidth="1.8"
              strokeDasharray="4 6"
              className="lineart-flow-dash"
            />
          </g>

          {/* Right: Organized Growth & Stack of Prosperity */}
          <g transform="translate(1120, 260)">
            {/* Rising metric line graph */}
            <path
              d="M 20 120 L 70 85 L 120 95 L 180 40"
              stroke={strokeEmerald}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Sleek Coin Stacks */}
            <ellipse cx="60" cy="130" rx="20" ry="7" stroke={strokeGold} strokeWidth="1.4" fill={fillGold} />
            <ellipse cx="60" cy="120" rx="20" ry="7" stroke={strokeGold} strokeWidth="1.4" fill={fillGold} />
            <ellipse cx="60" cy="110" rx="20" ry="7" stroke={strokeGold} strokeWidth="1.4" fill={fillGold} />

            <ellipse cx="140" cy="130" rx="22" ry="7" stroke={strokeEmerald} strokeWidth="1.4" fill={fillEmerald} />
            <ellipse cx="140" cy="118" rx="22" ry="7" stroke={strokeEmerald} strokeWidth="1.4" fill={fillEmerald} />
            <ellipse cx="140" cy="106" rx="22" ry="7" stroke={strokeEmerald} strokeWidth="1.4" fill={fillEmerald} />
            <ellipse cx="140" cy="94" rx="22" ry="7" stroke={strokeEmerald} strokeWidth="1.4" fill={fillEmerald} />
          </g>
        </g>

        {/* ===================================================================== */}
        {/* SCENE 1: Man Gives Money to Approaching Woman (Full Cross-Exchange)  */}
        {/* ===================================================================== */}
        <g className={currentScene === 1 ? 'lineart-scene-active' : 'lineart-scene-inactive'}>
          {/* Left Figure: Realistic Standing Man in Profile */}
          <g transform="translate(240, 180)">
            {/* Head & Natural Profile with defined jaw and haircut */}
            <path
              d="M 72 45 C 66 38, 70 24, 84 22 C 96 20, 106 30, 102 44 C 100 56, 90 62, 78 58"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Neck & Overcoat Collar / Lapel */}
            <path d="M 84 56 L 86 78 C 88 84, 76 90, 68 108" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 88 78 L 98 102 L 92 145" stroke={strokeInk} strokeWidth="1.4" strokeLinecap="round" />
            {/* Fluid Back & Overcoat Hem drape down to knee */}
            <path
              d="M 86 78 C 76 115, 78 160, 68 200"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Realistic Straight-leg Slacks & Shoes */}
            <path d="M 70 200 L 66 218 L 54 220" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 82 200 L 86 218 L 98 220" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            {/* Left Hand in Coat Pocket */}
            <path d="M 68 115 C 64 135, 68 152, 76 160" stroke={strokeInk} strokeWidth="1.4" strokeLinecap="round" />
            {/* Right Arm Extended Forward Holding Slim Bifold Wallet & Cash */}
            <path
              d="M 90 85 C 108 95, 128 102, 160 105"
              stroke={strokeEmerald}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Realistic open hand holding banknote */}
            <path d="M 160 105 C 168 104, 175 106, 180 103" stroke={strokeEmerald} strokeWidth="1.5" strokeLinecap="round" />
            {/* Slim Wallet outline */}
            <rect
              x="142"
              y="108"
              width="24"
              height="16"
              rx="2.5"
              stroke={strokeTeal}
              strokeWidth="1.3"
              strokeDasharray="2 2"
            />
          </g>

          {/* Dynamic Money & Transaction Flow Connecting Across from Man to Woman */}
          <g transform="translate(420, 275)">
            {/* Luminous transaction bridge curve linking left and right hands */}
            <path
              d="M 0 10 C 90 -25, 170 -25, 260 10"
              stroke="url(#moneyStreamGrad)"
              strokeWidth="1.8"
              strokeDasharray="4 6"
              className="lineart-flow-dash"
            />
            {/* Banknote in fluid transit across the gap */}
            <g className="animate-note-transfer">
              <rect
                x="0"
                y="-10"
                width="34"
                height="20"
                rx="2.5"
                stroke={strokeEmerald}
                strokeWidth="1.5"
                fill="rgba(52, 211, 153, 0.15)"
              />
              <circle cx="17" cy="0" r="4.5" stroke={strokeEmerald} strokeWidth="1" fill={fillEmerald} />
              <line x1="4" y1="0" x2="8" y2="0" stroke={strokeEmerald} strokeWidth="1" />
              <line x1="26" y1="0" x2="30" y2="0" stroke={strokeEmerald} strokeWidth="1" />
            </g>
          </g>

          {/* Right Figure: Realistic Walking Woman Approaching & Receiving Money */}
          <g transform="translate(680, 180)" className="animate-natural-stride">
            {/* Realistic Profile with elegant low bun and slender neck */}
            <path
              d="M 230 42 C 238 42, 246 52, 244 64 C 242 76, 230 82, 222 74 C 216 66, 218 50, 228 44"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Hair bun curve */}
            <circle cx="246" cy="52" r="7" stroke={strokeInk} strokeWidth="1.3" strokeDasharray="3 3" />
            {/* Trench Coat Collar & Lapel */}
            <path d="M 224 78 L 222 96 C 220 102, 230 110, 240 128" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            {/* Trench Coat Body with Natural Fabric Movement */}
            <path
              d="M 222 96 C 215 130, 218 170, 230 200"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Chic belted waistline detail */}
            <path d="M 218 135 L 235 132" stroke={strokeTeal} strokeWidth="1.3" />
            {/* Walking Stride Legs & Ankle Booties */}
            <path d="M 226 200 L 214 218 L 202 220" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 234 200 L 244 218 L 256 220" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            {/* Left Arm Holding Shoulder Bag Strap */}
            <path d="M 234 100 C 230 120, 232 145, 236 155" stroke={strokeInk} strokeWidth="1.4" strokeLinecap="round" />
            {/* Right Arm Extended to Receive the Note */}
            <path
              d="M 220 105 C 195 108, 160 108, 120 106"
              stroke={strokeTeal}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Fingers gracefully opening to receive */}
            <path d="M 120 106 C 112 105, 105 107, 100 104" stroke={strokeTeal} strokeWidth="1.4" strokeLinecap="round" />
          </g>
        </g>

        {/* ===================================================================== */}
        {/* SCENE 2: Coin Rolls Across Full Screen → Passerby Bends Down & Takes */}
        {/* ===================================================================== */}
        <g className={currentScene === 2 ? 'lineart-scene-active' : 'lineart-scene-inactive'}>
          {/* Continuous Rolling Coin Traveling all the way from Left (x=160) to Right (x=920) */}
          <g transform="translate(160, 384)">
            <g className="animate-coin-cross-roll">
              {/* Gold outer coin rim */}
              <circle cx="0" cy="0" r="16" stroke="url(#coinGrad)" strokeWidth="1.8" fill={fillGold} />
              {/* Inner minted milled ring */}
              <circle cx="0" cy="0" r="11" stroke={strokeGold} strokeWidth="1" strokeDasharray="3 3" />
              {/* Realistic currency mark / coin spoke */}
              <line x1="-6" y1="0" x2="6" y2="0" stroke={strokeGold} strokeWidth="1.2" strokeLinecap="round" />
              <line x1="0" y1="-6" x2="0" y2="6" stroke={strokeGold} strokeWidth="1.2" strokeLinecap="round" />
              {/* Sparkles hopping off ground */}
              <circle cx="-16" cy="8" r="1.5" fill={strokeGold} opacity="0.7" />
              <circle cx="-24" cy="4" r="1" fill={strokeTeal} opacity="0.5" />
            </g>
          </g>

          {/* Right Figure: Passerby Approaching, Bending Ergonomically, and Plucking Coin */}
          <g transform="translate(920, 180)" className="animate-passerby-walk">
            {/* Realistic Ergonomic Bend Pose (Hip hinge, knee flex, outstretched arm) */}
            {/* Head tilted downward tracking the rolling coin */}
            <path
              d="M 60 75 C 54 70, 58 56, 70 56 C 80 56, 88 66, 84 78 C 80 86, 72 90, 64 86"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Spine hinged forward at 40 degrees with realistic athletic contour */}
            <path
              d="M 72 85 C 85 105, 105 135, 120 160"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Flexed knees in realistic squat / stride */}
            <path
              d="M 120 160 L 126 190 L 110 218 L 96 220"
              stroke={strokeInk}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M 124 160 L 148 190 L 160 218 L 174 220"
              stroke={strokeInk}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Left arm balancing back */}
            <path d="M 88 115 C 105 125, 120 135, 130 130" stroke={strokeInk} strokeWidth="1.4" strokeLinecap="round" />
            {/* Right arm reaching fluidly down to the floor at the coin's stop point */}
            <path
              d="M 74 92 C 55 125, 30 170, 10 212"
              stroke={strokeEmerald}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Fingers cupping the ground where the coin stops */}
            <path d="M 10 212 C 5 214, 0 218, -4 216 M 10 212 C 8 217, 4 220, 0 220" stroke={strokeEmerald} strokeWidth="1.4" strokeLinecap="round" />

            {/* Discovery Starburst Aura */}
            <g transform="translate(0, 214)" className="animate-glisten">
              <line x1="0" y1="-12" x2="0" y2="-6" stroke={strokeGold} strokeWidth="1.5" strokeLinecap="round" />
              <line x1="-8" y1="-8" x2="-3" y2="-5" stroke={strokeGold} strokeWidth="1.2" strokeLinecap="round" />
              <line x1="8" y1="-8" x2="3" y2="-5" stroke={strokeEmerald} strokeWidth="1.2" strokeLinecap="round" />
            </g>
          </g>
        </g>

        {/* ===================================================================== */}
        {/* SCENE 3: Boutique Counter Purchase (Seamless Counter Slide & Handover)*/}
        {/* ===================================================================== */}
        <g className={currentScene === 3 ? 'lineart-scene-active' : 'lineart-scene-inactive'}>
          {/* Left: Modern Minimalist Architectural Counter & Polite Shop Owner */}
          <g transform="translate(300, 160)">
            {/* Modern Minimalist Pendant Wire & Lamp overhead */}
            <line x1="160" y1="0" x2="160" y2="60" stroke={strokeInkFaint} strokeWidth="1" strokeDasharray="3 3" />
            <path d="M 148 60 L 172 60 L 165 72 L 155 72 Z" stroke={strokeGold} strokeWidth="1.2" fill={fillGold} />

            {/* Shopkeeper Behind Counter (Refined hospitality posture) */}
            <path
              d="M 90 62 C 84 56, 88 44, 98 44 C 108 44, 116 54, 112 66 C 108 74, 98 78, 92 74"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Apron / Vest contour */}
            <path d="M 94 76 L 90 140 M 108 76 L 112 140" stroke={strokeInk} strokeWidth="1.4" strokeLinecap="round" />
            {/* Arms resting on counter extending open palm to receive coin */}
            <path
              d="M 92 90 C 110 110, 138 128, 178 138"
              stroke={strokeEmerald}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Open receiving hand */}
            <path d="M 178 138 C 185 137, 192 138, 196 135" stroke={strokeEmerald} strokeWidth="1.4" strokeLinecap="round" />

            {/* Sleek Polished Counter Surface (y = 140 -> ground y = 240) */}
            {/* Countertop slab */}
            <rect x="60" y="140" width="260" height="8" rx="2" stroke={strokeTeal} strokeWidth="1.5" fill="rgba(45, 212, 191, 0.05)" />
            {/* Slender architectural counter legs */}
            <line x1="80" y1="148" x2="80" y2="240" stroke={strokeInk} strokeWidth="1.5" />
            <line x1="300" y1="148" x2="300" y2="240" stroke={strokeInk} strokeWidth="1.5" />

            {/* Glass Cloche / Display jar with boutique item */}
            <path d="M 115 140 C 115 115, 135 115, 135 140 Z" stroke={strokeInkFaint} strokeWidth="1" />
            <circle cx="125" cy="113" r="2.5" stroke={strokeInkFaint} strokeWidth="1" />

            {/* Coin sliding across polished counter from right to left */}
            <g className="animate-coin-counter-slide" transform="translate(196, 136)">
              <circle cx="0" cy="0" r="6" stroke={strokeGold} strokeWidth="1.5" fill={fillGold} />
              <line x1="-4" y1="0" x2="4" y2="0" stroke={strokeGold} strokeWidth="1" />
            </g>

            {/* Packaged purchase item moving across counter to customer */}
            <g className="animate-product-handover" transform="translate(150, 122)">
              <rect x="0" y="0" width="18" height="18" rx="2" stroke={strokeEmerald} strokeWidth="1.4" fill={fillEmerald} />
              <line x1="9" y1="0" x2="9" y2="18" stroke={strokeEmerald} strokeWidth="1" strokeDasharray="2 2" />
            </g>
          </g>

          {/* Right: Female Customer Stepping to Counter to Complete Purchase */}
          <g transform="translate(680, 180)">
            {/* Elegant Walking Silhouette */}
            <path
              d="M 180 44 C 188 44, 196 54, 194 66 C 192 78, 180 84, 172 76 C 166 68, 168 52, 178 46"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Long Coat Body */}
            <path
              d="M 176 86 C 168 120, 172 165, 184 200"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Legs */}
            <path d="M 180 200 L 170 218 L 158 220" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 188 200 L 198 218 L 210 220" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            {/* Shoulder tote bag strap */}
            <path d="M 180 92 C 172 110, 168 140, 172 165" stroke={strokeTeal} strokeWidth="1.3" strokeDasharray="3 3" />
            {/* Arm extending forward to place payment on counter */}
            <path
              d="M 174 95 C 150 105, 120 115, 80 120"
              stroke={strokeEmerald}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>
        </g>

        {/* ===================================================================== */}
        {/* SCENE 4: Wallet Drops Coin → Bouncing Trajectory → Child Sprints      */}
        {/* ===================================================================== */}
        <g className={currentScene === 4 ? 'lineart-scene-active' : 'lineart-scene-inactive'}>
          {/* Left: Man with Open Wallet as Coin Slips Out */}
          <g transform="translate(240, 180)">
            {/* Realistic Man Silhouette */}
            <path
              d="M 72 45 C 66 38, 70 24, 84 22 C 96 20, 106 30, 102 44 C 100 56, 90 62, 78 58"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Torso & Coat */}
            <path
              d="M 86 68 C 76 110, 78 160, 68 200"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path d="M 70 200 L 66 218 L 54 220" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 82 200 L 86 218 L 98 220" stroke={strokeInk} strokeWidth="1.5" strokeLinecap="round" />
            {/* Both Hands Holding Open Wallet at waist */}
            <path d="M 84 85 C 98 100, 118 112, 138 115" stroke={strokeTeal} strokeWidth="1.5" strokeLinecap="round" />
            {/* Realistic Bifold Wallet Contour */}
            <path
              d="M 136 108 L 160 102 L 168 124 L 144 128 Z"
              stroke={strokeEmerald}
              strokeWidth="1.5"
              fill={fillEmerald}
            />

            {/* Visual Guide Arcs showing the Realistic Diminishing Bounces */}
            <path
              d="M 160 115 Q 210 218 260 218 Q 300 150 340 218 Q 370 180 400 218 L 560 218"
              stroke="url(#moneyStreamGrad)"
              strokeWidth="1.2"
              strokeDasharray="3 4"
              opacity="0.4"
            />

            {/* Animated Bouncing Physics Coin Traveling Across the Canvas */}
            <g className="animate-coin-physics-bounce" transform="translate(160, 115)">
              <circle cx="0" cy="0" r="10" stroke={strokeGold} strokeWidth="1.8" fill={fillGold} />
              <circle cx="0" cy="0" r="6" stroke={strokeGold} strokeWidth="1" strokeDasharray="2 2" />
            </g>
          </g>

          {/* Right: Lively Small Boy Sprinting In Mid-Stride to Catch the Rolling Coin */}
          <g transform="translate(860, 235)" className="animate-child-sprint">
            {/* Boy's Proportions (~6 heads tall, sporty hoodie, backwards cap, sneakers) */}
            {/* Backwards baseball cap with visor */}
            <path
              d="M 120 30 C 112 30, 106 38, 108 48 C 110 58, 122 62, 130 55 C 136 48, 132 35, 124 31"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Backwards Cap Visor */}
            <path d="M 106 42 L 92 40" stroke={strokeTeal} strokeWidth="1.5" strokeLinecap="round" />

            {/* Dynamic forward-leaning sprint spine (25-degree athletic sprint lean) */}
            <path
              d="M 122 55 C 135 75, 130 105, 122 135"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />

            {/* High-tempo Running Legs */}
            {/* Leading front leg driving low to scoop */}
            <path
              d="M 122 135 L 146 155 L 140 162 L 152 164"
              stroke={strokeInk}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Trailing back leg kicking up in mid-stride air phase */}
            <path
              d="M 122 135 L 98 150 L 76 142 L 66 148"
              stroke={strokeInk}
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Front Arm Reaching Down in Motion to Catch the Rolling Coin */}
            <path
              d="M 122 70 C 100 95, 75 130, 52 160"
              stroke={strokeEmerald}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* Excited Catching Hand */}
            <circle cx="50" cy="162" r="7" stroke={strokeGold} strokeWidth="1.6" fill={fillGold} />

            {/* Back Arm Pumping Backward in Athletic Sprint */}
            <path
              d="M 125 72 C 145 85, 160 92, 172 86"
              stroke={strokeTeal}
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Sparkles of Childhood Joy */}
            <g transform="translate(50, 150)" className="animate-glisten">
              <line x1="0" y1="-10" x2="0" y2="-4" stroke={strokeGold} strokeWidth="1.4" strokeLinecap="round" />
              <line x1="-8" y1="-6" x2="-3" y2="-3" stroke={strokeGold} strokeWidth="1.2" strokeLinecap="round" />
              <line x1="8" y1="-6" x2="3" y2="-3" stroke={strokeEmerald} strokeWidth="1.2" strokeLinecap="round" />
            </g>
          </g>
        </g>
      </svg>

      {/* ── Discreet Scene Timeline Indicator (Very subtle in bottom corner) ── */}
      <div className="absolute bottom-3 right-4 sm:right-8 z-10 flex items-center space-x-1.5 opacity-25 hover:opacity-80 transition-opacity duration-300 pointer-events-auto">
        {[0, 1, 2, 3, 4].map((idx) => (
          <button
            key={idx}
            onClick={() => setCurrentScene(idx)}
            title={`Story scene ${idx + 1}`}
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
