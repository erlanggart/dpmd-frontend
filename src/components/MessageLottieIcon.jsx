import React from "react";
import OptimizedLottie from "./OptimizedLottie";
import chatbotAnimation from "../assets/lottie/chatbot.json";

const MessageLottieIcon = ({
  className = "h-5 w-5",
  loop = true,
  autoplay = true,
}) => (
  <OptimizedLottie
    animationData={chatbotAnimation}
    className={className}
    loop={loop}
    autoplay={autoplay}
  />
);

export default MessageLottieIcon;
