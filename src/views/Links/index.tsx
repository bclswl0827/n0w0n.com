import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { FriendsConfig } from "../../config/friends";

const Links = () => {
	const [randomizedLinks, setRandomizedLinks] = useState<typeof FriendsConfig>([]);
	useEffect(() => {
		const shuffledLinks = [...FriendsConfig];
		for (let i = shuffledLinks.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffledLinks[i], shuffledLinks[j]] = [shuffledLinks[j], shuffledLinks[i]];
		}
		setRandomizedLinks(shuffledLinks);
	}, []);

	return (
		<div className="max-w-3xl mx-auto px-10 space-y-8 animate-fade-right">
			<h1 className="text-3xl font-extrabold text-gray-800 mb-6">Friend Links</h1>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{randomizedLinks.map(({ icon, name, url, description }, index) => (
					<Link key={`${index}-${url}`} to={url} className="block">
						<div className="bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-all duration-300 p-6 h-full flex justify-between items-center">
							<div className="flex-grow">
								<h2 className="text-xl font-semibold mb-2 text-gray-800">{name}</h2>
								<p className="text-gray-600 mb-4">{description}</p>
							</div>
							<img src={icon} alt="" className="size-12 rounded-full border" />
						</div>
					</Link>
				))}
			</div>
		</div>
	);
};

export default Links;
