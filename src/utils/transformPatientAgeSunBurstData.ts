import { ageCategories } from "./collapseEthnicity";
import { capitalizeFirstLetter } from "./dataUtils";

export const transformPatientAgeSunBurstData = (
	data: Record<string, number>
) => {
	const labels: string[] = [];
	const values: number[] = [];
	const parents: string[] = [];
	let parentTotalCount = 0,
		tempChildValues: number[] = [];

	Object.entries(ageCategories).forEach(([category, categoryValues]) => {
		// assuming all of this categories are included in our models (if not, why is it even in the dictionary?)
		labels.push(capitalizeFirstLetter(category.toLowerCase()));
		parents.push("");
		parentTotalCount = 0;
		tempChildValues = [];

		Object.entries(data).forEach(([age, count]) => {
			if (categoryValues.includes(age)) {
				labels.push(age);
				tempChildValues.push(count);
				parents.push(capitalizeFirstLetter(category.toLowerCase()));
				parentTotalCount += count;
			}
		});

		values.push(parentTotalCount);
		values.push(...tempChildValues);
	});

	return { labels, values, parents };
};
