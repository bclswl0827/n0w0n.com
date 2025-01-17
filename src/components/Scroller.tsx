import { mdiArrowUp } from "@mdi/js";
import Icon from "@mdi/react";
import { useCallback, useEffect, useState } from "react";

interface ScrollerProps {
	readonly threshold?: number;
}

export const Scroller = ({ threshold = 100 }: ScrollerProps) => {
	const [showButton, setShowButton] = useState(false);

	const scrollToTop = () => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const toggleButton = useCallback(() => {
		setShowButton(window.scrollY > threshold);
	}, [threshold]);

	useEffect(() => {
		document.addEventListener("scroll", toggleButton);
		return () => {
			document.removeEventListener("scroll", toggleButton);
		};
	}, [toggleButton]);

	return (
		<button
			className={`bg-indigo-500 hover:bg-indigo-600 text-white duration-300 size-10 rounded-full bottom-16 right-3 flex justify-center items-center ${
				showButton ? "fixed animate-fade-left animate-duration-300" : "hidden"
			}`}
			onClick={scrollToTop}
		>
			<Icon path={mdiArrowUp} size={1} />
		</button>
	);
};
