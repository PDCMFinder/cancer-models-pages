// children: if it has children, it is parent; children of that item
// If adding a page that already existed, check sitemaps so it's not duplicated
const routes = [
	{ path: "/", name: "Home" },
	{ path: "/search", name: "Search" },
	{ path: "/submit", name: "Submit" },
	{ path: "/overview", name: "Overview" },
	{
		path: "/about",
		name: "About"
	},
	{
		name: "More",
		children: [
			{
				path: "/about/providers",
				name: "Data Providers"
			},
			{
				path: "/validation/dictionary",
				name: "Metadata Dictionary"
			},
			{
				path: "https://github.com/PDCMFinder/",
				name: "Open source repositories",
				opensNewTab: true
			}
		]
	}
];

export default routes;
