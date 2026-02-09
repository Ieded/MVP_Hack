import React, { forwardRef } from 'react';

export const Input = forwardRef(({ label, error, className = '', ...props }, ref) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm text-[rgba(255,255,255,0.7)] mb-2">
                    {label}
                </label>
            )}
            <input
                ref={ref}
                className={`w-full px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-xl text-white placeholder:text-[rgba(255,255,255,0.45)] focus:outline-none focus:border-[rgb(0,255,133)] transition-colors ${className}`}
                {...props}
            />
            {error && (
                <p className="text-[rgb(255,56,96)] text-sm mt-1">{error}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';