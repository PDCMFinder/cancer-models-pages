import { CSSProperties } from "react";
import styles from "./Loader.module.scss";

const Loader = (props: { style?: CSSProperties; message?: string }) => {
	const hasMessage = !!props.message;

	return (
		<div
			className={`w-100 h-100 d-flex align-center justify-content-center flex-column ${styles.Loader}`}
			style={props.style}
		>
			<span className={`${hasMessage ? "mb-4" : undefined}`}></span>
			{hasMessage && <p>{props.message}</p>}
		</div>
	);
};

export default Loader;
