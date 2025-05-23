const fs = require("fs");
const path = require("path");

const BASE_URL = "https://mriios.github.io/cancer-models";

function generateSitemapIndex() {
	return `<?xml version="1.0" encoding="UTF-8"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
      <url><loc>${BASE_URL}/sitemap.xml</loc></url>
    </sitemap>
    <sitemap>
      <url><loc>${BASE_URL}/sitemap1.xml</loc></url>
    </sitemap>
  </sitemapindex>`;
}

const sitemapIndex = generateSitemapIndex();

const outputPath = path.join(__dirname, "..", "public", "sitemap_index.xml");
fs.writeFileSync(outputPath, sitemapIndex, "utf8");
console.log("sitemap_index.xml generated successfully");
