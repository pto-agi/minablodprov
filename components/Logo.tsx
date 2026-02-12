
import React from 'react';

interface Props {
  className?: string;
  variant?: 'icon' | 'full';
}

export const Logo: React.FC<Props> = ({ className, variant = 'full' }) => {
  // ViewBox logic:
  // Full: 0 0 1150 256 (Increased width to fit larger text properly)
  // Icon: 0 0 256 256 (Centers the droplet icon which is roughly within 0-256 x range)
  const viewBox = variant === 'icon' ? "0 0 256 256" : "0 0 1150 256";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      role="img"
      aria-label="minablodprov.se"
      className={className}
    >
      {variant === 'full' && <title>minablodprov.se</title>}

      {/* ICON GROUP - Stroke based */}
      <g 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="14" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {/* Droplet outline */}
        <path d="M128 20
                 C128 20 64 92 64 140
                 C64 184 93 220 128 220
                 C163 220 192 184 192 140
                 C192 92 128 20 128 20Z"/>
        
        {/* Upward trend line */}
        <path d="M88 158 L116 132 L140 148 L172 110"/>
        
        {/* Data points */}
        <circle cx="88" cy="158" r="4"/>
        <circle cx="116" cy="132" r="4"/>
        <circle cx="140" cy="148" r="4"/>
        <circle cx="172" cy="110" r="4"/>

        {/* "Analysis" ring */}
        <circle cx="170" cy="112" r="26"/>
        
        {/* Handle hint */}
        <path d="M189 131 L206 148"/>
      </g>

      {/* WORDMARK - Fill based (Only render if full variant) */}
      {variant === 'full' && (
        <g fill="currentColor" stroke="none">
          <text
            x="270"
            y="165"
            fontSize="96"
            fontWeight="700"
            letterSpacing="-1"
            fontFamily="Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
          >
            minablodprov.se
          </text>
        </g>
      )}
    </svg>
  );
};
