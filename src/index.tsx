import "./index.css";

import { NuqsAdapter } from "nuqs/adapters/react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";

import { App } from "./App";
import { Error } from "./components/Error";
import { RouterWrapper } from "./components/RouterWrapper";
import { RouterConfig } from "./config/router";

const targetNode = document.getElementById("root")!;
const root = ReactDOM.createRoot(targetNode);

root.render(
	<ErrorBoundary fallback={<Error />}>
		<NuqsAdapter>
			<RouterWrapper mode={RouterConfig.mode} basename={RouterConfig.basename}>
				<App />
			</RouterWrapper>
		</NuqsAdapter>
	</ErrorBoundary>
);
