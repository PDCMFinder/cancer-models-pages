export type ValidDataAvailableKeys =
  | "copy number alteration"
  | "expression"
  | "bio markers"
  | "mutation"
  | "model treatment"
  | "patient treatment";

export type SearchResult = {
  collectionSite: string;
  histology: string;
  modelId: string;
  modelType: string;
  patientAge: string;
  patientSex: string;
  primarySite: string;
  providerName: string;
  providerId: string;
  tumourType: string;
  dataAvailable: Record<ValidDataAvailableKeys, boolean>;
};
