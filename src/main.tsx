import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import "./styles/print.css";
import "react-day-picker/style.css";
import ErrorBoundary from "./components/ErrorBoundary";
import { logger } from "@/lib/logger";

const PWA_DISABLED_HOSTS = new Set(["devng.castorworks.cloud", "studiong.castorworks.cloud"]);

const configureServiceWorker = async () => {
	if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
		return;
	}

	if (PWA_DISABLED_HOSTS.has(window.location.hostname)) {
		const registrations = await navigator.serviceWorker.getRegistrations();
		await Promise.allSettled(registrations.map((registration) => registration.unregister()));

		if ("caches" in window) {
			const cacheKeys = await caches.keys();
			await Promise.allSettled(cacheKeys.map((key) => caches.delete(key)));
		}

		return;
	}

	registerSW({
		immediate: true,
		onRegisterError(error) {
			console.error("[main.tsx] Failed to register service worker", error);
		},
	});
};

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
		void configureServiceWorker();
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
