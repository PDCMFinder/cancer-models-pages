import styles from "./CustomNode.module.scss";

const CustomNode = ({
	current,
	ref,
	...props
}: { current?: boolean } & React.ComponentProps<"div">) => {
	return (
		<div
			ref={ref}
			className={`${styles.CustomNode} ${current ? "current" : ""}`}
			{...props}
		>
			{props.children}
		</div>
	);
};

export default CustomNode;
