// src/components/mobile/LottieIcon.jsx
import React from 'react';
import Lottie from 'lottie-react';

/**
 * LottieIcon - Wrapper untuk Lottie animations
 * Menampilkan animasi Lottie dengan size & options customizable
 */
const LottieIcon = ({ 
  animationData, 
  loop = true, 
  autoplay = true,
  className = "w-8 h-8"
}) => {
  return (
    <div className={className}>
      <Lottie 
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default LottieIcon;
