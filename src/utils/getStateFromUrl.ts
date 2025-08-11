import { ReadonlyURLSearchParams } from "next/navigation";
import { SearchState } from "../pages/search";

function paramsToObject(
	entries: Iterable<[string, string]>
): Record<string, string> {
	const result: Record<string, string> = {};

	for (const [key, value] of entries) {
		result[key] = value;
	}

	return result;
}

const getStateFromUrl = (url: ReadonlyURLSearchParams): SearchState => {
	const paramObj = paramsToObject(url.entries());
	console.log(paramObj);
	// TODO get selected facets
	return {
		page: paramObj.page ? Number(paramObj.page) : 1,
		selectedFacets: {},
		searchQuery: paramObj.query
	};
};
