import fs from "fs/promises";
import path from "path";

const BASE_API_URL = "https://dev.cancermodels.org/api";
const OUTPUT_FILE = path.join(process.cwd(), "public", "sitemap1.xml");
const BASE_URL = "https://mriios.github.io/cancer-models";

function generateSiteMap(modelProviderMixes) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${modelProviderMixes
		.map(
			(mix) => `
  <url>
    <loc>${BASE_URL}/data/models/${mix.data_source}/${mix.external_model_id}</loc>
  </url>`
		)
		.join("")}
</urlset>`;
}

async function main() {
	try {
		const response = await fetch(
			`${BASE_API_URL}/search_index?select=external_model_id,data_source`
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch data: ${response.statusText}`);
		}

		const modelProviderMixes = await response.json();
		const sitemap = generateSiteMap(modelProviderMixes);

		await fs.writeFile(OUTPUT_FILE, sitemap, "utf8");
		console.log("sitemap1.xml generated successfully");
	} catch (error) {
		console.error("Error generating sitemap1.xml:", error);
		process.exit(1);
	}
}

main();
