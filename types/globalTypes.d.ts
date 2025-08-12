import { CSSProperties } from "react";
import { type Route } from "../src/types/Routes";

type CamelCase<S extends string> =
	S extends `${infer P1}_${infer P2}${infer P3}`
		? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
		: Lowercase<S>;

type CamelCaseKeys<T> = T extends Array<infer U>
	? Array<CamelCaseKeys<U>>
	: T extends object
	? {
			[K in keyof T as CamelCase<string & K>]: CamelCaseKeys<T[K]>;
	  }
	: T;

type CSSUnit =
	| "em"
	| "rem"
	| "px"
	| "vh"
	| "vw"
	| "vmin"
	| "vmax"
	| "pt"
	| "cm"
	| "mm"
	| "in"
	| "pc"
	| "ch"
	| "ex"
	| "fr"
	| "%"
	| "s"
	| "ms";

export type CSSSize = `${number}${CSSUnit}`;

const inputTypes = [
	"button",
	"checkbox",
	"color",
	"date",
	"datetime-local",
	"email",
	"file",
	"hidden",
	"image",
	"month",
	"number",
	"password",
	"radio",
	"range",
	"reset",
	"search",
	"submit",
	"tel",
	"text",
	"time",
	"url",
	"week"
] as const;

export type NavProps = { routes: Route[] };

export type LabelProps = {
	label: string;
	forId: string;
	name: string;
	className?: string;
	style?: CSSProperties;
};

export type InputProps = {
  style: CSSProperties;
	name: string;
	id?: string;
	type: typeof inputTypes[number] | "textarea";
	placeholder?: string;
	className?: string;
	value?: string;
	onChange?: (
		e:
			| React.ChangeEvent<HTMLInputElement>
			| React.ChangeEvent<HTMLTextAreaElement>
	) => void;
	inputRef?: MutableRefObject<undefined>;
	required?: boolean;
	checked?: boolean;
	defaultChecked?: boolean;
  defaultValue?: string | number | undefined;
};

export type TabProps = {
	props: {
		label: string;
		content: any;
	};
};

export type SearchFiltersProps = {
	filterData: {
		facet_section: string;
		facet_filters: {
			facet_name: string;
			facet_column: string;
			facet_options: string[];
			facet_example?: string;
		}[];
	}[];
};
