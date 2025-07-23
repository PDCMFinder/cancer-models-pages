import Link from "next/link";
import { RelatedModelRoles } from "../../types/ModelData.model";
import CustomNodeStyles from "./CustomNode.module.scss";

type HierarchyTreeProps = {
	modelId: string;
	providerId: string;
	data: {
		role: RelatedModelRoles;
		relatedModelId: string;
	}[];
};

const CustomNode = ({
	current,
	providerId,
	...props
}: { current?: boolean; providerId: string } & React.ComponentProps<"div">) => {
	const nodeContent = current ? (
		props.children
	) : (
		<Link href={`/data/models/${providerId}/${props.children}`}>
			{props.children}
		</Link>
	);

	return (
		<div
			{...props}
			className={`${CustomNodeStyles.CustomNode} ${
				current && CustomNodeStyles.CustomNode_current
			} ${props.className ?? ""}`}
		>
			{nodeContent}
		</div>
	);
};

const HierarchyTree = ({ modelId, providerId, data }: HierarchyTreeProps) => {
	const [firstRelation] = data;
	const isParent = firstRelation.role === "parent of";

	return (
		<div className="d-flex flex-column align-end w-max">
			{data.map(({ relatedModelId }, index) => {
				const isFirst = index === 0;
				const fromModel = isParent ? modelId : relatedModelId;
				const toModel = isParent ? relatedModelId : modelId;

				return (
					<div key={relatedModelId}>
						{isFirst ? (
							<CustomNode providerId={providerId} current={isParent}>
								{fromModel}
							</CustomNode>
						) : (
							<p style={{ display: "inline-flex" }}>&#8627;</p>
						)}
						<span className="mx-2">parent of &rarr;</span>
						<CustomNode
							providerId={providerId}
							current={!isParent}
							className="mt-2"
						>
							{toModel}
						</CustomNode>
					</div>
				);
			})}
		</div>
	);
};

export default HierarchyTree;
