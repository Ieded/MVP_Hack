import React from 'react';

export function GlassCard({ children, className = '', hover = false, glow = false, ...props }) {
    const hoverStyles = hover ? 'hover:border-[rgba(0,255,133,0.3)] hover:bg-[rgba(255,255,255,0.06)] cursor-pointer' : '';
    const glowStyles = glow ? 'shadow-[0_0_30px_rgba(0,255,133,0.4)]' : '';

    return (
        <div
            className={`bg-[rgba(255,255,255,0.03)] backdrop-blur-md border border-[rgba(255,255,255,0.1)] rounded-xl p-6 transition-all duration-300 ${hoverStyles} ${glowStyles} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}