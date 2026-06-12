import type { Variants } from "framer-motion";

export const fadeInUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.8, ease: 'easeOut' },
  },
}

export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

export const scaleOnHoverVariants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: { type: 'spring', stiffness: 400, damping: 10 },
  },
}

export const slideInLeftVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -50,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.7,
      ease: "easeOut",
    },
  },
};


export const slideInRightVariants: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: 'easeOut' },
  },
}

// Intersection Observer hook for triggering animations on scroll
export const useInViewVariants = (variants: any) => {
  return {
    initial: variants.hidden,
    whileInView: variants.visible,
    viewport: { once: true, amount: 0.2 },
  }
}
