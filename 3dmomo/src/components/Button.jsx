import React from 'react';

export function Button({
                           variant = 'primary',
                           size = 'md',
                           children,
                           icon,
                           className = '',
                           ...props
                       }) {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-[rgb(0,255,133)] text-black hover:bg-[rgb(0,255,170)] shadow-[0_0_30px_rgba(0,255,133,0.4)] hover:shadow-[0_0_50px_rgba(0,255,133,0.6)]',
        secondary: 'bg-[rgba(255,255,255,0.06)] text-white border border-[rgba(0,255,133,0.3)] hover:border-[rgb(0,255,133)] hover:text-[rgb(0,255,133)] backdrop-blur-md',
        ghost: 'text-[rgba(255,255,255,0.7)] hover:text-[rgb(0,255,133)] hover:bg-[rgba(255,255,255,0.03)]',
        outline: 'border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.7)] hover:border-[rgb(0,255,133)] hover:text-[rgb(0,255,133)]'
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm rounded-lg',
        md: 'px-6 py-3 text-base rounded-xl',
        lg: 'px-8 py-4 text-lg rounded-xl'
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {icon && <span>{icon}</span>}
            {children}
        </button>
    );
}