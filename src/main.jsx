import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

import "@splidejs/react-splide/css";
import { AuthProvider } from "./context/AuthContext.jsx";
import "leaflet/dist/leaflet.css";

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<AuthProvider>
			<App />
		</AuthProvider>
	</StrictMode>
);
