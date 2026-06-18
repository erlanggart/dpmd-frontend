import React from "react";
import Lottie from "lottie-react";
import chatbotAnimation from "../assets/lottie/chatbot.json";

const MessageLottieIcon = ({
  className = "h-5 w-5",
  loop = true,
  autoplay = true,
}) => (
  <span
    className={`inline-flex flex-shrink-0 items-center justify-center overflow-hidden ${className}`}
    aria-hidden="true"
  >
    <Lottie
      animationData={chatbotAnimation}
      loop={loop}
      autoplay={autoplay}
      className="h-full w-full"
    />
  </span>
);

export default MessageLottieIcon;
