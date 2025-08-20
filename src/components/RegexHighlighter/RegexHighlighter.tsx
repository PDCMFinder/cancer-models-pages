const highlightRegex = (pattern: string): string => {
	let html = pattern;

	// Escape HTML characters
	html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");

	// Lookaheads / Lookbehinds: (?=...), (?<=...), (?!...), (?<!...)
	html = html.replace(
		/\(\?[<!=][^)]*\)/g,
		(match) => `<span class="regex-lookahead">${match}</span>`
	);

	// Character classes: \w \d \s
	html = html.replace(
		/\\[wds]/g,
		(match) => `<span class="regex-charclass">${match}</span>`
	);

	// Escaped characters (not \w\d\s)
	html = html.replace(
		/\\[^wds]/g,
		(match) => `<span class="regex-escaped">${match}</span>`
	);

	// Quantifiers: {1,2}, +, *, ?
	html = html.replace(
		/{\d+,?\d*}/g,
		(match) => `<span class="regex-quantifier">${match}</span>`
	);
	html = html.replace(
		/[\*\+\?]/g,
		(match) => `<span class="regex-quantifier">${match}</span>`
	);

	// Anchors: ^ and $
	html = html.replace(
		/[\^$]/g,
		(match) => `<span class="regex-anchor">${match}</span>`
	);

	// Grouping/brackets: (), [], {}
	html = html.replace(
		/[\[\]\(\)\{\}]/g,
		(match) => `<span class="regex-grouping">${match}</span>`
	);

	// Alternation: |
	html = html.replace(/\|/g, `<span class="regex-alternation">|</span>`);

	// Keywords like "months", "provided", etc.
	html = html.replace(
		/\b(months|provided|collected|not)\b/gi,
		(match) => `<span class="regex-keyword">${match}</span>`
	);

	return html;
};

const RegexHighlighter = ({ pattern }: { pattern: string }) => {
	const highlightedHTML = highlightRegex(pattern);

	return (
		<pre className="regex-container">
			<code dangerouslySetInnerHTML={{ __html: highlightedHTML }} />
		</pre>
	);
};

export default RegexHighlighter;
