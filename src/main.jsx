import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

import "@splidejs/react-splide/css";
import { AuthProvider } from "./context/AuthContext.jsx";
import "leaflet/dist/leaflet.css";

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  // Register immediately, not waiting for load event
  navigator.serviceWorker.register('/sw.js', {
    scope: '/'
  }).then(
    (registration) => {
      console.log('[PWA] ServiceWorker registration successful', registration);
      
      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
    },
    (err) => {
      console.error('[PWA] ServiceWorker registration failed:', err);
    }
  );

  // Listen for service worker ready
  navigator.serviceWorker.ready.then((registration) => {
    console.log('[PWA] ServiceWorker ready', registration);
  });
}

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<AuthProvider>
			<App />
		</AuthProvider>
	</StrictMode>
);
