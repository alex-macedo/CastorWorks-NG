import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/print.css";
import "react-day-picker/style.css";
import ErrorBoundary from "./components/ErrorBoundary";
import { logger } from "@/lib/logger";

if (import.meta.env.DEV) {
	console.log("[main.tsx] Starting application initialization...");
	console.log("[main.tsx] Environment:", {
		mode: import.meta.env.MODE,
		dev: import.meta.env.DEV,
		prod: import.meta.env.PROD,
	});
}

const rootElement = document.getElementById("root");
if (import.meta.env.DEV) console.log("[main.tsx] Root element found:", !!rootElement);

if (!rootElement) {
	const msg = "[main.tsx] CRITICAL: Root element not found!";
	console.error(msg);
	logger.error(msg);
	document.body.innerHTML = '<div style="padding: 20px; color: red;">ERROR: Root element not found. Check if index.html has a div with id="root"</div>';
} else {
	try {
		if (import.meta.env.DEV) console.log("[main.tsx] Creating React root...");
		const root = createRoot(rootElement);
		if (import.meta.env.DEV) console.log("[main.tsx] Rendering app...");
		root.render(
			<ErrorBoundary>
				<App />
			</ErrorBoundary>,
		);
		if (import.meta.env.DEV) console.log("[main.tsx] App rendered successfully!");
	} catch (error) {
		console.error("[main.tsx] CRITICAL ERROR during render:", error);
		logger.error(`[main.tsx] CRITICAL ERROR during render: ${error}`);
		document.body.innerHTML = `<div style="padding: 20px; color: red;">
			<h2>Critical Error During Initialization</h2>
			<pre>${error}</pre>
		</div>`;
	}
}
