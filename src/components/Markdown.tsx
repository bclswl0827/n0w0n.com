import "katex/dist/katex.min.css";
import "@fancyapps/ui/dist/fancybox/fancybox.css";

import { Fancybox } from "@fancyapps/ui";
import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { Code } from "./Code";

interface MarkdownProps {
	readonly className?: string;
	readonly children: string;
}

export const Markdown = ({ className, children }: MarkdownProps) => {
	useEffect(() => {
		Fancybox.bind("[data-viewer]");
		return () => {
			Fancybox.destroy();
		};
	}, []);

	return (
		<ReactMarkdown
			className={`prose text-md lg:prose-base max-w-[100%] break-words ${className ?? ""}`}
			children={children}
			components={{
				a: ({ node, ...props }) => (
					<a href={props.href} target="_blank" rel="noreferrer" {...props}>
						{props.children}
					</a>
				),
				img: ({ node, ...props }) => (
					<a
						className="flex flex-col items-center"
						href={props.src}
						data-viewer
						data-caption={props.alt}
					>
						<img className="rounded-lg shadow-lg" {...props} alt={props.alt} />
						<span className="-mt-6 text-sm">{props.alt}</span>
					</a>
				),
				pre: ({ node, ...props }) => <pre className="bg-transparent p-2" {...props} />,
				code: ({ className, children, node }) => {
					const match = /language-(\w+)/.exec(className ?? "");
					const lang = match !== null ? match[1] : "";
					const code = String(children);
					return match ? (
						<Code language={lang} fileName={`snippet_${Date.now()}.txt`}>
							{code}
						</Code>
					) : (
						<code className="text-gray-700 font-mono overflow-scroll bg-gray-200 px-2 py-0.5 rounded-sm">
							{code.replace(/\n$/, "")}
						</code>
					);
				},
				table: ({ node, ...props }) => (
					<table className="overflow-x-auto block whitespace-nowrap" {...props} />
				)
			}}
			urlTransform={(url) => url}
			rehypePlugins={[rehypeKatex, rehypeRaw]}
			remarkPlugins={[remarkGfm, remarkMath]}
		/>
	);
};
