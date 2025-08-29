import { FormEvent, useEffect, useRef } from "react";
import Button from "../Button/Button";
import Input from "../Input/Input";
import Label from "../Input/Label";

type Props = {
	defaultValue?: string | undefined;
	inputWidth?: string;
	onSubmit?: (inputValue: string) => void;
};

const SearchBar = ({ defaultValue, inputWidth = "100%", onSubmit }: Props) => {
	const searchRef = useRef<null | HTMLInputElement>(null);
	useEffect(() => {
		if (searchRef.current !== null) {
			searchRef.current.value = defaultValue ?? "";
		}
	}, [defaultValue]);

	const handleOnSubmit = (e: FormEvent) => {
		e.preventDefault();
		onSubmit?.(searchRef?.current?.value ?? "");
	};

	return (
		<form onSubmit={(e) => handleOnSubmit(e)}>
			<div className="d-md-flex align-end col-gap-2">
				<div className="w-100">
					<Label
						label="Search for provider ID, CMO model ID, or histology"
						forId="search-bar"
						name="search-bar"
						className="text-white"
						style={{ width: inputWidth, maxWidth: "100%" }}
					/>
					<Input
						inputRef={searchRef}
						name="search-bar"
						type="search"
						placeholder="Eg. JAX, CRL-2835, Breast Carcinoma"
						defaultValue={defaultValue}
						className="m-0"
						style={{ height: "42px", width: inputWidth, maxWidth: "100%" }} // same size as button
					/>
				</div>
				<Button
					priority="primary"
					color="dark"
					type="submit"
					className="my-2 m-md-0"
				>
					Search
				</Button>
			</div>
		</form>
	);
};

export default SearchBar;
