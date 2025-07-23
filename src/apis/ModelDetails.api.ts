import {
  AllModelData,
  CellModelData,
  Engraftment,
  ExtLinks,
  ImmuneMarker,
  ModelImage,
  MolecularData,
  ParsedModelMetadata,
  Publication,
  QualityData,
  RelatedModelRoles
} from "../types/ModelData.model";
import findMultipleByKeyValues from "../utils/findMultipleByKeyValues";

const getBioStudiesTitleSearchResults = async (
	modelId: string,
	providerId?: string
): Promise<Record<string, string>> => {
	if (!modelId) return {};

	const searchResultsResponse = await fetch(
		`https://wwwdev.ebi.ac.uk/biostudies/api/v1/CancerModelsOrg/search?title=${modelId}${
			providerId && `+AND+${providerId}`
		}&type=study&isPublic=true`
	);

	if (!searchResultsResponse.ok) {
		throw new Error("Network response was not ok");
	}

	// we're assuming the model ID is the first result of searching the id on biostudies
	// this is the best way to do it right now
	const accessionId = await searchResultsResponse
		.json()
		.then((d) => (d.totalHits > 0 ? d.hits[0].accession : ""));

	if (!accessionId) {
		throw new Error("No model exists with that accession ID");
	}

	const modelDataResponse = await fetch(
		`https://wwwdev.ebi.ac.uk/biostudies/api/v1/studies/${accessionId}`
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
	const providerName =
		data["type:Organization"][0]?.attributes[0].value.match(/^(.*?)\s*\(/)[1]; // we don't want the parenthesis that includes the ID
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
	valqual?: { name: string; value: string }[];
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

type BioStudiesDataValqual = { name: string; value: string };

type BioStudiesDataAttribute = {
	name: string;
	value: string | number | null;
	valqual?: BioStudiesDataValqual[];
};

type MolecularDataExternalDbLink = {
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
	if (!molecularData) return [];

	return molecularData.map((entry) => {
		const attrMap: Map<string, BioStudiesDataAttribute> = new Map(
			entry.attributes.map((attr: BioStudiesDataAttribute) => [attr.name, attr])
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

const parseExtLinks = (allData: any): ExtLinks => {
	const identifiers: any[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Identifiers" }
	])["type:Identifiers"];
	const supplier = findMultipleByKeyValues(allData, [
		{ key: "name", value: "Supplier" }
	])["name:Supplier"]?.[0];
	let parsedExtLinksObj = { externalModelLinksByType: {} } as ExtLinks;

	if (!identifiers && !supplier) return parsedExtLinksObj;

	const parsedIdentifiers =
		identifiers &&
		identifiers.map((entry) => {
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

	if (parsedIdentifiers && supplier) {
		const supplierRegex = /^(.+?)\s*\((.+?)\)$/;
		const supplierValues = supplier?.value?.match(supplierRegex);
		const supplierUrl = supplier.valqual?.find(
			(qual: BioStudiesDataAttribute) => qual.name === "url"
		)?.value;

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

const parseEngraftments = (allData: any): Engraftment[] => {
	const engraftments: any[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "PDX model engraftment" }
	])["type:PDX model engraftment"];

	if (!engraftments) return [];

	return engraftments.map((entry) => {
		const attrMap: Map<string, BioStudiesDataAttribute> = new Map(
			entry.attributes.map((attr: BioStudiesDataAttribute) => [attr.name, attr])
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

type TreatmentExternalDbLink = {
	link: string;
	resourceLabel: string;
};

type Treatment = {
	name: string;
	dose: string;
	passageRange?: string;
	response?: string;
	externalDbLinks?: TreatmentExternalDbLink[];
};

const parseDrugDosing = (allData: any): Treatment[][] => {
	const modelTreatment: any[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Model treatment" }
	])["type:Model treatment"];

	if (!modelTreatment || modelTreatment.length === 0) return [];

	return modelTreatment.map(
		({ attributes }: { attributes: BioStudiesDataAttribute[] }) => {
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
						(v: BioStudiesDataValqual) => v.name === "url"
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
		}
	);
};

const parsePatientTreatment = (allData: any): Treatment[][] => {
	const patientTreatment: any[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Patient treatment" }
	])["type:Patient treatment"];

	if (!patientTreatment || patientTreatment.length === 0) return [];

	return patientTreatment.map((entry) => {
		const attrMap: Record<string, Attribute> = Object.fromEntries(
			entry.attributes.map((attr: BioStudiesDataAttribute) => [attr.name, attr])
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
					(vq: BioStudiesDataValqual) => vq.name === "url"
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

const parseQualityData = (allData: any): QualityData[] => {
	const qualityData: any[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Model quality control" }
	])["type:Model quality control"];

	if (!qualityData) return [];

	return qualityData.map((item) => {
		const getValue = (name: string) =>
			item.attributes.find(
				(attr: BioStudiesDataAttribute) => attr.name === name
			)?.value ?? "Not provided";

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

const parseModelImages = (allData: any): ModelImage[] => {
	const histologyImages: any[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Histology images" }
	])["type:Histology images"];

	if (!histologyImages) return [];

	return histologyImages.map((item) => {
		const getValue = (name: string): string =>
			item.attributes.find(
				(attr: BioStudiesDataAttribute) => attr.name === name
			)?.value ?? "Not provided";

		const getValqualURL = (): string => {
			const urlAttr = item.attributes.find(
				(attr: BioStudiesDataAttribute) => attr.name === "Url"
			);

			return (
				urlAttr?.valqual?.find((v: BioStudiesDataValqual) => v.name === "URL")
					?.value ?? "Not provided"
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

const parseRelatedModel = (allData: any): any[] => {
	// todo any
	const relatedModels: any[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Related models" }
	])["type:Related models"];

	if (!relatedModels) return [];

	const getValue = (srcObj: any, name: string): string =>
		srcObj.find((attr: BioStudiesDataAttribute) => attr.name === name)?.value ??
		"Not provided";

	function isRoleTS(value: any): value is RelatedModelRoles {
		return value === "parent of" || value === "child of";
	}

	const rawRole = getValue(relatedModels[0].links[0].attributes, "Role");

	return relatedModels[0].links.map(
		(link: { url: string; attributes: { name: string; value: string } }) => {
			return {
				role: isRoleTS(rawRole) ? rawRole : "parent of",
				relatedModelId: link.url
			};
		}
	);
};

const parseCellModelData = (allData: any): CellModelData => {
	const cellModelData: any[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Model derivation" }
	])["type:Model derivation"];

	const getValue = (name: string): string =>
		cellModelData[0].attributes.find(
			(attr: BioStudiesDataAttribute) => attr.name === name
		)?.value ?? "Not provided";

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

const parsePublications = (allData: any): Publication[] => {
	const publications: any[] = findMultipleByKeyValues(allData, [
		{ key: "type", value: "Publications" }
	])["type:Publications"];

	if (!publications) return [];

	return publications.map((item) => {
		const getValue = (name: string): string =>
			item.attributes.find(
				(attr: BioStudiesDataAttribute) => attr.name === name
			)?.value ?? "Not provided";

		const getValqualURL = (name: string): string => {
			const attr = item.attributes.find(
				(attr: BioStudiesDataAttribute) => attr.name === name
			);

			return (
				attr?.valqual?.find((v: BioStudiesDataValqual) => v.name === "url")
					?.value ?? ""
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
