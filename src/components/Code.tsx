import { mdiCheckAll, mdiContentCopy, mdiContentSaveAll } from "@mdi/js";
import Icon from "@mdi/react";
import { saveAs } from "file-saver";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import theme from "react-syntax-highlighter/dist/esm/styles/prism/a11y-dark";

import { setClipboardText } from "../helpers/utils/setClipboardText";

interface CodeProps {
	readonly language?: string;
	readonly fileName?: string;
	readonly children: string;
}

export const Code = (props: CodeProps) => {
	const { fileName, language, children } = props;

	const [isCopied, setIsCopied] = useState(false);

	const handleCopy = async (text: string) => {
		await setClipboardText(text);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	const handleDownload = (text: string) => {
		const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
		saveAs(blob, fileName);
	};

	return (
		<div className="rounded-lg bg-gray-700 p-2">
			<div className="flex text-sm justify-between px-4 items-center">
				<span className="text-gray-300">{language}</span>
				<div className="flex flex-row space-x-3">
					<div
						className="opacity-60 hover:opacity-100 transition-all cursor-pointer"
						onClick={() => {
							handleCopy(children);
						}}
					>
						<Icon
							className="text-gray-300"
							path={isCopied ? mdiCheckAll : mdiContentCopy}
							size={0.7}
						/>
					</div>
					{fileName?.length && (
						<div
							className="opacity-60 hover:opacity-100 transition-all cursor-pointer"
							onClick={() => {
								handleDownload(children);
							}}
						>
							<Icon className="text-gray-300" path={mdiContentSaveAll} size={0.7} />
						</div>
					)}
				</div>
			</div>
			<SyntaxHighlighter
				PreTag={"div"}
				language={language}
				style={theme}
				showLineNumbers={true}
			>
				{children}
			</SyntaxHighlighter>
		</div>
	);
};
