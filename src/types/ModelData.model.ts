export type AllModelData = {
	metadata: ParsedModelMetadata;
	extLinks: ExtLinks;
	molecularData: MolecularData[];
	immuneMarkers: ImmuneMarker[];
	engraftments: Engraftment[];
	cellModelData: CellModelData;
	drugDosing: Treatment[][];
	patientTreatment: Treatment[][];
	qualityData: QualityData[];
	relatedModel: RelatedModel[];
	modelImages: ModelImage[];
	publications: Publication[];
};

export type RelatedModelRoles = "parent of" | "child of";

export type RelatedModel = {
	role: RelatedModelRoles;
	relatedModelId: string;
};

export type ParsedModelMetadata = {
	biostudiesAccessionId: string;
	providerUrl: string;
	histology: string;
	providerName: string;
	cancerSystem: string;
	modelType: string;
	patientSex: string;
	patientAge: string;
	patientEthnicity: string;
	tumourType: string;
	cancerGrade: string;
	cancerStage: string;
	primarySite: string;
	collectionSite: string;
	licenseName: string;
	licenseUrl: string;
	modelId: string;
	providerId: string;
	dateSubmitted: string;
};

type ExternalModelLinkTypes = "external_id" | "supplier";

export type ExternalModelLink = {
	type: ExternalModelLinkTypes;
	resourceLabel: string;
	linkLabel: string;
	link: string;
};

export type ExternalModelLinkByType = Record<
	ExternalModelLinkTypes,
	ExternalModelLink[]
>;

export type ExtLinks = {
	externalModelLinksByType: ExternalModelLinkByType;
};

export type MolecularData = {
	modelId: string;
	dataSource: string;
	sampleId: string;
	sampleType: string;
	engraftedTumourPassage: string;
	dataType: string;
	platformName: string;
	externalDbLinks: ExternalDbLink[];
};

export type ExternalDbLink = {
	column: string;
	resource: string;
	link: string;
};

export type ImmuneMarker = {
	sampleId: string;
	type: string;
	markers: Marker[];
};

type Marker = {
	details: string;
	name: string;
	value: string[];
};

export type Engraftment = {
	passageNumber: string;
	hostStrain: string;
	engraftmentSite: string;
	engraftmentType: string;
	engraftmentSampleType: string;
	engraftmentSampleState: string;
	hostStrainNomenclature: string;
};

export type CellModelData = {
	growthProperties: string;
	growthMedia: string;
	plateCoating: string;
	passageNumber: string;
	contaminated: string;
	contaminationDetails: string;
	supplements: string;
};

export type TreatmentExternalDbLink = {
	link: string;
	resourceLabel: string;
};

export type Treatment = {
	name: string;
	dose: string;
	passageRange?: string;
	response?: string;
	externalDbLinks?: TreatmentExternalDbLink[];
};

export type QualityData = {
	description: string;
	passagesTested: string;
	validationTechnique: string;
	validationHostStrainNomenclature: string;
	morphologicalFeatures: string;
	snpAnalysis: string;
	strAnalysis: string;
	tumourStatus: string;
	modelPurity: string;
	comments: string;
};

export type ModelImage = {
	url: string;
	description: string;
	sampleType: string;
	passage: string;
	magnification: string;
	staining: string;
	isBroken?: boolean;
};

export type Publication = {
	pmid: string;
	doi: {
		id: string;
		url: string;
	};
	pubYear: string;
	title: string;
	authorString: string;
};

export type BioStudiesModelData = {
	accno: string;
	attributes: Attribute[];
	section: Section;
	type: string;
};

export type Attribute = {
	name: string;
	value: string;
	valqual?: Attribute[];
};

export type Section = {
	accno: string;
	type: string;
	attributes: Attribute[];
	subsections: [Subsection[], FileGroup?, RelatedModels?];
};

export type Subsection = {
	accno?: string;
	type: string;
	attributes: Attribute[];
	files?: File[];
};

type FileGroup = {
	files: File[];
};

type File = {
	path: string;
	size: number;
	attributes: Attribute[];
	type: string;
};

export type RelatedModels = {
	type: "Related models";
	links: RelatedModelLink[];
};

type RelatedModelLink = {
	url: string;
	attributes: Attribute[];
};

export type BsImmuneMarkers = {
	subsections: Subsection[][];
};

export type MolecularDataExternalDbLink = {
	column: string;
	resource: string;
	link: string;
};
