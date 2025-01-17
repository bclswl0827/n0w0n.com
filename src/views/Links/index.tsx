import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { FriendsConfig, IFriendsConfig } from "../../config/friends";

const Links = () => {
	const [shuffledLinks, setShuffledLinks] = useState<IFriendsConfig[] | null>(null);

	useEffect(() => {
		const links = [...FriendsConfig];
		for (let i = links.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[links[i], links[j]] = [links[j], links[i]];
		}
		setShuffledLinks(links);
	}, []);

	return (
		<div className="max-w-3xl mx-auto px-6 space-y-8 animate-fade-right">
			<h1 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Friend Links</h1>

			<div
				className={`grid gap-6 ${
					shuffledLinks && shuffledLinks.length === 1
						? "grid-cols-1"
						: "grid-cols-1 md:grid-cols-2"
				}`}
			>
				{shuffledLinks?.map(({ name, url, description }, index) => (
					<Link
						key={`${index}-${url}`}
						to={url}
						className="block"
						aria-label={`Visit ${name}`}
					>
						<div className="bg-white rounded-lg shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all duration-300 p-6 h-full flex items-start">
							<div>
								<h2 className="text-xl font-semibold mb-2 text-gray-800">{name}</h2>
								<p className="text-gray-600">{description}</p>
							</div>
						</div>
					</Link>
				))}
			</div>

			{shuffledLinks?.length === 1 && (
				<p className="text-gray-500 text-center">Only one friend link available.</p>
			)}
		</div>
	);
};

export default Links;
