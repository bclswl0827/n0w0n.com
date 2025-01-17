import { Error } from "../../components/Error";

const NotFound = () => {
	return (
		<div className="p-8">
			<Error
				code={404}
				heading={"404"}
				content={"Resource not found"}
				action={{
					onClick: () => window.history.back(),
					label: "Go back"
				}}
			/>
		</div>
	);
};

export default NotFound;
