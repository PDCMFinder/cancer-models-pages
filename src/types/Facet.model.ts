export type FacetSidebarSelection = Record<string, string[]>;

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
