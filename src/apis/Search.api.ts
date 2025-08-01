import {
  FacetOperator,
  FacetProps,
  FacetSectionProps
} from "../types/Facet.model";
import { BioStudiesModelData } from "../types/ModelData.model";
import { SearchResult } from "../types/Search.model";
import { camelCase } from "../utils/dataUtils";
import findMultipleByKeyValues from "../utils/findMultipleByKeyValues";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const parseSearchResultModelData = (
	allData: BioStudiesModelData
): SearchResult => {
	// parse to only return needed data for search result
	const criteria = [
		{ key: "name", value: "Model ID" },
		{ key: "type", value: "Organization" },
		{ key: "name", value: "Histology" },
		{ key: "name", value: "Model type" },
		{ key: "name", value: "Tumour Type" },
		{ key: "name", value: "Primary Site" },
		{ key: "name", value: "Collection Site" },
		{ key: "name", value: "Cancer Grade" },
		{ key: "name", value: "Patient Sex" },
		{ key: "name", value: "Patient Age" },

		{ key: "name", value: "Dataset Available" }
	];

	// find the key value pairs inside the [deep?] object
	const data = findMultipleByKeyValues(allData, criteria);

	// here we access the piece of data we need
	// returns objects
	const getFirstValue = (key: string) => data[key]?.[0]?.value;

	// Special handling for provider string parsing
	const orgAttr = data["type:Organization"]?.[0]?.attributes?.[0]?.value || "";
	const providerName = orgAttr.match(/^(.*?)\s*\(/)?.[1] || "";
	const providerId = orgAttr.match(/\(([^)]+)\)/)?.[1] || "";

	const modelId = getFirstValue("name:Model ID");
	const histology = getFirstValue("name:Histology");
	const modelType = getFirstValue("name:Model type");
	const tumourType = getFirstValue("name:Tumour Type");
	const primarySite = getFirstValue("name:Primary Site");
	const collectionSite = getFirstValue("name:Collection Site");
	const patientSex = getFirstValue("name:Patient Sex");
	const patientAge = getFirstValue("name:Patient Age");

	const availableDatasets = data["name:Dataset Available"] || [];

	const getAvailability = (dataset: string) =>
		availableDatasets.some((obj) => obj.value === dataset);

	const CNA = getAvailability("copy number alteration");
	const expression = getAvailability("expression");
	const bioMarkers = getAvailability("bio markers");
	const mutation = getAvailability("mutation");
	const modelTreatment = getAvailability("model treatment");
	const patientTreatment = getAvailability("patient treatment");

	return {
		collectionSite,
		histology,
		modelId,
		modelType,
		patientAge,
		patientSex,
		primarySite,
		providerName,
		providerId,
		tumourType,

		dataAvailable: {
			"copy number alteration": CNA,
			expression: expression,
			"bio markers": bioMarkers,
			mutation: mutation,
			"model treatment": modelTreatment,
			"patient treatment": patientTreatment
		}
	};
};

export const getSearchResults = async (page: number, query?: string) => {
	let totalHits = 0;

	const searchResultsResponse = await fetch(
		`https://wwwdev.ebi.ac.uk/biostudies/api/v1/cancermodelsorg/search?pageSize=10&isPublic=true&page=${page}${
			query ? `&query=${query}` : ""
		}`
	);

	if (!searchResultsResponse.ok) {
		throw new Error("Network response was not ok");
	}

	const searchResultsIds: string[] = await searchResultsResponse
		.json()
		.then((d) => {
			if (d.totalHits > 0) {
				totalHits = d.totalHits;

				return d.hits.map((hit: Record<string, string>) => hit.accession);
			}
		});

	const data = await Promise.all(
		searchResultsIds.map(async (id: string) => {
			const modelData = await fetch(
				`https://wwwdev.ebi.ac.uk/biostudies/api/v1/studies/${id}`
			);

			if (!modelData.ok) {
				throw new Error(`Failed to fetch study with id ${id}`);
			}

			return modelData.json().then((d) => parseSearchResultModelData(d));
		})
	);

	return { data, totalHits };
};

export async function getSearchFacets(): Promise<FacetSectionProps[]> {
	let response = await fetch(
		`${API_URL}/search_facet?facet_section=neq.search&select=facet_section,facet_column,facet_name,facet_example,facet_type,is_boolean,facet_description&order=index`
	);

	const sections: any = {
		model: {
			key: "model",
			name: "Model",
			facets: []
		},
		patient_tumour: {
			key: "patient_tumour",
			name: "Patient / Tumor",
			facets: []
		},
		molecular_data: {
			key: "molecular_data",
			name: "Molecular Data",
			facets: []
		},
		patient_treatment: {
			key: "patient_treatment",
			name: "Patient Treatment",
			facets: []
		},
		model_treatment: {
			key: "model_treatment",
			name: "Model Treatment",
			facets: []
		}
	};

	if (!response.ok) {
		throw new Error("Network response was not ok");
	}

	return response.json().then((d: Array<any>) => {
		d.forEach((element) => {
			const section = sections[element.facet_section];
			if (section) section.facets.push(mapApiFacet(element));
		});
		return Object.values(sections);
	});
}

export async function getFacetOperators(): Promise<FacetOperator[]> {
	try {
		const response = await fetch(
			`${API_URL}/search_facet?select=facet_column,any_operator,all_operator`
		);
		if (!response.ok) {
			throw new Error(`Network response was not ok: ${response.statusText}`);
		}
		const data = await response.json();
		return data.map((d: FacetOperator) => camelCase(d));
	} catch (error) {
		console.error("Error fetching facet operators:", error);
		throw new Error("Failed to fetch facet operators");
	}
}

export async function getFacetOptions(facetColumn: string) {
	let response = await fetch(
		`${API_URL}/search_facet?facet_column=eq.${facetColumn}`
	);
	return response.json().then((d: Array<any>) => {
		const mappedFacet = mapApiFacet(d[0]);
		return mappedFacet.options;
	});
}

export async function autoCompleteFacetOptions(
	facetColumn: string,
	text: string
) {
	const ilikeClause = text.length > 0 ? `, option.ilike."*${text}*"` : "";
	let response = await fetch(
		`${API_URL}/search_facet_options?and=(facet_column.eq.${facetColumn}${ilikeClause})&order=option.asc`
	);
	return response.json().then((d: Array<any>) => {
		return d.map(({ option }) => {
			return { label: option, value: option };
		});
	});
}

function mapApiFacet(apiFacet: any): FacetProps {
	return {
		facetId: apiFacet.facet_column,
		name: apiFacet.facet_name,
		type: apiFacet.facet_type,
		options: apiFacet.facet_options
			? sortOptions(apiFacet.facet_column, apiFacet.facet_options)
			: [],
		placeholder: apiFacet.facet_example,
		isBoolean: apiFacet.is_boolean,
		description: apiFacet.facet_description
	};
}

function sortOptions(facet_column: string, list: string[]) {
	if (facet_column === "patient_age") {
		return list.sort((a: string, b: string) => {
			if (a.includes("months")) return -1;
			if (b.includes("specified")) return -1;
			let aa = a.split(" - ");
			let bb = b.split(" - ");
			if (+aa[0] > +bb[0]) return 1;
			else if (+aa[0] < +bb[0]) return -1;
			else return 0;
		});
	}
	let endList = list.filter(
		(str) =>
			str.toLocaleLowerCase().includes("other") ||
			str.toLocaleLowerCase().includes("not specified")
	);
	let sortedList = list
		.filter((str) => !endList.includes(str))
		.sort((a, b) => a.localeCompare(b));
	return sortedList.concat(endList);
}

export async function getDataSourcesByProject(projectName: string) {
	let response = await fetch(
		`${API_URL}/search_index?project_name=${
			projectName === "More" ? "is.null" : "in.(%22" + projectName + "%22)"
		}&select=data_source,provider_name`
	);
	if (!response.ok) {
		throw new Error("Network response was not ok");
	}

	return response
		.json()
		.then((d: { data_source: string; provider_name: string }[]) => d);
}
