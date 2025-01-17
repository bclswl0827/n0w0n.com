import { mdiClose, mdiMenu } from "@mdi/js";
import Icon from "@mdi/react";
import { useState } from "react";
import { Link } from "react-router-dom";

interface HeaderProps {
	baseUrl: string;
	avatar: string;
	title: string;
	links: Array<{ icon: string; name: string; link: string }>;
}

export const Header = ({ baseUrl, avatar, title, links }: HeaderProps) => {
	const [menuOpen, setMenuOpen] = useState(false);

	return (
		<nav className="bg-gray-200 shadow-xl z-500">
			<div className="px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-16">
					<div className="flex items-center">
						<Link
							to={baseUrl}
							className="text-gray-800 font-bold text-xl flex flex-row items-center space-x-4"
						>
							<img
								src={avatar}
								alt="Logo"
								className="hover:scale-105 transition-all size-12 shadow-lg rounded-full"
							/>
							<span className="hover:scale-110 transition-all">{title}</span>
						</Link>
					</div>

					<div className="hidden md:block">
						<div className="ml-10 flex items-center space-x-4">
							{links.map(({ icon, name, link }, index) => (
								<Link
									key={index}
									to={link}
									className="text-gray-500 hover:bg-gray-500 transition-all hover:text-white px-3 py-2 rounded-md text-sm font-medium"
								>
									<div className="flex flex-row items-center space-x-2">
										<Icon path={icon} size={1} />
										<span>{name}</span>
									</div>
								</Link>
							))}
						</div>
					</div>

					<div className="md:hidden">
						<button
							onClick={() => {
								setMenuOpen(!menuOpen);
							}}
							className="p-2 rounded-md text-gray-500 hover:text-white transition-all hover:bg-gray-500"
						>
							<Icon path={menuOpen ? mdiClose : mdiMenu} size={1} />
						</button>
					</div>
				</div>
			</div>

			<div className={`${menuOpen ? "block" : "hidden"} md:hidden bg-gray-200 shadow-md`}>
				<div className="px-4 py-2 space-y-2">
					{links.map(({ icon, name, link }, index) => (
						<Link
							key={index}
							to={link}
							className="block text-gray-500 hover:bg-gray-500 transition-all hover:text-white px-3 py-2 rounded-md text-sm font-medium"
							onClick={() => {
								setMenuOpen(false);
							}}
						>
							<div className="flex items-center space-x-2">
								<Icon path={icon} size={1} />
								<span>{name}</span>
							</div>
						</Link>
					))}
				</div>
			</div>
		</nav>
	);
};
