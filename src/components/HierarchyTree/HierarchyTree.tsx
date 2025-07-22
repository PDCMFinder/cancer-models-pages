import { RelatedModelRoles } from "../../types/ModelData.model";
import CustomNodeStyles from "./CustomNode.module.scss";

type Props = {
	modelId: string;
	data: {
		role: RelatedModelRoles;
		relatedModelId: string;
	}[];
};

const CustomNode = ({
	current,
	...props
}: { current?: boolean } & React.ComponentProps<"div">) => {
	return (
		<div
			{...props}
			className={`${CustomNodeStyles.CustomNode} ${current ? "current" : ""} ${
				props.className ?? ""
			}`}
		>
			{props.children}
		</div>
	);
};

const HierarchyTree = (props: Props) => {
	const isParent = props.data[0].role === "parent of";

	// we're using this logic/structure to keep it as similar as OG CMO as possible
	// todo try a 3 column layout
	return (
		<div className="d-flex flex-column align-end w-max">
			{props.data.map((model, index) => (
				<div key={model.relatedModelId}>
					{index !== 0 ? (
						<p style={{ display: "inline-flex" }}>&#8627;</p>
					) : (
						<CustomNode current={isParent}>
							{isParent ? props.modelId : model.relatedModelId}
						</CustomNode>
					)}
					<span className="mx-2">parent of &rarr;</span>
					<CustomNode current={!isParent} className="mt-2">
						{isParent ? model.relatedModelId : props.modelId}
					</CustomNode>
				</div>
			))}
		</div>
	);
};

export default HierarchyTree;
