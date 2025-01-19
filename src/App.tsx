import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { RouterView } from "./components/RouterView";
import { Scroller } from "./components/Scroller";
import { Skeleton } from "./components/Skeleton";
import { GlobalConfig } from "./config/global";
import { MenuConfig } from "./config/menu";
import { RouterConfig } from "./config/router";

export const App = () => {
	const { name: authorName, avatar } = GlobalConfig.author_settings;
	const { base, title, tos } = GlobalConfig.site_settings;

	return (
		<>
			<div className="flex flex-col w-full min-h-screen">
				<Header baseUrl={base} title={title} avatar={avatar} links={MenuConfig} />

				<div className="grow mt-16">
					<RouterView
						appName={title}
						routes={RouterConfig.routes}
						suspense={<Skeleton />}
					/>
				</div>

				<Footer author={authorName} tos={tos} />
			</div>

			<Scroller />
		</>
	);
};
