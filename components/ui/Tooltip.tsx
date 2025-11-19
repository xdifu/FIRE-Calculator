import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'bottom' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            // Calculate center of the trigger
            const centerX = rect.left + rect.width / 2 + scrollX;

            let top = 0;
            if (position === 'top') {
                top = rect.top + scrollY - 12; // 12px gap
            } else {
                top = rect.bottom + scrollY + 12; // 12px gap
            }

            setCoords({ top, left: centerX });
        }
    };

    const handleMouseEnter = () => {
        updatePosition();
        setIsVisible(true);
    };

    // Update position on scroll or resize while visible
    useEffect(() => {
        if (isVisible) {
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isVisible]);

    const tooltipContent = (
        <div
            className={`
        fixed z-[9999] w-80 p-5 pointer-events-none
        bg-white/95 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)]
        rounded-2xl text-sm text-slate-600 leading-relaxed font-medium text-justify
        transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}
            style={{
                top: coords.top,
                left: coords.left,
                transform: `translate(-50%, ${position === 'top' ? '-100%' : '0'}) scale(${isVisible ? 1 : 0.95})`,
                transformOrigin: position === 'top' ? 'bottom center' : 'top center'
            }}
        >
            {/* Subtle inner glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-wisdom-500/5 via-transparent to-growth-500/5" />

            <div className="relative z-10">
                {content}
            </div>

            {/* Arrow */}
            <div
                className={`
          absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-white/95 border-white/60 backdrop-blur-xl rotate-45
          ${position === 'top' ? '-bottom-2 border-r border-b' : '-top-2 border-l border-t'}
        `}
            />
        </div>
    );

    return (
        <>
            <div
                ref={triggerRef}
                className="relative flex items-center justify-center"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => setIsVisible(false)}
            >
                {children}
            </div>
            {createPortal(tooltipContent, document.body)}
        </>
    );
};
