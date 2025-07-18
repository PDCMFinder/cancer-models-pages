import { RelatedModelRoles } from "../../types/ModelData.model";
import CustomNode from "./CustomNode";

type Props = {
	modelId: string;
	role: RelatedModelRoles;
	relatedModelId: string;
};

const HierarchyTree = (props: Props) => {
	return (
		<div>
			<CustomNode current>{props.modelId}</CustomNode>
			{props.role}
			<CustomNode>{props.relatedModelId}</CustomNode>
		</div>
	);
};

export default HierarchyTree;
