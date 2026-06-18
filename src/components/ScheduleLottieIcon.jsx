import React from "react";
import Lottie from "lottie-react";
import scheduleAnimation from "../assets/lottie/schedule.json";

const ScheduleLottieIcon = ({
  className = "h-5 w-5",
  loop = true,
  autoplay = true,
}) => (
  <span
    className={`inline-flex flex-shrink-0 items-center justify-center overflow-hidden ${className}`}
    aria-hidden="true"
  >
    <Lottie
      animationData={scheduleAnimation}
      loop={loop}
      autoplay={autoplay}
      className="h-full w-full"
    />
  </span>
);

export default ScheduleLottieIcon;
