// src/utils/animations.js
// Shared animation presets for consistent micro-interactions

// Smooth press effect — use on all interactive motion.elements
export const pressAnimation = {
	whileTap: { scale: 0.92 },
	whileHover: { scale: 1.03 },
	transition: { type: "spring", stiffness: 400, damping: 15 },
};

// Softer press for cards
export const cardPress = {
	whileTap: { scale: 0.98 },
	whileHover: { scale: 1.01, y: -2 },
	transition: { type: "spring", stiffness: 300, damping: 20 },
};

// Gentle press for small chips/badges
export const chipPress = {
	whileTap: { scale: 0.93 },
	transition: { type: "spring", stiffness: 500, damping: 15 },
};

// Float-in animation for staggered lists
export const listItemVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: (i) => ({
		opacity: 1,
		y: 0,
		transition: { delay: i * 0.06, type: "spring", stiffness: 300, damping: 24 },
	}),
};

// Fade-up entrance
export const fadeUp = {
	initial: { opacity: 0, y: 24 },
	animate: { opacity: 1, y: 0 },
	transition: { type: "spring", stiffness: 260, damping: 20 },
};

// Scale pop entrance
export const scalePop = {
	initial: { opacity: 0, scale: 0.85 },
	animate: { opacity: 1, scale: 1 },
	transition: { type: "spring", stiffness: 300, damping: 22 },
};

// Slide up from bottom (modals)
export const slideUp = {
	initial: { y: "100%" },
	animate: { y: 0 },
	exit: { y: "100%" },
	transition: { type: "spring", stiffness: 300, damping: 30 },
};
