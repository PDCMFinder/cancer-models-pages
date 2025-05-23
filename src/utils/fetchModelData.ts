import { getAllModelData } from "../apis/ModelDetails.api";

export const fetchModelData = async (modelId: string, providerId: string) => {
	const {
		metadata,
		extLinks,
		immuneMarkers,
		engraftments,
		cellModelData,
		drugDosing,
		patientTreatment,
		qualityData,
		modelImages,
		knowledgeGraph
	} = await getAllModelData(modelId, providerId);

	return {
		metadata,
		extLinks,
		immuneMarkers,
		engraftments,
		cellModelData,
		drugDosing,
		patientTreatment,
		qualityData,
		modelImages,
		knowledgeGraph
	};
};
