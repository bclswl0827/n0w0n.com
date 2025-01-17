import { useEffect, useState } from "react";

export const Skeleton = () => {
	const [skeletonRows, setSkeletonRows] = useState(2);

	useEffect(() => {
		const rows = Math.floor(0.6 * (window.innerHeight / 100));
		setSkeletonRows(rows > 0 ? rows : 2);
	}, []);

	return (
		<div className="p-8 my-auto space-y-3 w-full animate-fade overflow-y-hidden max-h-screen">
			{[...new Array(skeletonRows)].map((_, index) => (
				<div key={index} className="space-y-3 animate-pulse">
					<div className="h-2.5 bg-gray-200 rounded-full w-32 mb-4 dark:bg-gray-600"></div>
					<div className="h-2 bg-gray-300 rounded-full dark:bg-gray-700" />
					<div className="h-2 bg-gray-300 rounded-full dark:bg-gray-700" />
					<div className="h-2 bg-gray-300 rounded-full dark:bg-gray-700" />
					<div className="h-2 bg-gray-300 rounded-full dark:bg-gray-700" />
					<div className="h-2 bg-gray-300 rounded-full dark:bg-gray-700" />
				</div>
			))}
		</div>
	);
};
