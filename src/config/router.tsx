import { JSX, lazy, LazyExoticComponent, RefObject } from "react";

import { RouterMode } from "../components/RouterWrapper";

export type RouterProp<T> = Record<string, T>;

export interface IRouterComponentProps {
	refs?: RouterProp<RefObject<HTMLElement>>;
	locale?: string;
}

export interface IRouterConfigRoutes {
	readonly uri: string;
	readonly pattern: string;
	readonly title: string;
	readonly element: LazyExoticComponent<(props: IRouterComponentProps) => JSX.Element>;
}

type IRouterConfig = {
	readonly mode: RouterMode;
	readonly basename: string;
	readonly routes: Record<string, IRouterConfigRoutes>;
};

const Home = lazy(() => import("../views/Home"));
const Archive = lazy(() => import("../views/Archive"));
const Links = lazy(() => import("../views/Links"));
const About = lazy(() => import("../views/About"));
const Post = lazy(() => import("../views/Post"));
const NotFound = lazy(() => import("../views/NotFound"));

export const RouterConfig: IRouterConfig = {
	basename: "/",
	mode: "hash",
	routes: {
		home: {
			uri: "/",
			pattern: "",
			element: Home,
			title: "Home"
		},
		about: {
			uri: "/about",
			pattern: "",
			element: About,
			title: "About"
		},
		links: {
			uri: "/links",
			pattern: "",
			element: Links,
			title: "Links"
		},
		archive: {
			uri: "/archive",
			pattern: "",
			element: Archive,
			title: "Archive"
		},
		read: {
			uri: "/post",
			pattern: "/:post",
			element: Post,
			title: "Loading..."
		},
		default: {
			uri: "*",
			pattern: "",
			element: NotFound,
			title: "Page Not Found"
		}
	}
};
