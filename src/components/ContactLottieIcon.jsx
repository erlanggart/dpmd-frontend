import React from "react";
import OptimizedLottie from "./OptimizedLottie";
import contactAnimation from "../assets/lottie/contact.json";

const ContactLottieIcon = ({
  className = "h-5 w-5",
  loop = true,
  autoplay = true,
}) => (
  <OptimizedLottie
    animationData={contactAnimation}
    className={className}
    loop={loop}
    autoplay={autoplay}
  />
);

export default ContactLottieIcon;
