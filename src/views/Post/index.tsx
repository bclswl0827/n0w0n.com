import { mdiClockCheck, mdiClockEdit, mdiTypewriter } from "@mdi/js";
import Icon from "@mdi/react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import { Error } from "../../components/Error";
import { Markdown } from "../../components/Markdown";
import { GlobalConfig } from "../../config/global";
import { IBlogPostData } from "../../config/post";
import { getTimeString } from "../../helpers/utils/getTimeString";

const Post = () => {
	const [error, setError] = useState("");
	const [postData, setPostData] = useState<IBlogPostData>({
		title: "Loading...",
		created_at: 0,
		updated_at: 0,
		words: 0,
		content: ""
	});
	const getPostData = async (article: string) => {
		setError("");
		try {
			const res = await fetch(`/data/${article}.json`);
			setPostData(await res.json());
		} catch (err: unknown) {
			setError(String(err));
		}
	};

	const article = useParams().post;
	useEffect(() => {
		getPostData(article!);
	}, [article]);

	const { title: siteTitle } = GlobalConfig.site_settings;
	useEffect(() => {
		document.title = `${postData.title} - ${siteTitle}`;
	}, [postData, siteTitle]);
	useEffect(() => {
		if (error.length) {
			document.title = `Error occurred while loading post - ${siteTitle}`;
		}
	}, [error, siteTitle]);

	// Setup canonical link
	const { pathname } = useLocation();
	useEffect(() => {
		const url = new URL(window.location.href);
		url.pathname = pathname.replace(/\/+$/, "");
		url.hash = "";
		const link = document.createElement("link");
		link.href = url.toString();
		link.rel = "canonical";
		document.head.appendChild(link);
	}, [pathname]);

	// Setup comment system
	useEffect(() => {
		const commentContainer = document.getElementById("utterances-container");
		if (postData.content && commentContainer) {
			const script = document.createElement("script");
			script.src = "https://utteranc.es/client.js";
			script.setAttribute("repo", "bclswl0827/n0w0n.com");
			script.setAttribute("issue-term", "pathname");
			script.setAttribute("theme", "github-light");
			script.setAttribute("crossorigin", "anonymous");
			script.setAttribute("async", "true");
			commentContainer?.appendChild(script);
		}
	}, [postData]);

	return !error.length ? (
		<div className="animate-fade flex flex-col items-center space-y-4 mx-12 lg:mx-0">
			<h1 className="text-2xl font-extrabold text-gray-800">{postData.title}</h1>

			{postData.content && (
				<>
					<div className="text-sm text-gray-400 flex flex-col sm:flex-row">
						<div className="flex flex-row items-center space-x-1 sm:mr-2">
							<Icon path={mdiClockCheck} size={0.7} />
							<span>{getTimeString(postData.created_at)}</span>
						</div>
						{postData.created_at !== postData.updated_at && (
							<div className="flex flex-row items-center space-x-1 sm:mr-2">
								<Icon path={mdiClockEdit} size={0.7} />
								<span>{getTimeString(postData.updated_at)}</span>
							</div>
						)}
						<div className="flex flex-row items-center space-x-1">
							<Icon path={mdiTypewriter} size={0.7} />
							<span>{postData.words.toLocaleString()} words</span>
						</div>
					</div>

					<div className="py-6 max-w-[calc(95%)] md:max-w-[calc(80%)] lg:max-w-[calc(50%)]">
						<Markdown>{postData.content}</Markdown>
					</div>

					<div id="utterances-container" className="w-full" />
				</>
			)}
		</div>
	) : (
		<Error
			code={404}
			debug={error}
			heading={"404"}
			content={"Resource not found"}
			action={{ onClick: () => window.history.back(), label: "Go back" }}
		/>
	);
};

export default Post;
