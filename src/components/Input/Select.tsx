type SelectProps = {
	id: string;
	options: { value?: string; text: string }[];
	className?: string;
	onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
	hjAllow?: boolean;
};

const Select = (props: SelectProps) => {
	let options = props.options,
		id = props.id;

	return (
		<select
			name={id}
			id={id}
			className={props.className}
			onChange={props.onChange}
			data-hj-allow={props.hjAllow}
		>
			{options.map((opt) => {
				let text = opt.text,
					value = opt.value ? opt.value : text;

				return (
					<option key={value} value={value}>
						{text}
					</option>
				);
			})}
		</select>
	);
};

export default Select;
