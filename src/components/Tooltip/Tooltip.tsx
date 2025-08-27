import { CSSProperties, useState } from "react";
import ArrowIcon from "../ArrowIcon/ArrowIcon";
import styles from "./Tooltip.module.scss";

type TooltipProps = {
	content: any;
	children: any;
	className?: string;
	style?: CSSProperties;
	position?: "bottom" | "right";
};

const Tooltip = (props: TooltipProps) => {
	const [isHovering, setIsHovering] = useState(false);
	const tooltipClasses = [
		"w-min",
		props.position === "bottom" ? "pb-2" : "pr-2",
		"position-md-relative",
		props.className,
		styles.Tooltip,
		props.position === "bottom" ? styles["Tooltip-bottom"] : null
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div
			className={tooltipClasses}
			onMouseOver={() => setIsHovering(true)}
			onMouseLeave={() => setIsHovering(false)}
			style={props.style}
		>
			{isHovering && (
				<>
					<div className={styles.Tooltip_content}>{props.content}</div>
					<ArrowIcon className={styles.Tooltip_arrow} />
				</>
			)}
			<span className={styles.Tooltip_children}>{props.children}</span>
		</div>
	);
};

export default Tooltip;
