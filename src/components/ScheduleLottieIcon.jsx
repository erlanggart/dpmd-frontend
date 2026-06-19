import React from "react";
import OptimizedLottie from "./OptimizedLottie";
import scheduleAnimation from "../assets/lottie/schedule.json";

const ScheduleLottieIcon = ({
  className = "h-5 w-5",
  loop = true,
  autoplay = true,
}) => (
  <OptimizedLottie
    animationData={scheduleAnimation}
    className={className}
    loop={loop}
    autoplay={autoplay}
  />
);

export default ScheduleLottieIcon;
