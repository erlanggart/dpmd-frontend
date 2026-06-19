// src/components/mobile/LottieIcon.jsx
import React from 'react';
import OptimizedLottie from '../OptimizedLottie';

/**
 * LottieIcon - Wrapper untuk Lottie animations
 * Delegasi ke OptimizedLottie: tetap loop, tapi pakai renderer canvas +
 * auto-pause saat di luar layar/tab tersembunyi supaya tidak bikin freeze.
 */
const LottieIcon = ({
  animationData,
  loop = true,
  autoplay = true,
  className = "w-8 h-8"
}) => (
  <OptimizedLottie
    animationData={animationData}
    loop={loop}
    autoplay={autoplay}
    className={className}
  />
);

export default LottieIcon;
