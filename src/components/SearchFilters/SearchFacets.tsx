import { memo } from "react";
import { FacetSection } from "../../types/Facet.model";
import Card from "../Card/Card";
import InputAndLabel from "../Input/InputAndLabel";

type SearchFacets = {
	data: FacetSection[];
	onFilterChange: (sectionName: string, facetValue: string) => void;
};

const SearchFacets = ({ data, onFilterChange }: SearchFacets) => {
	return (
		<Card
			className="bg-lightGray bc-transparent overflow-visible"
			contentClassName="pt-0 pb-3 px-2"
			id="tour_filters"
		>
			{data?.map((section) => {
				return (
					<div className="w-100" key={section.name}>
						<h3 className="mb-0 p text-bold d-inline-block text-capitalize">
							{section.title}
						</h3>
						<hr />
						<ul className="ul-noStyle m-0 text-capitalize">
							{section.children.map((option) => {
								return (
									<li key={section.name + option.name}>
										<InputAndLabel
											data-hj-allow={true}
											forId={section.name + option.name}
											id={section.name + option.name}
											name={`${option.name}-name`}
											type="checkbox"
											label={option.name}
											onChange={() =>
												onFilterChange(section.name, option.value)
											}
										/>
									</li>
								);
							})}
						</ul>
					</div>
				);
			})}
		</Card>
	);
};

export default memo(SearchFacets);
