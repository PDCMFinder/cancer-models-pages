export type FacetOperator = {
	facetColumn: string;
	anyOperator: string | null;
	allOperator: string | null;
	facetType: "multivalued" | "autocomplete" | "check";
};

export type FacetSidebarSelection = {
	[facetKey: string]: FacetSectionSelection;
};

export type FacetSectionSelection = {
	selection: string[];
	operator: "ANY" | "ALL";
};

export type FacetSection = {
	title: string;
	name: string;
	children: Facet[];
};

export type Facet = {
	name: string;
	value: string;
	hits: number;
};
