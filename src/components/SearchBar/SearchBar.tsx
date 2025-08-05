import { ChangeEvent, Dispatch, SetStateAction, useEffect } from "react";
import useDebounce from "../../hooks/useDebounce";
import Input from "../Input/Input";
import Label from "../Input/Label";

type Props = {
	setSearchQuery?: Dispatch<SetStateAction<string>>;
	onChange?: (
		e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>
	) => void;
};

const SearchBar = ({ setSearchQuery, onChange }: Props) => {
	const [debouncedValue, _, setDebounceValue] = useDebounce("", 500);

	useEffect(() => {
		setSearchQuery && setSearchQuery(debouncedValue);
	}, [debouncedValue]);

	return (
		<>
			<Label
				label="Search for model ID, histology and/or model type"
				forId="search-bar"
				name="search-bar"
				className="text-white"
			/>
			<Input
				name="search-bar"
				type="search"
				placeholder="Eg. CRL-2835, Breast Carcinoma, PDX"
				onChange={(e) => {
					setDebounceValue(e.target.value);
					onChange && onChange(e);
				}}
			/>
		</>
	);
};

export default SearchBar;
