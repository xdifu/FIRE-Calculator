import React, { useRef, useEffect, memo } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    variant?: 'wisdom' | 'growth' | 'life' | 'default';
    onChange: (val: number) => void;
    onCommit: (val: number) => void;
    className?: string;
}

export const Slider = memo(({
    label, value, min, max, step, onChange, onCommit, unit = "", variant = "default", className
}: SliderProps) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const fillRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const rafId = useRef<number | null>(null);

    // Theme Configuration
    const themes = {
        default: {
            text: 'text-slate-600',
            fill: 'bg-slate-600',
            thumb: 'border-slate-200 shadow-slate-500/20',
            glow: 'shadow-[0_0_15px_rgba(71,85,105,0.3)]',
        },
        wisdom: {
            text: 'text-wisdom-600',
            fill: 'bg-gradient-to-r from-wisdom-400 to-wisdom-600',
            thumb: 'border-wisdom-100 shadow-wisdom-glow',
            glow: 'shadow-[0_0_20px_rgba(124,58,237,0.4)]',
        },
        growth: {
            text: 'text-growth-600',
            fill: 'bg-gradient-to-r from-growth-400 to-growth-600',
            thumb: 'border-growth-100 shadow-growth-glow',
            glow: 'shadow-[0_0_20px_rgba(20,184,166,0.4)]',
        },
        life: {
            text: 'text-life-600',
            fill: 'bg-gradient-to-r from-life-400 to-life-600',
            thumb: 'border-life-100 shadow-life-glow',
            glow: 'shadow-[0_0_20px_rgba(244,63,94,0.4)]',
        },
    };

    const theme = themes[variant] || themes.default;

    const getPercentage = (val: number) => Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));

    // Direct DOM manipulation for 60fps performance
    const updateUI = (percentage: number) => {
        if (fillRef.current) fillRef.current.style.width = `${percentage}%`;
        if (thumbRef.current) thumbRef.current.style.left = `${percentage}%`;
    };

    // Sync with external value
    useEffect(() => {
        if (!isDragging.current) {
            updateUI(getPercentage(value));
        }
    }, [value, min, max]);

    const handlePointerDown = (e: React.PointerEvent) => {
        isDragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        handlePointerMove(e);

        // Add "grabbing" scale effect
        if (thumbRef.current) {
            thumbRef.current.style.transform = 'translate(-50%, -50%) scale(1.2)';
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = (x / rect.width) * 100;

        const rawValue = min + (percentage / 100) * (max - min);
        const steppedValue = Math.round(rawValue / step) * step;
        const clampedValue = Math.min(max, Math.max(min, steppedValue));

        if (rafId.current) cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(() => {
            // Visual follow
            updateUI(percentage);
            // Snap UI to step if we want strict visual feedback, but smooth is better for "Liquid" feel.
            // We'll stick to smooth visual, stepped value.
        });

        onChange(clampedValue);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging.current) return;
        isDragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);

        // Reset scale
        if (thumbRef.current) {
            thumbRef.current.style.transform = 'translate(-50%, -50%) scale(1)';
        }

        // Final commit logic
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = (x / rect.width) * 100;
        const rawValue = min + (percentage / 100) * (max - min);
        const steppedValue = Math.round(rawValue / step) * step;
        const clampedValue = Math.min(max, Math.max(min, steppedValue));

        // Snap UI to final value
        updateUI(getPercentage(clampedValue));
        onCommit(clampedValue);
    };

    return (
        <div className={twMerge("mb-8 group select-none", className)}>
            <div className="flex justify-between items-end mb-3 px-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-hover:text-slate-600 font-heading">
                    {label}
                </label>
                <div className="flex items-baseline gap-1">
                    <span className={clsx("text-2xl font-mono font-bold tracking-tight transition-colors", theme.text)}>
                        {value}
                    </span>
                    <span className="text-xs font-medium text-slate-400">{unit}</span>
                </div>
            </div>

            <div
                className="relative w-full h-8 flex items-center cursor-pointer touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                {/* Track Background */}
                <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
                    {/* Active Fill */}
                    <div
                        ref={fillRef}
                        className={clsx("h-full rounded-full transition-none opacity-90", theme.fill)}
                        style={{ width: `${getPercentage(value)}%` }}
                    />
                </div>

                {/* Thumb (Liquid Bead) */}
                <div
                    ref={thumbRef}
                    className={clsx(
                        "absolute top-1/2 w-6 h-6 -translate-x-1/2 -translate-y-1/2",
                        "bg-white rounded-full border-2 cursor-grab active:cursor-grabbing",
                        "flex items-center justify-center transition-transform duration-100 ease-out",
                        theme.thumb,
                        theme.glow
                    )}
                    style={{ left: `${getPercentage(value)}%` }}
                >
                    <div className={clsx("w-1.5 h-1.5 rounded-full opacity-50", theme.fill.replace('bg-gradient-to-r', 'bg-slate-400'))} />
                </div>
            </div>
        </div>
    );
});
