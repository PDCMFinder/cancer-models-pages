import { ComponentMeta, ComponentStory } from "@storybook/react";
import SearchResult from "./SearchResult";

export default {
	title: "UI/SearchResults/SearchResult",
	component: SearchResult
} as ComponentMeta<typeof SearchResult>;

const Template: ComponentStory<typeof SearchResult> = (args) => (
	<SearchResult {...args} />
);

export const Component = Template.bind({});
Component.args = {
	data: {
		modelId: "model ID",
		providerName: "Cell Model Passports",
		providerId: "CMP",
		histology: "Ovarian Clear Cell Adenocarcinoma",
		primarySite: "ovary",
		collectionSite: "ovary",
		tumourType: "Not Provided",
		dataAvailable: {
			"bio markers": true,
			"model treatment": false,
			"patient treatment": false,
			mutation: true,
			"copy number alteration": true,
			expression: false
		},
		modelType: "cell line",
		patientAge: "40 - 49",
		patientSex: "female"
	},
	addModelToCompare: (e) => alert(e.target.id),
	compareCheck: false
};
