import nextMdx from "@next/mdx";
import remarkGfm from "remark-gfm";

const withMDX = nextMdx({
	extension: /\.mdx?$/,
	options: {
		remarkPlugins: [remarkGfm],
		rehypePlugins: []
	}
});

const nextConfig = {
	basePath: "/cancer-models-pages",
	assetPrefix: "/cancer-models-pages",
	reactStrictMode: true,
	pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
	swcMinify: true,
	output: "export",
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**"
			}
		],
		unoptimized: true
	}
};

export default withMDX(nextConfig);
