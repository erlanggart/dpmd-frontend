import React from "react";
import OptimizedLottie from "./OptimizedLottie";
import faceVerificationAnimation from "../assets/lottie/face-verification.json";

const FaceVerificationLottieIcon = ({
  className = "h-5 w-5",
  loop = true,
  autoplay = true,
}) => (
  <OptimizedLottie
    animationData={faceVerificationAnimation}
    className={className}
    loop={loop}
    autoplay={autoplay}
  />
);

export default FaceVerificationLottieIcon;
