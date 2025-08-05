import { FacetSection } from "../types/Facet.model";
import { BioStudiesModelData } from "../types/ModelData.model";
import { SearchResult } from "../types/Search.model";
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

export const getSearchResults = async (
	page: number,
	selectedFacets: Record<string, string[]>,
	query?: string
) => {
	let totalHits = 0;
	let queryParts = [`${API_URL}/search?pageSize=10&page=${page}`];

	if (query) {
		queryParts.push(`title=${encodeURIComponent(query)}`);
	}

	Object.entries(selectedFacets).forEach(([facet, options]) => {
		options.forEach((option) => {
			queryParts.push(
				`${encodeURIComponent(facet)}=${encodeURIComponent(option)}`
			);
		});
	});

	const searchQueryString = queryParts.join("&");

	const searchResultsResponse = await fetch(searchQueryString);

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

    const data = searchResultsIds ? await Promise.all(
      searchResultsIds.map(async (id: string) => {
        const modelData = await fetch(
          `https://wwwdev.ebi.ac.uk/biostudies/api/v1/studies/${id}`
        );
        
        if (!modelData.ok) {
          throw new Error(`Failed to fetch study with id ${id}`);
        }
        
        return modelData.json().then((d) => parseSearchResultModelData(d));
      })
    ) : [];

	return { data, totalHits };
};

export async function getSearchFacets(): Promise<FacetSection[]> {
	let response = await fetch(`${API_URL}/facets`);

	if (!response.ok) {
		throw new Error("Network response was not ok");
	}

	return response.json();
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
