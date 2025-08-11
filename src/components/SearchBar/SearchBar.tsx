import { FormEvent, useEffect, useRef } from "react";
import Button from "../Button/Button";
import Input from "../Input/Input";
import Label from "../Input/Label";

type Props = {
	defaultValue?: string | undefined;
	onSubmit?: (inputValue: string) => void;
};

const SearchBar = ({ defaultValue, onSubmit }: Props) => {
	const searchRef = useRef<null | HTMLInputElement>(null);
	useEffect(() => {
		if (searchRef.current !== null) {
			searchRef.current.value = defaultValue ?? "";
		}
	}, [defaultValue]);

	const handleOnSubmit = (e: FormEvent) => {
		e.preventDefault();
		onSubmit && onSubmit(searchRef?.current?.value ?? "");
	};

	return (
		<form onSubmit={(e) => handleOnSubmit(e)}>
			<div className="d-flex align-center">
				<div>
					<Label
						label="Search for model ID, histology and/or model type"
						forId="search-bar"
						name="search-bar"
						className="text-white"
					/>
					<Input
						inputRef={searchRef}
						name="search-bar"
						type="search"
						placeholder="Eg. CRL-2835, Breast Carcinoma, PDX"
						required
						defaultValue={defaultValue}
					/>
				</div>
				<Button priority="primary" color="dark" type="submit">
					Search
				</Button>
			</div>
		</form>
	);
};

export default SearchBar;
