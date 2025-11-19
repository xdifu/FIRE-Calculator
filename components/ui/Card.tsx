import React, { memo } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'wisdom' | 'growth' | 'life';
    className?: string;
    children: React.ReactNode;
}

export const Card = memo(({ variant = 'default', className, children, ...props }: CardProps) => {
    return (
        <div
            className={twMerge(
                "glass-panel rounded-3xl p-6 relative overflow-hidden group",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
});

interface KPICardProps {
    label: string;
    value: string | number;
    subvalue?: string;
    icon?: React.ElementType;
    variant?: 'wisdom' | 'growth' | 'life' | 'default';
    className?: string;
}

export const KPICard = memo(({ label, value, subvalue, icon: Icon, variant = 'default', className }: KPICardProps) => {
    type VariantStyles = {
        bg: string;
        text: string;
        icon: string;
        sub: string;
        shadow?: string;
    };

    const variants: Record<string, VariantStyles> = {
        default: {
            bg: 'bg-white/60',
            text: 'text-slate-800',
            icon: 'text-slate-400',
            sub: 'text-slate-500',
        },
        wisdom: {
            bg: 'bg-gradient-to-br from-wisdom-500 to-wisdom-700 text-white',
            text: 'text-white',
            icon: 'text-wisdom-100',
            sub: 'text-wisdom-100/80',
            shadow: 'shadow-wisdom-glow',
        },
        growth: {
            bg: 'bg-gradient-to-br from-growth-400 to-growth-600 text-white',
            text: 'text-white',
            icon: 'text-growth-50',
            sub: 'text-growth-100',
            shadow: 'shadow-growth-glow',
        },
        life: {
            bg: 'bg-gradient-to-br from-life-400 to-life-600 text-white',
            text: 'text-white',
            icon: 'text-life-100',
            sub: 'text-life-100/90',
            shadow: 'shadow-life-glow',
        }
    };

    const theme = variants[variant];

    return (
        <div className={twMerge(
            "relative p-6 rounded-3xl flex flex-col justify-between h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
            variant === 'default' ? "glass-panel" : theme.bg,
            theme.shadow || "shadow-sm",
            className
        )}>
            {/* Background Decor for colored cards */}
            {variant !== 'default' && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            )}

            <div className="flex justify-between items-start mb-4 relative z-10">
                <span className={clsx("text-[10px] font-bold uppercase tracking-widest font-heading", variant === 'default' ? "text-slate-400" : "text-white/80")}>
                    {label}
                </span>
                {Icon && <Icon className={clsx("w-5 h-5", theme.icon)} />}
            </div>

            <div className="relative z-10">
                <div className={clsx("text-3xl sm:text-4xl font-mono font-bold tracking-tighter mb-2", theme.text)}>
                    {value}
                </div>
                {subvalue && (
                    <div className={clsx("text-xs font-medium leading-relaxed", theme.sub)}>
                        {subvalue}
                    </div>
                )}
            </div>
        </div>
    );
});
