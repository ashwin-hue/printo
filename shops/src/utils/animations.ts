import gsap from 'gsap';

export const animateFadeInUp = (element: HTMLElement | string, delay: number = 0) => {
  if (typeof window === 'undefined') return;
  gsap.fromTo(
    element,
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', delay }
  );
};

export const animateStaggerChildren = (container: HTMLElement | string, childSelector: string, stagger: number = 0.1) => {
  if (typeof window === 'undefined') return;
  gsap.fromTo(
    `${container} ${childSelector}`,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger }
  );
};

export const pulseAttention = (element: HTMLElement | string) => {
  if (typeof window === 'undefined') return;
  gsap.fromTo(
    element,
    { scale: 0.98 },
    { scale: 1.02, duration: 0.3, yoyo: true, repeat: 1, ease: 'power1.inOut' }
  );
};

