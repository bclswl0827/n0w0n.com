interface FooterProps {
	author: string;
	tos: string;
}

export const Footer = ({ author, tos }: FooterProps) => {
	return (
		<footer className="w-full text-gray-500 flex flex-col px-8 py-2 mt-12 text-center">
			<span className="text-sm">{`© ${new Date().getFullYear()} ${author}`}</span>
			<br />
			<span className="text-xs">{tos}</span>
		</footer>
	);
};
