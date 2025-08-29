import {
	AllModelData,
	Attribute,
	BioStudiesModelData,
	BsImmuneMarkers,
	CellModelData,
	Engraftment,
	ExternalModelLink,
	ExtLinks,
	ImmuneMarker,
	ModelImage,
	MolecularData,
	MolecularDataExternalDbLink,
	ParsedModelMetadata,
	Publication,
	QualityData,
	RelatedModel,
	RelatedModelRoles,
	RelatedModels,
	Subsection,
	Treatment,
	TreatmentExternalDbLink
} from "../types/ModelData.model";
import findMultipleByKeyValues from "../utils/findMultipleByKeyValues";

type SearchHit = {
	accession: string;
	type: string;
	title: string;
	author: string;
	links: number;
	files: number;
	release_date: string;
	views: number;
	isPublic: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getBioStudiesTitleSearchResults = async (
	modelId: string,
	providerId?: string
): Promise<BioStudiesModelData> => {
	if (!modelId) return {} as BioStudiesModelData;

	const searchResultsResponse = await fetch(
		`${API_URL}/search?type=study&isPublic=true&title=${modelId}${
			providerId ? `+AND+${providerId}` : ""
		}`
	);
	if (!searchResultsResponse.ok) {
		throw new Error("Network response was not ok");
	}

	// out of the first 10 results, get the one that the title has the id
	// we're not using .includes since there might be a partial match (eg. CMP_10 includes CMP_1)
	const accessionId = await searchResultsResponse.json().then((d) => {
		const { hits }: { hits: SearchHit[] } = d;

		return (
			hits.find((study) => {
				const bracketValues = study.title.match(
					/(?:\[[^\]]*\]\s*){2}\[([^\]]+)\]/
				);

				// [providerId] [modelType] [modelId] Histology
				// bracketValues?.[1] is modelId
				return bracketValues?.[1] === modelId;
			})?.accession ?? ""
		);
	});

	if (!accessionId) {
		throw new Error(
			`No model exists with that accession ID. No id for: ${modelId}`
		);
	}

	const modelDataResponse = await fetch(
		`https://wwwdev.ebi.ac.uk/biostudies/api/v1/studies/${accessionId}`
	);

	if (!modelDataResponse.ok) {
		throw new Error("Network response was not ok");
	}

	return modelDataResponse.json();
};

const parseMetadata = (allData: BioStudiesModelData): ParsedModelMetadata => {
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
		{ key: "name", value: "Model type" },
		{ key: "name", value: "Patient Age" },
		{ key: "name", value: "Patient Ethnicity" },
		{ key: "name", value: "Patient Sex" },
		{ key: "name", value: "Primary Site" },
		{ key: "type", value: "Organization" },
		{ key: "name", value: "Tumour Type" },
		{ key: "name", value: "ReleaseDate" }
	];

	// find the key value pairs inside the [deep?] object
	const data = findMultipleByKeyValues(allData, criteria);

	// here we access the piece of data we need
	// returns objects
	const biostudiesAccessionId = allData.accno ?? null;
	const cancerGrade = data["name:Cancer Grade"]?.[0]?.value ?? null;
	const cancerStage = data["name:Cancer Stage"]?.[0]?.value ?? null;
	const cancerSystem = data["name:Cancer System"]?.[0]?.value ?? null;
	const collectionSite = data["name:Collection Site"]?.[0]?.value ?? null;
	const histology = data["name:Histology"]?.[0]?.value ?? null;
	const licenseName = data["name:License"]?.[0]?.value ?? null;
	const licenseUrl = data["name:License"]?.[0]?.valqual?.[0].value ?? null;
	const modelId = data["name:Model ID"]?.[0]?.value ?? null;
	const modelType = data["name:Model type"]?.[0]?.value ?? null;
	const patientAge = data["name:Patient Age"]?.[0]?.value ?? null;
	const patientEthnicity = data["name:Patient Ethnicity"]?.[0]?.value ?? null;
	const patientSex = data["name:Patient Sex"]?.[0]?.value ?? null;
	const primarySite = data["name:Primary Site"]?.[0]?.value ?? null;
	const organization =
		data["type:Organization"]?.[0]?.attributes?.[0].value ?? null;
	const providerId = organization.match(/\(([^)]+)\)/)[1] ?? null; // parenthesis that includes the ID
	const providerName = organization.match(/^(.*?)\s*\(/)[1] ?? null; // we don't want the parenthesis that includes the ID
	const tumourType = data["name:Tumour Type"]?.[0]?.value ?? null;
	const dateSubmitted = data["name:ReleaseDate"]?.[0]?.value ?? null;

	return {
		biostudiesAccessionId,
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

const parseImmuneMarkers = (allData: BioStudiesModelData): ImmuneMarker[] => {
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

const parseMolecularData = (
	allData: BioStudiesModelData,
	modelId: string,
	providerId: string
): MolecularData[] => {
	const data = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Molecular data" }
	]);
	const molecularData = data["type:Molecular data"];

	if (!molecularData) return [];

	return molecularData.map((entry) => {
		const attrMap: Map<string, Attribute> = new Map(
			entry.attributes.map((attr: Attribute) => [attr.name, attr])
		);

		const sampleId = attrMap.get("Sample ID")?.value as string;
		const sampleType = attrMap.get("Sample Type")?.value as string;
		const engraftedTumourPassage = attrMap.get("Engrafted Tumour Passage")
			?.value as string;
		const dataType = attrMap.get("Data Type")?.value as string;
		const platformName = attrMap.get("Platform Used")?.value as string;
		const platformId = `${dataType.replace(/\s+/g, "_")}_${platformName.replace(
			/\s+/g,
			"_"
		)}`;

		const dbNames = ["ENA", "EGA", "GEO", "dbGAP"];
		const externalDbLinks: MolecularDataExternalDbLink[] = [];

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

const parseExtLinks = (allData: BioStudiesModelData): ExtLinks => {
	const identifiers: Subsection[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Identifiers" }
	])["type:Identifiers"];
	const supplier: Attribute = findMultipleByKeyValues(allData, [
		{ key: "name", value: "Supplier" }
	])["name:Supplier"]?.[0];
	let parsedExtLinksObj = { externalModelLinksByType: {} } as ExtLinks;

	if (!identifiers && !supplier) return parsedExtLinksObj;

	const parsedIdentifiers: ExternalModelLink[] =
		identifiers &&
		identifiers.map((entry) => {
			const resourceLabel = entry.attributes.find(
				(attr: Attribute) => attr.name === "Resource"
			)?.value;
			const linkAttr = entry.attributes.find(
				(attr: Attribute) => attr.name === "Link"
			);
			const linkLabel = linkAttr?.value;
			const url = linkAttr?.valqual?.find(
				(qual: Attribute) => qual.name === "url"
			)?.value;

			return {
				type: "external_id" as const,
				link: url || "",
				resourceLabel: resourceLabel || "",
				linkLabel: linkLabel || ""
			};
		});

	if (parsedIdentifiers && supplier) {
		const supplierRegex = /^(.+?)\s*\((.+?)\)$/;
		const supplierValues: string[] =
			supplier?.value?.match(supplierRegex) || [];
		const supplierUrl =
			supplier.valqual?.find((qual: Attribute) => qual.name === "url")?.value ||
			"";

		parsedExtLinksObj.externalModelLinksByType = {
			external_id: parsedIdentifiers,
			supplier: [
				{
					type: "supplier",
					link: supplierUrl,
					resourceLabel: supplierValues[2], // value outside parenthesis
					linkLabel: supplierValues[1] // value inside parenthesis
				}
			]
		};
	}

	return parsedExtLinksObj;
};

const parseEngraftments = (allData: BioStudiesModelData): Engraftment[] => {
	const engraftments: Subsection[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "PDX model engraftment" }
	])["type:PDX model engraftment"];

	if (!engraftments) return [];

	return engraftments.map((entry) => {
		const attrMap: Map<string, Attribute> = new Map(
			entry.attributes.map((attr: Attribute) => [attr.name, attr])
		);

		const passageNumber = (attrMap.get("Passage")?.value as string) ?? "";
		const hostStrain = (attrMap.get("Host Strain Name")?.value as string) ?? "";
		const hostStrainNomenclature =
			(attrMap.get("Host Strain Nomenclature")?.value as string) ?? "";
		const engraftmentSite = (attrMap.get("Site")?.value as string) ?? "";
		const engraftmentType = (attrMap.get("Type")?.value as string) ?? "";
		const engraftmentSampleType =
			(attrMap.get("Material")?.value as string) ?? "";
		const engraftmentSampleState =
			(attrMap.get("Material Status")?.value as string) ?? "";

		return {
			passageNumber,
			hostStrain,
			hostStrainNomenclature,
			engraftmentSite,
			engraftmentType,
			engraftmentSampleType,
			engraftmentSampleState
		};
	});
};

const parseDrugDosing = (allData: BioStudiesModelData): Treatment[][] => {
	const modelTreatment: Subsection[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Model treatment" }
	])["type:Model treatment"];

	if (!modelTreatment || modelTreatment.length === 0) return [];

	return modelTreatment.map(({ attributes }: { attributes: Attribute[] }) => {
		const drugAttr = attributes.find((attr) => attr.name === "Drug");
		const doseAttr = attributes.find((attr) => attr.name === "Dose");
		const passage =
			attributes.find((attr) => attr.name === "Passage")?.value ?? "";
		const response =
			attributes.find((attr) => attr.name === "Response")?.value ?? "";

		const drugs = ((drugAttr?.value as string) ?? "")
			.split(/\s*\+\s*/)
			.map((t) => t.trim());
		const doses = ((doseAttr?.value as string) ?? "")
			.split(/\s*\+\s*/)
			.map((t) => t.trim());

		const externalDbLinks: Record<string, TreatmentExternalDbLink[]> = {};

		for (const attr of attributes) {
			if (attr.valqual && attr.valqual.length > 0) {
				const url = attr.valqual.find(
					(v: Attribute) => v.name === "url"
				)?.value;
				if (url && attr.name) {
					if (!externalDbLinks[attr.name]) externalDbLinks[attr.name] = [];
					externalDbLinks[attr.name].push({
						link: url,
						resourceLabel: attr.name
					});
				}
			}
		}

		return drugs.map((drugName, index) => {
			const dose = doses[index] ?? doses[0] ?? "";
			const dbLinks = [
				...(externalDbLinks["ChEMBL"] ?? []),
				...(externalDbLinks["PubChem"] ?? [])
			];

			return {
				name: drugName,
				dose,
				passageRange: passage,
				response,
				externalDbLinks: dbLinks
			} as Treatment;
		});
	});
};

const parsePatientTreatment = (allData: BioStudiesModelData): Treatment[][] => {
	const patientTreatment: Subsection[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Patient treatment" }
	])["type:Patient treatment"];

	if (!patientTreatment || patientTreatment.length === 0) return [];

	return patientTreatment.map((entry) => {
		const attrMap: Record<string, Attribute> = Object.fromEntries(
			entry.attributes.map((attr: Attribute) => [attr.name, attr])
		);

		const dose = attrMap["Dose"]?.value ?? "not provided";
		const response = attrMap["Response"]?.value ?? "not provided";

		const treatmentNames = (attrMap["Treatment"]?.value ?? "")
			.split(/\s*\+\s*/)
			.map((t) => t.trim());

		return treatmentNames.map((treatmentName) => {
			const links: TreatmentExternalDbLink[] = [];

			for (const db of ["ChEMBL", "PubChem"]) {
				const attr = attrMap[db];
				const url = attr?.valqual?.find(
					(vq: Attribute) => vq.name === "url"
				)?.value;

				if (url) {
					links.push({ link: url, resourceLabel: db });
				}
			}

			return {
				name: treatmentName,
				dose,
				response,
				externalDbLinks: links.length > 0 ? links : null
			} as Treatment;
		});
	});
};

const parseQualityData = (allData: BioStudiesModelData): QualityData[] => {
	const qualityData: Subsection[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Model quality control" }
	])["type:Model quality control"];

	if (!qualityData) return [];

	return qualityData.map((item) => {
		const getValue = (name: string) =>
			item.attributes.find((attr: Attribute) => attr.name === name)?.value ??
			"Not provided";

		return {
			description: getValue("Description"),
			passagesTested: getValue("Passage"),
			validationTechnique: getValue("Technique"),
			validationHostStrainNomenclature: "Not provided",
			morphologicalFeatures: "Not provided",
			snpAnalysis: "Not provided",
			strAnalysis: "Not provided",
			tumourStatus: "Not provided",
			modelPurity: "Not provided",
			comments: "Not provided"
		};
	});
};

const parseModelImages = (allData: BioStudiesModelData): ModelImage[] => {
	const histologyImages: Subsection[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Histology images" }
	])["type:Histology images"];

	if (!histologyImages) return [];

	return histologyImages.map((item) => {
		const getValue = (name: string): string =>
			item.attributes.find((attr: Attribute) => attr.name === name)?.value ??
			"Not provided";

		const getValqualURL = (): string => {
			const urlAttr = item.attributes.find(
				(attr: Attribute) => attr.name === "Url"
			);

			return (
				urlAttr?.valqual?.find((v: Attribute) => v.name === "URL")?.value ??
				"Not provided"
			);
		};

		return {
			url: getValqualURL(),
			description: getValue("Description"),
			sampleType: getValue("Sample type"),
			passage: getValue("Passage"),
			magnification: getValue("Magnification"),
			staining: getValue("Staining")
		};
	});
};

const parseRelatedModel = (allData: BioStudiesModelData): RelatedModel[] => {
	const relatedModels: RelatedModels[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Related models" }
	])["type:Related models"];

	if (!relatedModels) return [];

	const getValue = (srcObj: any, name: string): string =>
		srcObj.find((attr: Attribute) => attr.name === name)?.value ??
		"Not provided";

	function isRoleTS(value: any): value is RelatedModelRoles {
		return value === "parent of" || value === "child of";
	}

	const rawRole = getValue(relatedModels?.[0].links[0].attributes, "Role");

	return relatedModels?.[0].links.map((link) => {
		return {
			role: isRoleTS(rawRole) ? rawRole : "parent of",
			relatedModelId: link.url
		};
	});
};

const parseCellModelData = (allData: BioStudiesModelData): CellModelData => {
	const cellModelData: Subsection[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Model derivation" }
	])["type:Model derivation"];

	const getValue = (name: string): string =>
		cellModelData?.[0].attributes.find((attr: Attribute) => attr.name === name)
			?.value ?? "Not provided";

	return {
		growthProperties: getValue("Growth properties"),
		growthMedia: getValue("Growth media"),
		plateCoating: getValue("Plate coating"),
		passageNumber: getValue("Passage"),
		supplements: getValue("Supplements"),
		contaminated: getValue("Contaminated"),
		contaminationDetails: getValue("Contamination details")
	};
};

const parsePublications = (allData: BioStudiesModelData): Publication[] => {
	const publications: Subsection[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Publications" }
	])["type:Publications"];

	if (!publications) return [];

	return publications.map((item) => {
		const getValue = (name: string): string =>
			item.attributes.find((attr: Attribute) => attr.name === name)?.value ??
			"Not provided";

		const getValqualURL = (name: string): string => {
			const attr = item.attributes.find(
				(attr: Attribute) => attr.name === name
			);

			return (
				attr?.valqual?.find((v: Attribute) => v.name === "url")?.value ?? ""
			);
		};

		return {
			pmid: getValqualURL("PubMed"),
			doi: {
				id: getValue("DOI"),
				url: getValqualURL("DOI")
			},
			pubYear: getValue("Year"),
			title: getValue("Title"),
			authorString: getValue("Authors")
		};
	});
};

export const getAllModelData = async (
	modelId: string,
	providerId?: string
): Promise<AllModelData> => {
	const modelData = await getBioStudiesTitleSearchResults(modelId, providerId);
	const metadata = parseMetadata(modelData);
	const immuneMarkers = parseImmuneMarkers(modelData);
	const molecularData = parseMolecularData(
		modelData,
		modelId,
		metadata.providerId
	);
	const extLinks = parseExtLinks(modelData);
	const modelType = metadata.modelType;
	const engraftments = parseEngraftments(modelData);
	const drugDosing = parseDrugDosing(modelData);
	const patientTreatment = parsePatientTreatment(modelData);
	const qualityData = parseQualityData(modelData);
	const modelImages = parseModelImages(modelData);
	const relatedModel = parseRelatedModel(modelData);
	const publications = parsePublications(modelData);

	let cellModelData = {} as CellModelData;

	if (modelType !== "PDX") {
		cellModelData = parseCellModelData(modelData);
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
		relatedModel,
		modelImages,
		publications
	};
};
