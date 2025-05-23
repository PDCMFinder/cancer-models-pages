import fs from "node:fs/promises";
import path from "path";
import { routes } from "../src/utils/routes.js";

const BASE_URL = "https://mriios.github.io/cancer-models";

function generateSiteMap(providers) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
	.map((route) => {
		if (route.children?.length) {
			return route.children
				.map((child) => {
					if (!child.path.includes("http")) {
						return `  <url>
    <loc>${BASE_URL}${child.path}</loc>
  </url>`;
					}
				})
				.join("\n");
		} else if (route.path) {
			return `  <url>
    <loc>${BASE_URL}${route.path}</loc>
  </url>`;
		}
	})
	.join("\n")}
  <url>
    <loc>${BASE_URL}/terms-of-use</loc>
  </url>
  <url>
    <loc>${BASE_URL}/privacy-policy</loc>
  </url>
  ${providers
		.map(
			(provider) => `  <url>
    <loc>${BASE_URL}/about/providers/${provider.replace(/\.md$/, "")}</loc>
  </url>`
		)
		.join("\n")}
</urlset>`;
}

async function main() {
	const providersDir = path.join(process.cwd(), "public/static/providers");
	const providers = await fs.readdir(providersDir);

	const sitemap = generateSiteMap(providers);
	const outputPath = path.join(process.cwd(), "public/sitemap.xml");

	await fs.writeFile(outputPath, sitemap, "utf8");
	console.log("sitemap.xml generated successfully");
}

main().catch((err) => {
	console.error("Error generating sitemap.xml:", err);
	process.exit(1);
});
