import { mdiClose, mdiMenu } from "@mdi/js";
import Icon from "@mdi/react";
import { useState } from "react";
import { Link } from "react-router-dom";

interface HeaderProps {
	avatar: string;
	title: string;
	links: Array<{ icon: string; name: string; link: string }>;
}

export const Header = ({ avatar, title, links }: HeaderProps) => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	return (
		<nav className="w-full px-8 py-6 mb-12 bg-gray-200 shadow-xl flex flex-row justify-between items-center">
			<div>
				<Link to="/">
					<div className="flex flex-row items-center space-x-4">
						<img
							src={avatar}
							className="hover:scale-110 transition-all w-10 rounded-full"
							alt="avatar"
						/>
						<h1 className="text-xl font-medium tracking-tight hover:scale-105 transition-all text-gray-800 dark:text-gray-200">
							{title}
						</h1>
					</div>
				</Link>
			</div>
			<div>
				<div className="md:hidden">
					<button
						className="text-gray-800 dark:text-gray-200"
						onClick={() => setIsMenuOpen(!isMenuOpen)}
					>
						<Icon path={isMenuOpen ? mdiClose : mdiMenu} size={1.5} />
					</button>
				</div>
				<div
					className={`md:flex ${
						isMenuOpen ? "block" : "hidden"
					} md:block absolute md:static top-16 left-0 w-full bg-gray-200 md:bg-transparent p-4 md:p-0`}
				>
					{links.map(({ icon, name, link }, index) => (
						<Link
							key={`${index}-${name}`}
							className="mx-4 my-2 block md:inline-block text-gray-800 dark:text-gray-200 hover:text-indigo-800 hover:scale-105 transition-all"
							to={link}
							onClick={() => setIsMenuOpen(false)}
						>
							<div className="flex flex-row items-center space-x-2">
								<Icon path={icon} size={1} />
								<span>{name}</span>
							</div>
							<div className="h-1 w-full bg-gray-300" />
						</Link>
					))}
				</div>
			</div>
		</nav>
	);
};
