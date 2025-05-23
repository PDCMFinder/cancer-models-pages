import nextMdx from "@next/mdx";
import remarkGfm from "remark-gfm";

// img-src 'self' blob: data:;
// default-src 'self';
// added analytic scripts for no CSP blocking
const cspHeader = `
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://static.hotjar.com;
    style-src 'self' 'unsafe-inline';
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
`;

const withMDX = nextMdx({
	extension: /\.mdx?$/,
	options: {
		remarkPlugins: [remarkGfm],
		rehypePlugins: []
	}
});

const nextConfig = {
	basePath: "/cancer-models",
	assetPrefix: "/cancer-models",
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
