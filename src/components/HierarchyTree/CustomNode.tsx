import styles from "./CustomNode.module.scss";

type Props = {
	children: React.ReactNode;
	current?: boolean;
};

const CustomNode = (props: Props) => {
	return (
		<div
			className={styles.CustomNode}
			style={{ backgroundColor: props.current ? "pink" : "transparent" }}
		>
			{props.children}
		</div>
	);
};

export default CustomNode;
