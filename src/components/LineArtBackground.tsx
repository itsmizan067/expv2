import React, { useEffect, useState } from 'react';
import './LineArtBackground.css';

interface LineArtBackgroundProps {
  className?: string;
}

export const LineArtBackground: React.FC<LineArtBackgroundProps> = ({ className = '' }) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  // Check user motion preferences for accessibility
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Premium brand color palette
  const strokeInk = 'rgba(148, 163, 184, 0.38)'; // Delicate slate line
  const strokeInkSubtle = 'rgba(148, 163, 184, 0.18)'; // Ultra-faint grid line
  const strokeEmerald = 'rgba(52, 211, 153, 0.75)'; // Vibrant money/growth line
  const strokeTeal = 'rgba(45, 212, 191, 0.65)'; // Dynamic flow line
  const strokeGold = 'rgba(251, 191, 36, 0.85)'; // Glistening coin gold
  const strokeRose = 'rgba(244, 63, 94, 0.65)'; // Expense outflow line

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none absolute inset-0 overflow-hidden z-0 ${className}`}
      style={{
        maskImage:
          'radial-gradient(ellipse 65% 72% at 50% 46%, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.12) 42%, rgba(0, 0, 1) 84%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 65% 72% at 50% 46%, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.12) 42%, rgba(0, 0, 1) 84%)',
      }}
    >
      {/* ── Unified Panoramic Vector Canvas (1440 x 540) ── */}
      <svg
        className="w-full h-full min-h-[540px] max-h-[720px] object-cover"
        viewBox="0 0 1440 540"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          {/* Gold Coin Radial Gradient */}
          <radialGradient id="goldCoinGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>

          {/* Emerald Flow Glow Gradient */}
          <linearGradient id="emeraldFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(52, 211, 153, 0.1)" />
            <stop offset="30%" stopColor="rgba(52, 211, 153, 0.8)" />
            <stop offset="70%" stopColor="rgba(45, 212, 191, 0.8)" />
            <stop offset="100%" stopColor="rgba(45, 212, 191, 0.1)" />
          </linearGradient>

          {/* Rose Expense Flow Gradient */}
          <linearGradient id="roseExpenseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(244, 63, 94, 0.8)" />
            <stop offset="100%" stopColor="rgba(244, 63, 94, 0)" />
          </linearGradient>

          {/* Soft Glow Filter for Hubs & Particles */}
          <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── Ground Horizon Runway at y = 460 (Connects the Entire System) ── */}
        <g opacity="0.4">
          <line x1="40" y1="460" x2="1400" y2="460" stroke={strokeInk} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="40" y1="468" x2="1400" y2="468" stroke={strokeInkSubtle} strokeWidth="0.8" strokeDasharray="4 8" />
          {[120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200, 1320].map((x) => (
            <line key={x} x1={x} y1="460" x2={x - 12} y2="474" stroke={strokeInkSubtle} strokeWidth="0.9" />
          ))}
        </g>

        {/* ========================================================================= */}
        {/* 5. MONEY FLOW NETWORK (Continuous Living Financial Circuit)                */}
        {/* Thin flowing lines connecting wallet → bank → account → expense points.   */}
        {/* ========================================================================= */}
        <g opacity="0.35">
          {/* Upper Circuit Flow (Left Wallet/Income to Right Bank Hub) */}
          <path
            d="M 180 220 C 380 90, 880 90, 1220 200"
            stroke="url(#emeraldFlowGrad)"
            strokeWidth="1.4"
            strokeLinecap="round"
            className="animate-network-stream"
          />

          {/* Mid-Lower Connecting Flow Spine */}
          <path
            d="M 220 380 C 460 330, 980 330, 1260 380"
            stroke={strokeTeal}
            strokeWidth="1"
            strokeDasharray="4 8"
            className="animate-network-stream-reverse"
          />

          {/* Vertical Branch lines with network connection nodes */}
          <line x1="180" y1="220" x2="180" y2="380" stroke={strokeInkSubtle} strokeWidth="1" strokeDasharray="3 4" />
          <line x1="1220" y1="200" x2="1220" y2="380" stroke={strokeInkSubtle} strokeWidth="1" strokeDasharray="3 4" />

          {/* Circuit Intersection Dots */}
          <circle cx="180" cy="220" r="3" fill={strokeEmerald} className="animate-node-pulse" />
          <circle cx="1220" cy="200" r="3.5" fill={strokeTeal} className="animate-node-pulse" />
          <circle cx="180" cy="380" r="2.5" fill={strokeEmerald} />
          <circle cx="1260" cy="380" r="2.5" fill={strokeRose} />
        </g>

        {/* ========================================================================= */}
        {/* 1. ROLLING COIN                                                           */}
        {/* Single coin enters from one side, rolls smoothly across, gently rotates.  */}
        {/* Occasionally another coin follows a different path.                       */}
        {/* ========================================================================= */}
        <g>
          {/* Primary Coin (Rolling smoothly along lower horizon runway from Left to Right) */}
          <g transform="translate(0, 446)">
            <g className="animate-rolling-coin-1" filter="url(#goldGlow)">
              <circle cx="0" cy="0" r="13" fill="url(#goldCoinGrad)" stroke={strokeGold} strokeWidth="1.8" />
              <circle cx="0" cy="0" r="9" stroke="#fef08a" strokeWidth="0.9" strokeDasharray="2.5 2.5" fill="rgba(245, 158, 11, 0.2)" />
              {/* Currency cross emblem */}
              <line x1="-4" y1="0" x2="4" y2="0" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="0" y1="-4" x2="0" y2="4" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
            </g>
          </g>

          {/* Secondary Coin (Follows alternate upper trajectory from Right to Left) */}
          <g transform="translate(0, 115)">
            <g className="animate-rolling-coin-2" filter="url(#goldGlow)">
              <circle cx="0" cy="0" r="10.5" fill="url(#goldCoinGrad)" stroke={strokeGold} strokeWidth="1.5" />
              <circle cx="0" cy="0" r="7" stroke="#fef08a" strokeWidth="0.8" strokeDasharray="2 2" fill="rgba(245, 158, 11, 0.2)" />
              <line x1="-3" y1="0" x2="3" y2="0" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
            </g>
          </g>
        </g>

        {/* ========================================================================= */}
        {/* 2. WALLET & CASH (Left Flank, x: 140 - 280)                                */}
        {/* A minimal wallet outline appears, opens slightly, cash emerges along curve */}
        {/* ========================================================================= */}
        <g transform="translate(140, 185)">
          {/* Minimal Geometric Wallet Outline with gentle breathing pulse */}
          <g className="animate-wallet-pulse">
            {/* Wallet back body */}
            <rect x="0" y="10" width="56" height="38" rx="5" fill="rgba(15, 23, 42, 0.85)" stroke={strokeEmerald} strokeWidth="1.6" />
            {/* Open flap angle */}
            <path d="M 0 16 L 38 12 C 48 10, 56 16, 56 24 L 56 36" stroke={strokeTeal} strokeWidth="1.4" strokeLinecap="round" />
            {/* Minimal latch button */}
            <circle cx="48" cy="28" r="3" fill="rgba(52, 211, 153, 0.3)" stroke={strokeEmerald} strokeWidth="1.2" />
            {/* Inner credit card / cash slip line */}
            <line x1="8" y1="18" x2="32" y2="15" stroke={strokeInk} strokeWidth="1.2" strokeLinecap="round" />
          </g>

          {/* Erupting Cash Notes / Coins moving along the flow curve toward bank hub */}
          <g transform="translate(28, 14)">
            {/* Cash Note 1 */}
            <g className="animate-cash-float-1">
              <rect x="0" y="0" width="28" height="17" rx="2" fill="rgba(52, 211, 153, 0.15)" stroke={strokeEmerald} strokeWidth="1.3" />
              <circle cx="14" cy="8.5" r="3.5" stroke={strokeEmerald} strokeWidth="1" />
            </g>

            {/* Cash Note 2 */}
            <g className="animate-cash-float-2">
              <rect x="0" y="0" width="24" height="15" rx="2" fill="rgba(45, 212, 191, 0.15)" stroke={strokeTeal} strokeWidth="1.2" />
              <circle cx="12" cy="7.5" r="3" stroke={strokeTeal} strokeWidth="0.9" />
            </g>
          </g>
        </g>

        {/* ========================================================================= */}
        {/* 3. BANK & INCOME HUB (Right Flank, x: 1180 - 1300)                         */}
        {/* Coins/particles travel from peripheral points toward bank; bank pulses.   */}
        {/* ========================================================================= */}
        <g transform="translate(1200, 160)">
          {/* Classical Minimalist Bank Architecture Icon (Softly pulsing on income) */}
          <g className="animate-bank-hub">
            {/* Roof / Pediment Triangle */}
            <polygon points="36,4 4,24 68,24" fill="rgba(15, 23, 42, 0.85)" stroke={strokeEmerald} strokeWidth="1.6" strokeLinejoin="round" />
            {/* Architrave bar */}
            <line x1="8" y1="28" x2="64" y2="28" stroke={strokeEmerald} strokeWidth="1.5" strokeLinecap="round" />
            {/* 3 Slender Classical Columns */}
            <line x1="16" y1="28" x2="16" y2="52" stroke={strokeEmerald} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="36" y1="28" x2="36" y2="52" stroke={strokeEmerald} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="56" y1="28" x2="56" y2="52" stroke={strokeEmerald} strokeWidth="1.8" strokeLinecap="round" />
            {/* Base Foundation Bar */}
            <rect x="4" y="52" width="64" height="6" rx="1.5" fill="rgba(15, 23, 42, 0.85)" stroke={strokeEmerald} strokeWidth="1.5" />
            {/* Central Vault Crest */}
            <circle cx="36" cy="18" r="2.5" fill={strokeGold} />
          </g>

          {/* Incoming Glowing Coin Particles converging to Bank with Soft Pulses */}
          <g transform="translate(36, 32)">
            <g className="animate-income-particle-1">
              <circle cx="0" cy="0" r="5" fill="url(#goldCoinGrad)" stroke={strokeGold} strokeWidth="1.2" filter="url(#goldGlow)" />
            </g>
            <g className="animate-income-particle-2">
              <circle cx="0" cy="0" r="4.5" fill="rgba(52, 211, 153, 0.5)" stroke={strokeEmerald} strokeWidth="1.2" filter="url(#emeraldGlow)" />
            </g>
          </g>
        </g>

        {/* ========================================================================= */}
        {/* 4. EXPENSES (Right Flank Lower Branch, x: 1220 - 1340)                     */}
        {/* Coins/cash move away from account toward abstract expense symbols.        */}
        {/* ========================================================================= */}
        <g transform="translate(1220, 360)">
          {/* Branching Outflow Flow Paths */}
          <path d="M 0 0 C 35 20, 55 45, 80 50" stroke="url(#roseExpenseGrad)" strokeWidth="1.3" strokeDasharray="3 4" />
          <path d="M 0 0 C 35 -15, 60 -25, 90 -30" stroke="url(#roseExpenseGrad)" strokeWidth="1.3" strokeDasharray="3 4" />

          {/* Abstract Expense Glyphs on Peripheral Edges */}
          {/* 1. Housing / Rent Icon Outline */}
          <g transform="translate(85, 42)" opacity="0.65">
            <polygon points="10,0 2,7 18,7" stroke={strokeRose} strokeWidth="1.2" fill="none" />
            <rect x="4" y="7" width="12" height="10" stroke={strokeRose} strokeWidth="1.2" fill="none" />
          </g>

          {/* 2. Shopping / Living Icon Outline */}
          <g transform="translate(95, -38)" opacity="0.65">
            <rect x="0" y="5" width="16" height="12" rx="2" stroke={strokeRose} strokeWidth="1.2" fill="none" />
            <path d="M 4 5 C 4 1, 12 1, 12 5" stroke={strokeRose} strokeWidth="1.1" fill="none" />
          </g>

          {/* Moving Expense Particles Drifting Away & Fading */}
          <g className="animate-expense-drift-1">
            <circle cx="0" cy="0" r="4" fill="rgba(244, 63, 94, 0.4)" stroke={strokeRose} strokeWidth="1.2" />
          </g>
          <g className="animate-expense-drift-2">
            <circle cx="0" cy="0" r="3.5" fill="rgba(244, 63, 94, 0.4)" stroke={strokeRose} strokeWidth="1.2" />
          </g>
        </g>

        {/* ========================================================================= */}
        {/* 6. BALANCE / FINANCIAL PROGRESS (Subtle Abstract Graph & Circular Gauge)   */}
        {/* Self-drawing line chart and radial progress ring. Decorative only.        */}
        {/* ========================================================================= */}
        {/* Abstract Upward Trend Line (Right Edge, x: 1040 - 1160) */}
        <g transform="translate(1040, 290)">
          {/* Subtle horizontal grid lines */}
          <line x1="0" y1="40" x2="110" y2="40" stroke={strokeInkSubtle} strokeWidth="0.8" strokeDasharray="3 3" />
          <line x1="0" y1="20" x2="110" y2="20" stroke={strokeInkSubtle} strokeWidth="0.8" strokeDasharray="3 3" />

          {/* Self-drawing Trend Spline */}
          <path
            d="M 5 45 C 30 42, 45 28, 65 30 C 85 32, 95 10, 110 5"
            stroke={strokeEmerald}
            strokeWidth="1.6"
            strokeLinecap="round"
            className="animate-chart-trace"
          />
          {/* Peak Value Sparkle */}
          <circle cx="110" cy="5" r="2.5" fill={strokeEmerald} className="animate-sparkle-glint" />
        </g>

        {/* Circular Progress Gauge (Left Edge, x: 210 - 270) */}
        <g transform="translate(240, 140)">
          {/* Gauge background track */}
          <circle cx="0" cy="0" r="24" stroke={strokeInkSubtle} strokeWidth="2" strokeDasharray="3 3" fill="none" />
          {/* Dynamic Progress Trace */}
          <circle
            cx="0"
            cy="0"
            r="24"
            stroke={strokeTeal}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            className="animate-gauge-trace"
          />
          {/* Center Target Indicator */}
          <circle cx="0" cy="0" r="3" fill={strokeTeal} opacity="0.6" />
        </g>
      </svg>
    </div>
  );
};
