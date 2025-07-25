import Link from "next/link";
import { ChangeEvent } from "react";
import useWindowDimensions from "../../../hooks/useWindowDimensions";
import { SearchResult as SearchResultType } from "../../../types/Search.model";
import breakPoints from "../../../utils/breakpoints";
import Card from "../../Card/Card";
import InputAndLabel from "../../Input/InputAndLabel";
import ShowHide from "../../ShowHide/ShowHide";
import styles from "./SearchResult.module.scss";

const dataTypes = [
	{
		key: "copy number alteration",
		name: "CNA",
		sectionLink: "molecular-data"
	},
	{
		key: "expression",
		name: "Expression",
		sectionLink: "molecular-data"
	},
	{
		key: "bio markers",
		name: "Bio Markers",
		sectionLink: "molecular-data"
	},
	{
		key: "mutation",
		name: "Gene Mutation",
		sectionLink: "molecular-data"
	},
	{
		key: "model treatment",
		name: "Model Treatment",
		sectionLink: "model-treatment"
	},
	{
		key: "patient treatment",
		name: "Patient Treatment",
		sectionLink: "patient-treatment"
	}
];

type SearchResultProps = {
	className?: string;
	data: SearchResultType;
	addModelToCompare: (
		e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>
	) => void;
	compareCheck: boolean;
};

const SearchResult = (props: SearchResultProps) => {
	const { windowWidth = 0 } = useWindowDimensions();
	const bpLarge = breakPoints.large;
	const {
		providerName,
		providerId,
		histology,
		primarySite,
		collectionSite,
		tumourType,
		modelType,
		modelId,
		patientAge,
		patientSex,
		dataAvailable
	} = props.data;

	const metadata = [
		{ name: "Model Type", data: modelType },
		{ name: "Tumor Type", data: tumourType },
		{ name: "Primary Site", data: primarySite },
		{ name: "Collection Site", data: collectionSite },
		{ name: "Patient Sex", data: patientSex },
		{ name: "Patient Age", data: patientAge }
	];

	const modelLink = `/data/models/${providerId}/${modelId}`;

	return (
		<Card className={styles.SearchResult} id="tour_searchResult">
			<div className="row">
				<div className="col-12 col-md-6 col-lg-4 d-lg-flex flex-column justify-content-between">
					<div>
						<h2 className="h3 m-0">
							<Link href={modelLink}>{modelId}</Link>
						</h2>
						<p className="text-capitalize mb-0">
							<Link
								href={`/about/providers/${providerId}`}
								title={providerName}
							>
								{`${providerName?.substring(0, 50)}${
									providerName?.length > 50 ? "..." : ""
								}`}
							</Link>
						</p>
					</div>
					<p>{histology}</p>
				</div>
				<div className="col-12 col-md-6 col-lg-4 mt-3 mt-md-0">
					<div className={`row ${styles.SearchResult_metadata}`}>
						{metadata.map((data) => {
							data.data =
								typeof data.data === "string"
									? data.data.replace("/", " / ")
									: data.data ?? "NA";

							return (
								<div className="col-6" key={data.name}>
									<p className="text-capitalize">
										<span>{data.name}</span>
										<br />
										{data.data}
									</p>
								</div>
							);
						})}
					</div>
				</div>
				<div className="col-12 col-md-12 col-lg-4 mt-3 mt-lg-0 d-flex flex-column">
					<p
						className={`text-center ${styles.SearchResult_availableData_title}`}
					>
						Available data
					</p>
					<div className={`row ${styles.dataAvailable_grid}`}>
						{dataTypes.map((dt) => {
							const key = dt.key,
								sectionLink = dt.sectionLink,
								hasData = dataAvailable[key],
								name = dt.name;

							return (
								<div key={key} className="col-6 h-fit">
									<p className={`mb-0 ${!hasData ? "text-muted" : ""}`.trim()}>
										{hasData ? (
											<Link
												href={`${modelLink}#${
													sectionLink ? sectionLink : key.replace(" ", "-")
												}`}
											>
												{name}
											</Link>
										) : (
											name
										)}
									</p>
								</div>
							);
						})}
						<ShowHide showOver={bpLarge} windowWidth={windowWidth}>
							<InputAndLabel
								forId={modelId}
								id={modelId}
								name={`${modelId}-name`}
								type="checkbox"
								label="Add to compare"
								className="text-smaller mt-2"
								onChange={props.addModelToCompare}
								checked={props.compareCheck}
							/>
						</ShowHide>
					</div>
				</div>
			</div>
		</Card>
	);
};

export default SearchResult;
