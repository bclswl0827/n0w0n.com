import { mdiClockCheck, mdiClockEdit, mdiFileEdit, mdiTypewriter } from "@mdi/js";
import Icon from "@mdi/react";
import { useQueryState } from "nuqs";
import { Link } from "react-router-dom";

import { Markdown } from "../../components/Markdown";
import { GlobalConfig } from "../../config/global";
import { IBlogPostSummary } from "../../config/post";
import { getTimeString } from "../../helpers/utils/getTimeString";

const POSTS_PER_PAGE = 5;

const Home = () => {
	const { avatar, name, description, links } = GlobalConfig.author_settings;
	const postsSummary = process.env.__POSTS__ as unknown as IBlogPostSummary[];

	const [currentPage, setCurrentPage] = useQueryState("page", {
		parse: (query: string) => parseInt(query),
		serialize: (value) => value.toString(),
		defaultValue: 1
	});
	const totalPages = Math.ceil(postsSummary.length / POSTS_PER_PAGE);
	const paginatedPosts = postsSummary.slice(
		(currentPage - 1) * POSTS_PER_PAGE,
		currentPage * POSTS_PER_PAGE
	);

	const handlePageChange = (page: number) => {
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	return (
		<div className="w-full flex flex-col items-center">
			<img
				src={avatar}
				className="w-32 rounded-full shadow-xl border-4 border-gray-300 hover:rotate-[360deg] transition-all duration-1000"
				alt=""
			/>
			<h2 className="mt-6 text-2xl font-semibold text-gray-800">{name}</h2>
			<p className="my-2 text-md text-gray-600">{description}</p>

			<div className="my-2 flex flex-row space-x-4">
				{links.map(({ link, icon, name }, index) => {
					return (
						<a key={`${index}-${name}`} href={link} target="_blank" rel="noreferrer">
							<Icon
								path={icon}
								size={1}
								className="text-gray-500 hover:text-amber-600 transition-all"
							/>
						</a>
					);
				})}
			</div>

			<ul className="flex flex-col animate-fade-up max-w-[calc(80%)] md:max-w-[calc(70%)] lg:max-w-[calc(50%)] my-8 mx-12 lg:mx-0">
				{paginatedPosts.length ? (
					paginatedPosts.map(
						({ summary, title, slug, created_at, updated_at, words }, index) => (
							<li className="my-8 space-y-4" key={`${index}-${slug}`}>
								<div className="flex flex-row items-center text-2xl space-x-3 font-extrabold">
									<Icon path={mdiFileEdit} size={1} className="text-gray-500 shrink-0" />
									<Link
										to={`/post/${slug}`}
										className="text-gray-800 hover:text-amber-600 duration-300 transition-all"
									>
										{title}
									</Link>
								</div>

								<div className="text-sm text-gray-400 flex flex-col sm:flex-row">
									<div className="flex flex-row items-center space-x-1 sm:mr-2">
										<Icon path={mdiClockCheck} size={0.7} className="" />
										<span>{getTimeString(created_at)}</span>
									</div>
									{created_at !== updated_at && (
										<div className="flex flex-row items-center space-x-1 sm:mr-2">
											<Icon path={mdiClockEdit} size={0.7} className="" />
											<span>{getTimeString(updated_at)}</span>
										</div>
									)}
									<div className="flex flex-row items-center space-x-1">
										<Icon path={mdiTypewriter} size={0.7} className="" />
										<span>{words.toLocaleString()} words</span>
									</div>
								</div>

								<Markdown className="mt-4 pb-4">{summary}</Markdown>

								<div className="flex flex-col items-center space-y-4">
									<Link
										to={`/post/${slug}`}
										className="text-center duration-300 transition-all border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-md text-gray-600 hover:text-amber-600"
									>
										Read more...
									</Link>

									<hr className="w-full border-gray-300" />
								</div>
							</li>
						)
					)
				) : (
					<span className="text-center text-gray-600">No posts yet...</span>
				)}
			</ul>

			{postsSummary.length > 0 && (
				<div className="flex items-center space-x-4 my-4">
					<button
						disabled={currentPage === 1}
						onClick={() => handlePageChange(currentPage - 1)}
						className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-100 text-gray-600 hover:text-amber-600 disabled:opacity-50 transition-all"
					>
						Previous
					</button>
					<span className="text-gray-600">
						Page {currentPage}/{totalPages}
					</span>
					<button
						disabled={currentPage === totalPages}
						onClick={() => handlePageChange(currentPage + 1)}
						className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-100 text-gray-600 hover:text-amber-600 disabled:opacity-50 transition-all"
					>
						Next
					</button>
				</div>
			)}
		</div>
	);
};

export default Home;
