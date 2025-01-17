import { Link } from "react-router-dom";

import { IBlogPostSummary } from "../../config/post";

const Archive = () => {
	const postsSummary = process.env.__POSTS__ as unknown as IBlogPostSummary[];
	const groupedPosts = postsSummary.reduce((acc, post) => {
		const year = new Date(post.created_at).getFullYear();
		if (!acc[year]) acc[year] = [];
		acc[year].push(post);
		return acc;
	}, {} as Record<number, IBlogPostSummary[]>);

	const sortedYears = Object.keys(groupedPosts).sort((a, b) => Number(b) - Number(a));

	return (
		<div className="max-w-3xl mx-auto px-10 space-y-8 animate-fade-right">
			<h1 className="text-3xl font-bold mb-6 text-gray-800">Post Archive</h1>

			{sortedYears.map((year) => (
				<div key={year} className="mb-8">
					<h2 className="text-2xl text-gray-700 font-semibold mb-4 border-b pb-2 border-gray-300">
						{year}
					</h2>
					<ul className="space-y-4">
						{groupedPosts[Number(year)].map((post) => (
							<li key={post.slug} className="">
								<Link
									to={`/post/${post.slug}`}
									className="text-lg text-gray-600 hover:text-amber-600 transition-all"
								>
									{post.title}
								</Link>
							</li>
						))}
					</ul>
				</div>
			))}
		</div>
	);
};

export default Archive;
