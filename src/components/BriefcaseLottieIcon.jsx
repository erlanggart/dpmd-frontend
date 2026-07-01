import React from "react";
import OptimizedLottie from "./OptimizedLottie";
import briefcaseAnimation from "../assets/lottie/briefcase.json";

const BriefcaseLottieIcon = ({
  className = "h-5 w-5",
  loop = true,
  autoplay = true,
}) => (
  <OptimizedLottie
    animationData={briefcaseAnimation}
    className={className}
    loop={loop}
    autoplay={autoplay}
  />
);

export default BriefcaseLottieIcon;
