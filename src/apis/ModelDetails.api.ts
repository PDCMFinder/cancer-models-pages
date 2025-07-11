import { CamelCaseKeys } from "../../types/globalTypes";
import {
  AllModelData,
  APIEngraftment,
  APIKnowledgeGraph,
  APIModelMetadata,
  APITreatment,
  CellModelData,
  Engraftment,
  ExtLinks,
  ImmuneMarker,
  KnowledgeGraph,
  ModelImage,
  MolecularData,
  ParsedModelMetadata,
  Publication,
  QualityData
} from "../types/ModelData.model";
import { camelCase } from "../utils/dataUtils";
import findMultipleByKeyValues from "../utils/findMultipleByKeyValues";

export async function getCellModelData(pdcmModelId: number): Promise<any> {
	let response = await fetch(
		`${process.env.NEXT_PUBLIC_API_URL}/cell_model?model_id=eq.${pdcmModelId}`
	);
	if (!response.ok) {
		throw new Error("Network response was not ok");
	}
	return response.json().then((d) => {
		delete d[0].model_id;
		return camelCase(d[0]);
	});
}

export async function getModelDetailsMetadata(
	modelId: string,
	providerId: string
) {
	let response = await fetch(
		`${process.env.NEXT_PUBLIC_API_URL}/search_index?external_model_id=eq.${modelId}&data_source=eq.${providerId}`
	);
	if (!response.ok) {
		throw new Error("Network response was not ok");
	}

	return response.json().then((d) => {
		if (!Array.isArray(d) || d.length === 0) {
			throw new Error("No model metadata found");
		}
		const modelMetadata: APIModelMetadata = d[0];

		return camelCase(modelMetadata);
	});
}

export async function getProviderId(modelId: string): Promise<string> {
	let response = await fetch(
		`${process.env.NEXT_PUBLIC_API_URL}/search_index?external_model_id=eq.${modelId}&select=data_source`
	);
	if (!response.ok) {
		throw new Error("Network response was not ok");
	}
	return response.json().then((d) => {
		return d[0].data_source;
	});
}

export async function getModelImages(modelId: string): Promise<ModelImage[]> {
	let response = await fetch(
		`${process.env.NEXT_PUBLIC_API_URL}/search_index?external_model_id=eq.${modelId}&select=model_images`
	);
	if (!response.ok) {
		throw new Error("Network response was not ok");
	}
	return response.json().then((d) => {
		if (d[0].model_images?.length) {
			return d[0].model_images.map((imageObj: ModelImage) =>
				camelCase(imageObj)
			);
		} else {
			return [];
		}
	});
}

export async function getModelKnowledgeGraph(
	modelId: string
): Promise<KnowledgeGraph> {
	let response = await fetch(
		`${process.env.NEXT_PUBLIC_API_URL}/model_information?external_model_id=eq.${modelId}&select=knowledge_graph`
	);
	if (!response.ok) {
		throw new Error("Network response was not ok");
	}
	return response
		.json()
		.then((d: { knowledge_graph: APIKnowledgeGraph | null }[]) => {
			const apiGraph = d[0]?.knowledge_graph;
			const data: KnowledgeGraph = {
				edges: apiGraph?.edges?.map((edge) => camelCase(edge)) ?? [],
				nodes: apiGraph?.nodes?.map((node) => camelCase(node)) ?? []
			};

			return data;
		});
}

export async function getModelPubmedIds(
	modelId: string = "",
	providerId: string
): Promise<string[]> {
	let response = await fetch(
		`${process.env.NEXT_PUBLIC_API_URL}/model_information?external_model_id=eq.${modelId}&data_source=eq.${providerId}&select=publication_group(pubmed_ids)`
	);
	if (!response.ok) {
		throw new Error("Network response was not ok");
	}

	const jsonContent = await response.json();

	const publicationGroup = jsonContent[0]["publication_group"] || {};

	const pubmedIds: string = publicationGroup["pubmed_ids"] || "";
	return pubmedIds.replaceAll(" ", "").split(",");
}

export async function getPublicationData(pubmedId: string) {
	if (pubmedId !== "") {
		let response = await fetch(
			`https://www.ebi.ac.uk/europepmc/webservices/rest/article/MED/${pubmedId.replace(
				"PMID:",
				""
			)}?resultType=lite&format=json`
		);
		if (!response.ok) {
			throw new Error("Network response was not ok");
		}
		return response
			.json()
			.then((d) =>
				Object.fromEntries(
					["title", "pubYear", "authorString", "journalTitle", "pmid", "doi"]
						.filter((key) => key in d.result)
						.map((key) => [key, d.result[key]])
				)
			);
	}
}

export async function getModelQualityData(
	pdcmModelId: number
): Promise<QualityData[]> {
	if (pdcmModelId !== 0 && !pdcmModelId) {
		return [];
	}
	let response = await fetch(
		`${process.env.NEXT_PUBLIC_API_URL}/quality_assurance?model_id=eq.${pdcmModelId}`
	);
	if (!response.ok) {
		throw new Error("Network response was not ok");
	}
	return response.json().then((d) => {
		return d.map((item: QualityData) => camelCase(item));
	});
}

export async function getMolecularData(modelId: string) {
	if (!modelId) {
		return [];
	}
	let response = await fetch(
		`${process.env.NEXT_PUBLIC_API_URL}/model_molecular_metadata?model_id=eq.${modelId}`
	);
	if (!response.ok) {
		throw new Error("Network response was not ok");
	}
	return response.json().then((d) => {
		return d.map((item: any) => {
			return camelCase(item);
		});
	});
}

export async function getAvailableDataColumns(
	dataSource: string,
	molecularCharacterizationType: string
) {
	switch (molecularCharacterizationType) {
		case "copy number alteration":
			molecularCharacterizationType = "cna";
			break;
		case "bio markers":
			molecularCharacterizationType = "biomarker";
			break;
	}

	let response = await fetch(
		`${process.env.NEXT_PUBLIC_API_URL}/available_molecular_data_columns?data_source=eq.${dataSource}&molecular_characterization_type=eq.${molecularCharacterizationType}`
	);
	if (!response.ok) {
		throw new Error("Network response was not ok");
	}
	return response.json().then((d) => {
		return d[0].not_empty_cols;
	});
}

export async function getModelMolecularDataDetails(
	molecularCharacterizationId: number,
	dataType: string,
	filter: string,
	page: number,
	pageSize: number,
	sortColumn: string,
	sortDirection: string
) {
	if (!molecularCharacterizationId) {
		return [];
	}
	const typeEndpointMap: any = {
		mutation: "mutation_data_table",
		expression: "expression_data_table",
		"copy number alteration": "cna_data_table",
		"bio markers": "biomarker_data_table"
	};
	const endpoint = typeEndpointMap[dataType];
	let request = `${process.env.NEXT_PUBLIC_API_URL}/${endpoint}?molecular_characterization_id=eq.${molecularCharacterizationId}`;
	if (filter) {
		request += `&text=ilike.*${filter}*`;
	}
	request += `&limit=${pageSize}&offset=${(page - 1) * pageSize}`;
	if (sortColumn) {
		request += `&order=${sortColumn}`;
		if (sortDirection) {
			request += `.${sortDirection}`;
		}
	}
	let response = await fetch(request, { headers: { Prefer: "count=exact" } });
	if (!response.ok) {
		throw new Error("Network response was not ok");
	}
	return response.json().then((d) => {
		return [
			parseInt(response.headers.get("Content-Range")?.split("/")[1] || "0"),
			d.map((item: any) => {
				delete item.molecular_characterization_id;
				delete item.text;
				return item;
			})
		];
	});
}

export async function getModelEngraftments(
	pdcmModelId: number,
	modelType: string
): Promise<Engraftment[]> {
	if ((pdcmModelId !== 0 && !pdcmModelId) || modelType !== "PDX") {
		return [];
	}
	let response = await fetch(
		`${process.env.NEXT_PUBLIC_API_URL}/xenograft_model_specimen?model_id=eq.${pdcmModelId}&select=host_strain(name, nomenclature),engraftment_site(name),engraftment_type(name),engraftment_sample_type(name),engraftment_sample_state(name),passage_number`
	);
	if (!response.ok) {
		throw new Error("Network response was not ok");
	}
	return response.json().then((d) => {
		return d.map((item: APIEngraftment) => {
			const {
				host_strain: hostStrain,
				engraftment_site: engraftmentSite,
				engraftment_type: engraftmentType,
				engraftment_sample_type: engraftmentSampleType,
				engraftment_sample_state: engraftmentSampleState,
				...rest
			} = item;

			return {
				...camelCase(rest),
				hostStrain: hostStrain?.name ?? "",
				hostStrainNomenclature: hostStrain?.nomenclature ?? "",
				engraftmentSite: engraftmentSite.name,
				engraftmentType: engraftmentType.name,
				engraftmentSampleType: engraftmentSampleType.name,
				engraftmentSampleState: engraftmentSampleState?.name ?? ""
			};
		});
	});
}

const addDataToEntries = (
	entry: APITreatment[number]["entries"][number],
	response: string,
	passageRange?: string
) => {
	entry.response = response;
	passageRange && (entry.passage_range ??= passageRange);
	entry.external_db_links?.sort((a, b) =>
		a.resource_label.localeCompare(b.resource_label)
	);
};

export const getPatientTreatment = async (pdcmModelId: number) => {
	if (pdcmModelId !== 0 && !pdcmModelId) {
		return [];
	}

	let response = await fetch(
		`${process.env.NEXT_PUBLIC_API_URL}/patient_treatment?model_id=eq.${pdcmModelId}&select=*`
	);

	if (!response.ok) {
		throw new Error("Network response was not ok");
	}

	return response.json().then((d: APITreatment) =>
		d.map((item) => {
			item.entries.forEach((entry) => {
				addDataToEntries(entry, item.response);
			});

			return camelCase(item.entries) as unknown as CamelCaseKeys<
				APITreatment[number]["entries"]
			>[number][];
		})
	);
};

export async function getModelDrugDosing(pdcmModelId: number) {
	if (!pdcmModelId) {
		return [];
	}
	let response = await fetch(
		`${process.env.NEXT_PUBLIC_API_URL}/dosing_studies?model_id=eq.${pdcmModelId}&select=*`
	);
	if (!response.ok) {
		throw new Error("Network response was not ok");
	}
	return response.json().then((d: APITreatment) => {
		return d.map((item) => {
			item.entries.forEach((entry) => {
				addDataToEntries(entry, item.response, item.passage_range);
			});

			return camelCase(item.entries) as unknown as CamelCaseKeys<
				APITreatment[number]["entries"]
			>[number][];
		});
	});
}

const getBioStudiesTitleSearchResults = async (
	modelId: string
): Promise<Record<string, string>> => {
	if (!modelId) return {};

	const searchResultsResponse = await fetch(
		`https://wwwdev.ebi.ac.uk/biostudies/api/v1/search?title=${modelId}`
	);

	if (!searchResultsResponse.ok) {
		throw new Error("Network response was not ok");
	}

	// we're assuming the model ID is the first result of searching the id on biostudies
	// this is the best way to do it right now
	const accessionId = await searchResultsResponse
		.json()
		.then((d) => (d.hits.length > 0 ? d.hits[0].accession : ""));
	const modelDataResponse = await fetch(
		`https://ftp.ebi.ac.uk/pub/databases/biostudies/.beta/CMO-/${accessionId.slice(
			-3
		)}/${accessionId}/${accessionId}.json`
	);

	if (!modelDataResponse.ok) {
		throw new Error("Network response was not ok");
	}

	return modelDataResponse.json();
};

const parseMetadata = (allData: any): ParsedModelMetadata => {
	//we get/return these pieces of data
	// case sensitive
	const criteria = [
		{ key: "name", value: "Cancer Grade" },
		{ key: "name", value: "Cancer Stage" },
		{ key: "name", value: "Cancer System" },
		{ key: "name", value: "Collection Site" },
		{ key: "name", value: "Histology" },
		{ key: "name", value: "License" },
		{ key: "name", value: "Model ID" },
		{ key: "name", value: "Study type" },
		{ key: "name", value: "Patient Age" },
		{ key: "name", value: "Patient Ethnicity" },
		{ key: "name", value: "Patient Sex" },
		{ key: "name", value: "Primary Site" },
		{ key: "name", value: "Title" },
		{ key: "type", value: "Organization" },
		{ key: "name", value: "Tumour Type" },
		{ key: "name", value: "ReleaseDate" }
	];

	// find the key value pairs inside the [deep?] object
	const data = findMultipleByKeyValues(allData, criteria);

	// here we access the piece of data we need
	// returns objects
	const cancerGrade = data["name:Cancer Grade"][0]?.value;
	const cancerStage = data["name:Cancer Stage"][0]?.value;
	const cancerSystem = data["name:Cancer System"][0]?.value;
	const collectionSite = data["name:Collection Site"][0]?.value;
	const histology = data["name:Histology"][0]?.value;
	const licenseName = data["name:License"][0]?.value;
	const licenseUrl = data["name:License"][0]?.valqual?.[0].value;
	const modelId = data["name:Model ID"][0]?.value;
	const modelType = data["name:Study type"][0]?.value;
	const patientAge = data["name:Patient Age"][0]?.value;
	const patientEthnicity = data["name:Patient Ethnicity"][0]?.value;
	const patientSex = data["name:Patient Sex"][0]?.value;
	const primarySite = data["name:Primary Site"][0]?.value;
	const title = data["name:Title"][0]?.value; //  "[providerId] [modelType] [modelId] Histology"
	const providerId = title.match(/\[(.*?)\]/)[1]; // first match is provider id
	const providerName = data["type:Organization"][0]?.attributes[0].value;
	const tumourType = data["name:Tumour Type"][0]?.value;
	const dateSubmitted = data["name:ReleaseDate"][0]?.value;

	return {
		cancerGrade,
		cancerStage,
		cancerSystem,
		collectionSite,
		histology,
		licenseName,
		licenseUrl,
		modelId,
		modelType,
		patientAge,
		patientEthnicity,
		patientSex,
		primarySite,
		providerId,
		providerName,
		tumourType,
		dateSubmitted
	};
};

type Attribute = {
	name: string;
	value: string;
};

type Subsection = {
	type?: string;
	attributes: Attribute[];
};

type BsImmuneMarkers = {
	subsections: Subsection[][];
};

const parseImmuneMarkers = (allData: any): ImmuneMarker[] => {
	const data = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Immune markers" }
	]);
	const bsImmuneMarkers: BsImmuneMarkers = data["type:Immune markers"]?.[0];
	const immuneMarkers: ImmuneMarker[] = [];

	if (bsImmuneMarkers) {
		for (const group of bsImmuneMarkers.subsections) {
			for (const item of group) {
				const sampleIdAttr = item.attributes.find(
					(attr) => attr.name === "Sample ID"
				);
				const sampleId = sampleIdAttr ? sampleIdAttr.value : "Unknown";

				const isHla = item.type === "HLA";
				const markerType = isHla ? "HLA type" : "Model Genomics";

				const markers = item.attributes
					.filter((attr) => attr.name !== "Sample ID")
					.map((attr) => {
						const [mainValue, ...detailParts] =
							attr.value.split(/\s*\((.*?)\)\s*/);
						const valueList = mainValue
							.split("\n")
							.map((s) => s.trim())
							.filter(Boolean);

						const detailsMatch = attr.value.match(/\(([^)]+)\)/);
						const details = detailsMatch ? detailsMatch[1].trim() : "";

						return {
							name: attr.name,
							value: valueList.length > 0 ? valueList : [mainValue.trim()],
							details: valueList.length > 1 || !details ? details : ""
						};
					});

				immuneMarkers.push({
					sampleId,
					type: markerType,
					markers
				});
			}
		}
	}

	return immuneMarkers;
};

type BioStudiesDataAttribute = {
	name: string;
	value: string | number | null;
	valqual: any;
};

type ExternalDbLink = {
	column: string;
	resource: string;
	link: string;
};

const parseMolecularData = (
	allData: any,
	modelId: string,
	providerId: string
): MolecularData[] => {
	const data = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Molecular data" }
	]);
	const molecularData = data["type:Molecular data"];

	return molecularData.map((entry) => {
		const attrMap: Map<string, BioStudiesDataAttribute> = new Map(
			entry.attributes.map((attr: BioStudiesDataAttribute) => [
				attr.name,
				attr
			])
		);

		const sampleId = attrMap.get("Sample ID")?.value as string;
		const sampleType = attrMap.get("Sample Type")?.value as string;
		const engraftedTumourPassage =
			attrMap.get("Engrafted Tumour Passage")?.value as string;
		const dataType = attrMap.get("Data Type")?.value as string;
		const platformName = attrMap.get("Platform Used")?.value as string;
		const platformId = `${dataType.replace(/\s+/g, "_")}_${platformName.replace(
			/\s+/g,
			"_"
		)}`;

		const dbNames = ["ENA", "EGA", "GEO", "dbGAP"];
		const externalDbLinks: ExternalDbLink[] = [];

		for (const db of dbNames) {
			const attr = attrMap.get(db);
			if (attr?.valqual) {
				const url = attr.valqual.find((v: any) => v.name === "url")?.value;
				if (url) {
					externalDbLinks.push({
						column: "raw_data_url",
						resource: db,
						link: url
					});
				}
			}
		}

		return {
			modelId,
			dataSource: providerId,
			sampleId,
			sampleType,
			engraftedTumourPassage,
			dataType,
			platformId,
			platformName,
			externalDbLinks: externalDbLinks.length > 0 ? externalDbLinks : []
		};
	});
};

const parseExtLinks = (allData: any): ExtLinks => {
	const identifiers = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Identifiers" }
	])["type:Identifiers"];
	const supplier = findMultipleByKeyValues(allData, [
		{ key: "name", value: "Supplier" }
	])["name:Supplier"]?.[0];
  const supplierRegex = /^(.+?)\s*\((.+?)\)$/;
  const supplierValues = supplier?.value?.match(supplierRegex);
  const supplierUrl = supplier.valqual?.find((qual: BioStudiesDataAttribute) => qual.name === "url")?.value;

	const parsedIdentifiers = identifiers.map((entry) => {
		const resourceLabel = entry.attributes.find(
			(attr: BioStudiesDataAttribute) => attr.name === "Resource"
		)?.value;
		const linkAttr = entry.attributes.find(
			(attr: BioStudiesDataAttribute) => attr.name === "Link"
		);
		const linkLabel = linkAttr?.value;
		const url = linkAttr?.valqual?.find(
			(qual: BioStudiesDataAttribute) => qual.name === "url"
		)?.value;

		return {
			type: "external_id" as const,
			link: url,
			resourceLabel,
			linkLabel
		};
	});

	return {
		externalModelLinksByType: {
			external_id: parsedIdentifiers,
			supplier: [
				{
          type: "supplier",
					link: supplierUrl,
          resourceLabel: supplierValues[2], // value outside parenthesis
          linkLabel:  supplierValues[1], // value inside parenthesis
				}
			]
		}
	};
};

export const getAllModelData = async (
	modelId: string,
	providerId?: string
): Promise<AllModelData> => {
	const modelProviderId = providerId ?? (await getProviderId(modelId));
	const modelData = await getBioStudiesTitleSearchResults(modelId);
	console.log({ modelData });
	const metadata = parseMetadata(modelData);
	const metadataa = await getModelDetailsMetadata(modelId, modelProviderId);
	const immuneMarkers = parseImmuneMarkers(modelData);
	const molecularData = parseMolecularData(modelData, modelId, modelProviderId);
	const pdcmModelId: number = metadataa.pdcmModelId;
	const extLinks = parseExtLinks(modelData);
	// const extLinks = await getModelExtLinks(pdcmModelId, modelId); // todo
	const modelType = metadataa.modelType;
	const engraftments = await getModelEngraftments(pdcmModelId, modelType); // todo
	const drugDosing = await getModelDrugDosing(pdcmModelId); // todo
	const patientTreatment = await getPatientTreatment(pdcmModelId); // todo
	const qualityData = await getModelQualityData(pdcmModelId); // todo
	const modelImages = await getModelImages(modelId); // todo
	const knowledgeGraph = await getModelKnowledgeGraph(modelId); // todo
	let cellModelData = {} as CellModelData;

	if (modelType !== "PDX") {
		cellModelData = await getCellModelData(pdcmModelId);
	}

	return {
		metadata,
		extLinks,
		molecularData,
		immuneMarkers,
		engraftments,
		cellModelData,
		drugDosing,
		patientTreatment,
		qualityData,
		knowledgeGraph,
		modelImages,
		publications: [] as Publication[]
	};
};
