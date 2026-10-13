import React, { useEffect, useRef, useState } from 'react';

export const GlobalCursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const rippleRef = useRef(null);

  const [enabled, setEnabled] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    // 1. Accessibility & Touch Detection
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isTouch || prefersReducedMotion) {
      setEnabled(false);
      return;
    }

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let animationFrameId;

    const handlePointerMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }

      // Check if hovering interactive target
      const target = e.target;
      if (target) {
        const isInteractive = Boolean(
          target.closest('a, button, [role="button"], input, textarea, select, .cursor-pointer')
        );
        setIsHovered(isInteractive);

        // Localized Halo card spotlight calculation
        const card = target.closest('.halo-card, [data-halo="true"], .bento-card');
        if (card) {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          card.style.setProperty('--mouse-x', `${x}px`);
          card.style.setProperty('--mouse-y', `${y}px`);
        }
      }
    };

    const handlePointerDown = () => {
      setIsClicking(true);
      if (rippleRef.current) {
        rippleRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) scale(1.6)`;
        rippleRef.current.style.opacity = '0.5';
      }
    };

    const handlePointerUp = () => {
      setIsClicking(false);
      if (rippleRef.current) {
        rippleRef.current.style.opacity = '0';
      }
    };

    // Smooth spring trailing loop for the outer halo ring
    const render = () => {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Inner glowing dot */}
      <div
        ref={dotRef}
        className={`fixed top-0 left-0 -ml-1 -mt-1 w-2 h-2 rounded-full bg-gradient-to-tr from-brand-400 to-sky-400 shadow-[0_0_12px_#8b5cf6] transition-transform duration-75 will-change-transform ${
          isClicking ? 'scale-75' : isHovered ? 'scale-150' : 'scale-100'
        }`}
      />

      {/* Outer trailing halo ring */}
      <div
        ref={ringRef}
        className={`fixed top-0 left-0 -ml-4 -mt-4 w-8 h-8 rounded-full border border-brand-400/50 bg-brand-500/10 backdrop-blur-[1px] shadow-[0_0_20px_rgba(139,92,246,0.35)] transition-[width,height,opacity,border-color] duration-200 ease-out will-change-transform ${
          isClicking
            ? 'scale-90 border-sky-400/80 bg-sky-500/20'
            : isHovered
            ? 'scale-125 border-brand-400/80 bg-brand-500/20 shadow-[0_0_25px_rgba(56,189,248,0.4)]'
            : 'scale-100 opacity-80'
        }`}
      />

      {/* Click ripple */}
      <div
        ref={rippleRef}
        className="fixed top-0 left-0 -ml-5 -mt-5 w-10 h-10 rounded-full border border-sky-400 opacity-0 transition-[transform,opacity] duration-300 pointer-events-none will-change-transform"
      />
    </div>
  );
};

export default GlobalCursor;
