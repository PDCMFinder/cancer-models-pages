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
  dataAvailable: {
    "copy number alteration": boolean;
    "expression": boolean;
    "bio markers": boolean;
    "mutation": boolean;
    "model treatment": boolean;
    "patient treatment": boolean;
  }
};