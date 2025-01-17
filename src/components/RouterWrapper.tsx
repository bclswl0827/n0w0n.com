import { ReactNode } from "react";
import { BrowserRouter, HashRouter } from "react-router-dom";

export type RouterMode = "hash" | "history";

export interface RouterWrapperProps {
	readonly mode: RouterMode;
	readonly basename: string;
	readonly children: ReactNode;
}

export const RouterWrapper = ({ mode, children }: RouterWrapperProps) =>
	mode === "hash" ? (
		<HashRouter future={{ v7_startTransition: true }}>{children}</HashRouter>
	) : (
		<BrowserRouter future={{ v7_startTransition: true }}>{children}</BrowserRouter>
	);
