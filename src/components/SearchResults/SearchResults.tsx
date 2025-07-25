import SearchResult from "./SearchResult/SearchResult";

import { SearchResult as SearchResultType } from "../../types/Search.model";

type SearchResultsProps = {
	compareModel: (id: string) => void;
	modelsToCompare: string[];
	data: SearchResultType[];
};

const SearchResults = (props: SearchResultsProps) => {
	return (
		<>
			{props.data.map((result) => {
				const modelId = result.modelId;

				return (
					<div className="row mb-3 mb-md-2" key={modelId + result.histology}>
						<SearchResult
							addModelToCompare={() => props.compareModel(modelId)}
							compareCheck={props.modelsToCompare.includes(modelId)}
							data={result}
						/>
					</div>
				);
			})}
		</>
	);
};

export default SearchResults;
