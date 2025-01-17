import { ReactNode, Suspense, useEffect } from "react";
import { matchPath, Route, Routes, useLocation } from "react-router-dom";

import { IRouterComponentProps, IRouterConfigRoutes } from "../config/router";

interface Props {
	readonly routes: Record<string, IRouterConfigRoutes>;
	readonly routerProps?: IRouterComponentProps;
	readonly appName: string;
	readonly suspense: ReactNode;
}

export const RouterView = ({ routes, suspense, appName, routerProps }: Props) => {
	const { pathname } = useLocation();

	// Set the document title based on the current route
	useEffect(() => {
		const matchedRoute = Object.values(routes).find(({ uri, pattern }) =>
			matchPath(`${uri}${pattern}`, pathname)
		);
		const title = matchedRoute?.title ?? routes.default.title;
		document.title = `${title} - ${appName}`;
	}, [routes, appName, pathname]);

	return (
		<Suspense fallback={suspense}>
			<Routes>
				{Object.values(routes).map(({ uri, pattern, element: Element }, index) => (
					<Route
						key={`${index}-${uri}`}
						element={<Element {...routerProps} />}
						path={`${uri}${pattern}`}
					/>
				))}
			</Routes>
		</Suspense>
	);
};
