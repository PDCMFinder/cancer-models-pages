import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import dynamic from "next/dynamic";
import Head from "next/head";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import ReactGA from "react-ga4";
import FloatingButton from "../../components/FloatingWidget/FloatingButton";
import ModelTypeIcon from "../../components/Icons/ModelTypeIcon";
import ImageChecker from "../../components/ImageChecker/ImageChecker";
import Loader from "../../components/Loader/Loader";
import ShowHide from "../../components/ShowHide/ShowHide";
import Tooltip from "../../components/Tooltip/Tooltip";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import {
	AllModelData,
	ExternalDbLink,
	ModelImage,
	MolecularData
} from "../../types/ModelData.model";
import breakPoints from "../../utils/breakpoints";
import imageIsBrokenChecker from "../../utils/imageIsBrokenChecker";
import { modelTourSteps } from "../../utils/tourSteps";
import ModelIdentifiers from "../ModelIdentifiers/ModelIdentifiers";
import styles from "./Model.module.scss";

const HierarchyTree = dynamic(
	() => import("../../components/HierarchyTree/HierarchyTree"),
	{
		loading: () => (
			<div style={{ height: "100px" }}>
				<Loader />
			</div>
		)
	}
);

export type TypesMap = {
	expression_molecular_data: string;
	cna_molecular_data: string;
	mutation_measurement_data: string;
	biomarker_molecular_data: string;
};

const ModelPage = ({
	metadata,
	extLinks,
	molecularData,
	immuneMarkers,
	drugDosing,
	patientTreatment,
	qualityData,
	cellModelData,
	engraftments,
	modelImages,
	relatedModel,
	publications
}: AllModelData) => {
	const NA_STRING = "N/A",
		MODEL_GENOMICS_STRING = "Model Genomics",
		HLA_TYPE_STRING = "HLA type",
		PDX_STRING = "PDX";

	const { windowWidth } = useWindowDimensions();
	const bpLarge = breakPoints.large;
	const metadataDataArr = [
		{ label: "Patient Sex", value: metadata.patientSex },
		{ label: "Patient Age", value: metadata.patientAge },
		{ label: "Patient Ethnicity", value: metadata.patientEthnicity },
		{ label: "Tumour Type", value: metadata.tumourType },
		{ label: "Cancer Grade", value: metadata.cancerGrade },
		{ label: "Cancer Stage", value: metadata.cancerStage },
		{ label: "Primary Site", value: metadata.primarySite },
		{ label: "Collection Site", value: metadata.collectionSite }
	];

	const [validHistologyImages, setValidHistologyImages] = useState<
		ModelImage[]
	>([]);
	const checkImages = async () => {
		const checkedImages = await imageIsBrokenChecker(modelImages);
		setValidHistologyImages(checkedImages);
	};
	useEffect(() => {
		checkImages();
	}, []);

	const [driverInstance, setDriverInstance] =
		useState<ReturnType<typeof driver> | null>(null);

	useEffect(() => {
		const loadDriver = async () => {
			const driverModule = await import("driver.js");
			await import("driver.js/dist/driver.css").then(() => {});
			const driverInstance = driverModule.driver({
				showProgress: true,
				prevBtnText: "← Prev",
				nextBtnText: "Next →",
				doneBtnText: "Done"
			});
			setDriverInstance(driverInstance);
		};
		loadDriver();
	}, []);

	const startTour = () => {
		if (driverInstance) {
			driverInstance.setSteps(modelTourSteps);
			driverInstance.drive();
		}
	};

	const driverObj = driver({
		showProgress: true,
		prevBtnText: "← Prev",
		steps: modelTourSteps,
		onHighlightStarted: (el, step) => {
			if (!el && !driverObj.isLastStep()) {
				if (step.popover) {
					step.popover.description =
						"<b>(Not available for current model)</b> <br/>" +
						step.popover?.description;
				}
			}
		},
		onDestroyed: () => {
			window.scrollTo(0, 0);
		}
	});

	const modelGenomicsImmuneMarkers = immuneMarkers.filter(
		(markerRow) => markerRow.type === MODEL_GENOMICS_STRING
	);
	const hlaImmuneMarkers = immuneMarkers.filter(
		(markerRow) => markerRow.type === HLA_TYPE_STRING
	);

	// Send ploidy to the end of the model genomics markers array
	if (modelGenomicsImmuneMarkers.length > 0) {
		modelGenomicsImmuneMarkers.forEach((genomicMarker) => {
			const index = genomicMarker.markers.findIndex(
				(marker) => marker.name.toLocaleLowerCase() === "ploidy"
			);
			if (index !== -1) {
				const [removed] = modelGenomicsImmuneMarkers[0].markers.splice(
					index,
					1
				);
				modelGenomicsImmuneMarkers[0].markers.push(removed);
			}
		});
	}

	return (
		<>
			{/* page metadata */}
			<Head>
				<title>
					{`CancerModels.Org - ${metadata.modelId} - ${metadata.histology} - ${metadata.modelType}`}
				</title>
			</Head>
			<header className="bg-primary-primary text-white py-5">
				<div className="container">
					<div className="row align-center pb-lg-0 text-capitalize">
						<div className="col-12 col-md-12 col-lg-6">
							{metadata.dateSubmitted && (
								<p className="text-small text-noTransform">
									Date of submission: {metadata.dateSubmitted}
								</p>
							)}
							<h2
								className={`m-0 mb-1 text-family-secondary ${styles.ModelDetails_histology}`}
								id="tour_model-histology"
							>
								{metadata.histology}
							</h2>
							<h1 className="m-0 mb-2" id="tour_model-id">
								{metadata.modelId}
							</h1>
							<div className="d-flex align-items-center">
								<ModelTypeIcon
									modelType={metadata.modelType}
									size="1.5em"
									className="mb-1 mr-4"
									hideOther={true}
									id="tour_model-type"
								/>
							</div>
							{/* {cellModelData?.modelName && (
								<p className="mt-2 mb-0">
									<b>Aliases:</b> {cellModelData.modelName}
								</p>
							)} */}
							{Object.keys(extLinks.externalModelLinksByType).length > 0 && (
								<ModelIdentifiers
									externalModelLinks={extLinks.externalModelLinksByType}
								/>
							)}
						</div>
						<div
							className="col-12 col-md-12 col-lg-6 text-right"
							id="tour_model-providerInfo"
						>
							<h3 className="my-0 mb-3 mb-lg-0 lh-1">
								<Link
									className="text-white text-noDecoration"
									href={`/about/providers/${metadata.providerId.toLowerCase()}`}
								>
									{metadata.providerName}
								</Link>
							</h3>
							{metadata.licenseName && metadata.licenseUrl ? (
								<div className="mt-5">
									<p className="mb-0">
										License:{" "}
										<Link
											className="text-white"
											target="_blank"
											rel="noopener noreferrer"
											href={metadata.licenseUrl}
										>
											{metadata.licenseName}
										</Link>
									</p>
								</div>
							) : null}
						</div>
					</div>
				</div>
			</header>
			<section>
				<div className="container">
					<div className="row">
						<ShowHide showOver={bpLarge} windowWidth={windowWidth || 0}>
							<aside className="col-12 col-lg-2">
								<div className="pt-5 position-sticky top-0">
									<p className="h4">Data available</p>
									<ul className="ul-noStyle">
										<li className="mb-2">
											<Link
												replace
												href="#metadata"
												className="text-primary-primary"
											>
												Patient/Tumour Metadata
											</Link>
										</li>
										<li className="mb-2">
											{metadata.modelType !== PDX_STRING ? (
												cellModelData?.growthProperties ? (
													<Link
														replace
														href="#derivation"
														className="text-primary-primary"
													>
														Model derivation
													</Link>
												) : (
													"Model derivation"
												)
											) : metadata.modelType === PDX_STRING &&
											  engraftments?.length ? (
												<Link
													replace
													href="#engraftments"
													className="text-primary-primary"
												>
													PDX model engraftment
												</Link>
											) : (
												"PDX model engraftment"
											)}
										</li>
										<li className="mb-2">
											{qualityData.length ? (
												<Link
													replace
													href="#quality-control"
													className="text-primary-primary"
												>
													Quality control
												</Link>
											) : (
												"Quality control"
											)}
										</li>
										<li className="mb-2">
											{molecularData.length ? (
												<Link
													replace
													href="#molecular-data"
													className="text-primary-primary"
												>
													Molecular data
												</Link>
											) : (
												"Molecular data"
											)}
										</li>
										<li className="mb-2">
											{immuneMarkers.length ? (
												<Link
													replace
													href="#immune-markers"
													className="text-primary-primary"
												>
													Immune markers
												</Link>
											) : (
												"Immune markers"
											)}
										</li>
										<li className="mb-2">
											{drugDosing.length ? (
												<Link
													replace
													href="#model-treatment"
													className="text-primary-primary"
												>
													Model treatment
												</Link>
											) : (
												"Model treatment"
											)}
										</li>
										<li className="mb-2">
											{patientTreatment.length ? (
												<Link
													replace
													href="#patient-treatment"
													className="text-primary-primary"
												>
													Patient treatment
												</Link>
											) : (
												"Patient treatment"
											)}
										</li>
										<li className="mb-2">
											{relatedModel.length ? (
												<Link
													replace
													href="#related-models"
													className="text-primary-primary"
												>
													Related Models
												</Link>
											) : (
												"Related Models"
											)}
										</li>
										<li className="mb-2">
											{validHistologyImages.length ? (
												<Link
													replace
													href="#histology-images"
													className="text-primary-primary"
												>
													Histology images
												</Link>
											) : (
												"Histology images"
											)}
										</li>
										<li className="mb-2">
											{publications.length ? (
												<Link
													replace
													href="#publications"
													className="text-primary-primary"
												>
													Publications
												</Link>
											) : (
												"Publications"
											)}
										</li>
									</ul>
								</div>
							</aside>
						</ShowHide>
						<div className="col-12 col-lg-10">
							<div id="metadata" className="row mb-3 pt-3">
								<div className="col-12">
									<h2 className="mt-0">Patient / Tumour Metadata</h2>
									<ul className="row ul-noStyle">
										{metadataDataArr.map((data) => {
											data.value =
												typeof data.value === "string"
													? data.value.replace("/", " / ")
													: data.value ?? NA_STRING;

											return (
												<li
													key={data.label}
													className={`mb-2 text-capitalize col-6 col-lg-3 ${styles.ModelDetails_metadata}`}
												>
													<span>{data.label}</span>
													<br />
													{data.value}
												</li>
											);
										})}
									</ul>
								</div>
							</div>
							{metadata.modelType === PDX_STRING &&
								engraftments &&
								engraftments?.length > 0 && (
									<div id="engraftments" className="row mb-5 pt-3">
										<div className="col-12 mb-1">
											<h2 className="mt-0">PDX model engraftment</h2>
											<div className="overflow-auto showScrollbar-vertical">
												<table>
													<caption>PDX model engraftment</caption>
													<thead>
														<tr>
															<th>HOST STRAIN NAME</th>
															<th>SITE</th>
															<th>TYPE</th>
															<th>MATERIAL</th>
															<th>MATERIAL STATUS</th>
															<th>PASSAGE</th>
														</tr>
													</thead>
													<tbody>
														{engraftments?.map((engraftment) => {
															const hostStrainNomenclatures =
																engraftment.hostStrainNomenclature
																	.split(" ")
																	.map((h) => {
																		const regExp = /(.*)<sup>(.*)<\/sup>(.*)/gm,
																			matches = regExp.exec(h) || [],
																			strainPrefix = matches[1] || "",
																			strainSup = matches[2] || "",
																			strainSuffix = matches[3] || "";

																		return {
																			strainPrefix,
																			strainSup,
																			strainSuffix
																		};
																	});

															return (
																<tr key={engraftment.hostStrainNomenclature}>
																	<td className="white-space-nowrap">
																		<Tooltip
																			content={hostStrainNomenclatures.map(
																				({
																					strainPrefix,
																					strainSup,
																					strainSuffix
																				}: {
																					strainPrefix: string;
																					strainSup: string;
																					strainSuffix: string;
																				}) => (
																					<span
																						className="text-small"
																						key={
																							strainPrefix +
																							strainSup +
																							strainSuffix
																						}
																					>
																						{strainPrefix}
																						<sup>{strainSup}</sup>
																						{strainSuffix}{" "}
																					</span>
																				)
																			)}
																		>
																			<span className="text-uppercase">
																				{engraftment.hostStrain}
																			</span>
																		</Tooltip>
																	</td>
																	<td>
																		{engraftment.engraftmentSite ?? NA_STRING}
																	</td>
																	<td>
																		{engraftment.engraftmentType ?? NA_STRING}
																	</td>
																	<td>
																		{engraftment.engraftmentSampleType ??
																			NA_STRING}
																	</td>
																	<td>
																		{engraftment.engraftmentSampleState ??
																			NA_STRING}
																	</td>
																	<td>
																		{engraftment.passageNumber ?? NA_STRING}
																	</td>
																</tr>
															);
														})}
													</tbody>
												</table>
											</div>
										</div>
									</div>
								)}
							{metadata.modelType !== PDX_STRING &&
								cellModelData?.growthProperties && (
									<div id="derivation" className="row mb-5 pt-3">
										<div className="col-12 mb-1">
											<h2 className="mt-0">Model derivation</h2>
											<div className="overflow-auto showScrollbar-vertical">
												<table>
													<caption>Model derivation</caption>
													<thead>
														<tr>
															<th>GROWTH PROPERTIES</th>
															<th>GROWTH MEDIA</th>
															<th>PLATE COATING</th>
															{qualityData.length > 0 &&
																qualityData[0].tumourStatus && <th>STATUS</th>}
															<th>PASSAGE</th>
															<th>SUPPLEMENTS</th>
															<th>CONTAMINATED</th>
															<th>CONTAMINATION DETAILS</th>
														</tr>
													</thead>
													<tbody>
														<tr>
															<td>{cellModelData?.growthProperties}</td>
															<td
																className={
																	(
																		cellModelData?.growthMedia ?? ""
																	).toLowerCase() !== "not provided"
																		? "white-space-nowrap"
																		: undefined
																}
															>
																{cellModelData?.growthMedia}
															</td>
															<td>{cellModelData?.plateCoating}</td>
															{qualityData.length > 0 &&
																qualityData[0].tumourStatus && (
																	<td>{qualityData[0].tumourStatus}</td>
																)}
															<td>{cellModelData?.passageNumber}</td>
															<td
																className={
																	(
																		cellModelData?.growthMedia ?? ""
																	).toLowerCase() !== "not provided"
																		? "white-space-nowrap"
																		: undefined
																}
															>
																{cellModelData?.supplements}
															</td>
															<td>{cellModelData?.contaminated}</td>
															<td>{cellModelData?.contaminationDetails}</td>
														</tr>
													</tbody>
												</table>
											</div>
										</div>
									</div>
								)}
							{qualityData.length > 0 && (
								<div id="quality-control" className="row mb-5 pt-3">
									<div className="col-12 mb-1">
										<div className="d-flex align-flex-start align-md-center flex-column flex-md-row justify-content-between flex-column flex-md-row">
											<h2 className="my-0">Model quality control</h2>
										</div>
										<div className="overflow-auto showScrollbar-vertical">
											{metadata.modelType !== PDX_STRING ? (
												<table>
													<caption>Model quality control</caption>
													<thead>
														<tr>
															<th>TECHNIQUE</th>
															<th>PASSAGE</th>
															<th>MORPHOLOGICAL FEATURES</th>
															<th>STR ANALYSIS</th>
															<th>MODEL PURITY</th>
														</tr>
													</thead>
													<tbody>
														{qualityData.map(
															({
																validationTechnique,
																description,
																passagesTested,
																morphologicalFeatures,
																strAnalysis,
																modelPurity
															}) => (
																<tr key={validationTechnique}>
																	<td>
																		{description !== "Not provided" ? (
																			<Tooltip
																				content={
																					<p className="text-small m-0">
																						{description}
																					</p>
																				}
																			>
																				{validationTechnique}
																			</Tooltip>
																		) : (
																			validationTechnique
																		)}
																	</td>
																	<td>{passagesTested ?? "Not provided"}</td>
																	<td>{morphologicalFeatures}</td>
																	<td>{strAnalysis}</td>
																	<td>{modelPurity}</td>
																</tr>
															)
														)}
													</tbody>
												</table>
											) : (
												<table>
													<caption>Model quality control</caption>
													<thead>
														<tr>
															<th>TECHNIQUE</th>
															<th>DESCRIPTION</th>
															<th>PASSAGE</th>
														</tr>
													</thead>
													<tbody>
														{qualityData.map(
															({
																validationTechnique,
																description,
																passagesTested
															}: {
																validationTechnique: string;
																description: string;
																passagesTested: string;
															}) => (
																<tr key={validationTechnique}>
																	<td>{validationTechnique}</td>
																	<td>{description}</td>
																	<td>{passagesTested ?? "Not provided"}</td>
																</tr>
															)
														)}
													</tbody>
												</table>
											)}
										</div>
									</div>
								</div>
							)}
							<div id="molecular-data">
								{molecularData.length > 0 && (
									<div className="row mb-5 pt-3">
										<div className="col-12 mb-1">
											<div className="d-flex align-flex-start align-md-center flex-column flex-md-row justify-content-between">
												<h2 className="my-0">Molecular data</h2>
											</div>
											<div className="overflow-auto showScrollbar-vertical">
												<table>
													<caption>Molecular data</caption>
													<thead>
														<tr>
															<th>SAMPLE ID</th>
															<th>SAMPLE TYPE</th>
															<th>ENGRAFTED TUMOUR PASSAGE</th>
															<th>DATA TYPE</th>
															<th>DATA AVAILABLE</th>
															<th>PLATFORM USED</th>
															<th>RAW DATA</th>
														</tr>
													</thead>
													<tbody>
														{molecularData &&
															molecularData.map((data: MolecularData) => {
																let rawDataExternalLinks: ExternalDbLink[] = [];

																const hasExternalDbLinks =
																	data.externalDbLinks?.length > 0;
																if (hasExternalDbLinks) {
																	data.externalDbLinks
																		?.filter(
																			(data) => data.column === "raw_data_url"
																		)
																		.forEach((obj) =>
																			rawDataExternalLinks.push(obj)
																		);
																}

																return (
																	<tr
																		key={
																			data.modelId +
																			data.sampleId +
																			data.platformName +
																			data.dataType
																		}
																	>
																		<td className="white-space-nowrap">
																			{data.sampleId}
																		</td>
																		<td>{data.sampleType}</td>
																		<td>{data.engraftedTumourPassage}</td>
																		<td className="text-capitalize">
																			{data.dataType}
																		</td>
																		<td>
																			<Link
																				className="m-0"
																				href={`https://wwwdev.ebi.ac.uk/biostudies/CancerModelsOrg/studies/${metadata.biostudiesAccessionId}`}
																				target="_blank"
																				rel="noopener noreferrer"
																				onClick={() => {
																					ReactGA.event("view_data", {
																						category: "event"
																					});
																				}}
																			>
																				View data at BioStudies
																			</Link>
																		</td>
																		<td>{data.platformName}</td>
																		<td>
																			{hasExternalDbLinks
																				? rawDataExternalLinks?.map(
																						(externalResource) => {
																							if (
																								externalResource.link &&
																								externalResource.resource
																							) {
																								return (
																									<React.Fragment
																										key={
																											externalResource.resource
																										}
																									>
																										<Link
																											href={
																												externalResource.link
																											}
																											target="_blank"
																											rel="noopener noreferrer"
																											onClick={() =>
																												ReactGA.event(
																													"external_db_link_click",
																													{
																														category: "event",
																														provider:
																															externalResource.resource
																													}
																												)
																											}
																										>
																											{
																												externalResource.resource
																											}
																										</Link>
																										<br />
																									</React.Fragment>
																								);
																							}
																						}
																				  )
																				: "Not available"}
																		</td>
																	</tr>
																);
															})}
													</tbody>
												</table>
											</div>
										</div>
									</div>
								)}
							</div>
							{immuneMarkers.length > 0 && (
								<div id="immune-markers" className="row mb-5 pt-3">
									<div className="col-12 mb-1">
										<h2 className="mt-0">Immune markers</h2>
										{modelGenomicsImmuneMarkers.length > 0 ? (
											<div className="overflow-auto showScrollbar-vertical">
												<table>
													<caption>Immune markers</caption>
													<thead>
														<tr>
															<th>SAMPLE ID</th>
															{/* we can go through one marker as they all have same columns */}
															{modelGenomicsImmuneMarkers.length > 0 &&
																modelGenomicsImmuneMarkers[0].markers.map(
																	(marker) => (
																		<th key={marker.name}>{marker.name}</th>
																	)
																)}
														</tr>
													</thead>
													<tbody>
														{modelGenomicsImmuneMarkers.map((markerRow) => (
															<tr key={markerRow.sampleId}>
																<td className="white-space-nowrap">
																	{markerRow.sampleId}
																</td>
																{markerRow.markers.map((marker) => (
																	<td
																		key={marker.name + marker.value}
																		className="white-space-nowrap"
																	>
																		{marker.details ? (
																			<Tooltip
																				content={
																					<p className="text-small m-0">
																						{marker.details}
																					</p>
																				}
																			>
																				{marker.value?.map((value) => (
																					<React.Fragment key={value}>
																						{value}
																						<br />
																					</React.Fragment>
																				))}
																			</Tooltip>
																		) : (
																			marker.value?.map((value) => (
																				<React.Fragment key={value}>
																					{value}
																					<br />
																				</React.Fragment>
																			))
																		)}
																	</td>
																))}
															</tr>
														))}
													</tbody>
												</table>
											</div>
										) : null}
										{hlaImmuneMarkers.length > 0 ? (
											<div className="overflow-auto showScrollbar-vertical">
												<h3>HLA</h3>
												<table>
													<caption>HLA</caption>
													<thead>
														<tr>
															<th>SAMPLE ID</th>
															{hlaImmuneMarkers.length > 0 &&
																hlaImmuneMarkers[0].markers.map((marker) => (
																	<th key={marker.name}>{marker.name}</th>
																))}
														</tr>
													</thead>
													<tbody>
														{hlaImmuneMarkers.map((markerRow) => (
															<tr key={markerRow.sampleId}>
																<td className="white-space-nowrap">
																	{markerRow.sampleId}
																</td>
																{markerRow.markers.map((marker) => (
																	<td
																		key={marker.name + marker.value}
																		className="white-space-nowrap"
																	>
																		{marker.details ? (
																			<Tooltip content={marker.details}>
																				<span>
																					{marker.value?.map((value) => (
																						<React.Fragment key={value}>
																							{value}
																							<br />
																						</React.Fragment>
																					))}
																				</span>
																			</Tooltip>
																		) : (
																			marker.value?.map((value) => (
																				<React.Fragment key={value}>
																					{value}
																					<br />
																				</React.Fragment>
																			))
																		)}
																	</td>
																))}
															</tr>
														))}
													</tbody>
												</table>
											</div>
										) : null}
									</div>
								</div>
							)}
							{drugDosing.length > 0 && (
								<div id="model-treatment" className="row mb-5 pt-3">
									<div className="col-12 mb-1">
										<h2 className="mt-0">Model treatment</h2>
										<div className="overflow-auto showScrollbar-vertical">
											<table>
												<caption>Model treatment</caption>
												<thead>
													<tr>
														<th>DRUG</th>
														<th>DOSE</th>
														<th>PASSAGE</th>
														<th>RESPONSE</th>
													</tr>
												</thead>
												<tbody>
													{drugDosing.map((doses) => {
														return (
															<tr
																key={
																	doses[0].name +
																	doses[0].dose +
																	doses[0].response
																}
															>
																<td className="white-space-unset">
																	{doses.map((dose, idx) => {
																		return (
																			<div
																				key={
																					dose.response + dose.name + dose.dose
																				}
																				className={idx !== 0 ? "mt-1" : ""}
																			>
																				{dose.name}
																				<br />
																				{dose.externalDbLinks?.map(
																					(externalDbLink) => {
																						if (
																							externalDbLink.link &&
																							externalDbLink.resourceLabel
																						) {
																							return (
																								<Link
																									key={externalDbLink.link}
																									href={externalDbLink.link}
																									className="mr-1"
																									target="_blank"
																									rel="noopener"
																									onClick={() =>
																										ReactGA.event(
																											"external_db_link_click",
																											{
																												category: "event",
																												provider:
																													externalDbLink.resourceLabel
																											}
																										)
																									}
																								>
																									{externalDbLink.resourceLabel}
																								</Link>
																							);
																						}
																						return null;
																					}
																				)}
																			</div>
																		);
																	})}
																</td>
																<td className="text-capitalize">
																	{doses.map((dose, idx) => {
																		return (
																			<div
																				key={
																					dose.response + dose.name + dose.dose
																				}
																				className={idx !== 0 ? "mt-1" : ""}
																				style={{
																					marginBottom: dose.externalDbLinks
																						? "2em"
																						: 0
																				}}
																			>
																				{dose.dose}
																				<br />
																			</div>
																		);
																	})}
																</td>
																<td>
																	{doses.map((dose, idx) => {
																		return (
																			<div
																				key={
																					dose.response + dose.name + dose.dose
																				}
																				className={idx !== 0 ? "mt-1" : ""}
																				style={{
																					marginBottom: dose.externalDbLinks
																						? "2em"
																						: 0
																				}}
																			>
																				{dose.passageRange}
																				<br />
																			</div>
																		);
																	})}
																</td>
																<td>
																	{doses.map((dose, idx) => {
																		return (
																			<div
																				key={
																					dose.response + dose.name + dose.dose
																				}
																				className={idx !== 0 ? "mt-1" : ""}
																				style={{
																					marginBottom: dose.externalDbLinks
																						? "2em"
																						: 0
																				}}
																			>
																				{dose.response}
																				<br />
																			</div>
																		);
																	})}
																</td>
															</tr>
														);
													})}
												</tbody>
											</table>
										</div>
									</div>
								</div>
							)}
							{patientTreatment.length > 0 && (
								<div id="patient-treatment" className="row mb-5 pt-3">
									<div className="col-12 mb-1">
										<h2 className="mt-0">Patient treatment</h2>
										<div className="overflow-auto showScrollbar-vertical">
											<table className="table-align-top">
												<caption>Patient treatment</caption>
												<thead>
													<tr>
														<th>TREATMENT</th>
														<th>DOSE</th>
														<th>RESPONSE</th>
													</tr>
												</thead>
												<tbody>
													{patientTreatment.map((treatments) => {
														return (
															<tr key={treatments[0].name}>
																<td className="white-space-unset">
																	{treatments.map((treatment, idx) => {
																		return (
																			<div
																				key={
																					treatment.response +
																					treatment.name +
																					treatment.dose
																				}
																				className={idx !== 0 ? "mt-1" : ""}
																			>
																				{treatment.name}
																				<br />
																				{treatment.externalDbLinks?.map(
																					(externalDbLink) => {
																						if (
																							externalDbLink.link &&
																							externalDbLink.resourceLabel
																						) {
																							return (
																								<Link
																									key={externalDbLink.link}
																									href={externalDbLink.link}
																									className="mr-1"
																									target="_blank"
																									rel="noopener"
																									onClick={() =>
																										ReactGA.event(
																											"external_db_link_click",
																											{
																												category: "event",
																												provider:
																													externalDbLink.resourceLabel
																											}
																										)
																									}
																								>
																									{externalDbLink.resourceLabel}
																								</Link>
																							);
																						}
																					}
																				)}
																			</div>
																		);
																	})}
																</td>
																<td className="text-capitalize">
																	{treatments.map((treatment, idx) => {
																		return (
																			<div
																				key={
																					treatment.response +
																					treatment.name +
																					treatment.dose
																				}
																				className={idx !== 0 ? "mt-1" : ""}
																				style={{
																					marginBottom:
																						treatment.externalDbLinks
																							? "2em"
																							: 0
																				}}
																			>
																				{treatment.dose}
																				<br />
																			</div>
																		);
																	})}
																</td>
																<td>
																	{treatments.map((treatment, idx) => {
																		return (
																			<div
																				key={
																					treatment.response +
																					treatment.name +
																					treatment.dose
																				}
																				className={idx !== 0 ? "mt-1" : ""}
																				style={{
																					marginBottom:
																						treatment.externalDbLinks
																							? "2em"
																							: 0
																				}}
																			>
																				{treatment.response}
																				<br />
																			</div>
																		);
																	})}
																</td>
															</tr>
														);
													})}
												</tbody>
											</table>
										</div>
									</div>
								</div>
							)}
							{relatedModel.length > 0 && (
								<div id="related-models" className="row mb-5 pt-3">
									<div className="col-12 mb-1">
										<h2 className="mt-0 mb-4">Related models</h2>
										<HierarchyTree
											modelId={metadata.modelId}
											providerId={metadata.providerId}
											data={relatedModel}
										/>
									</div>
								</div>
							)}
							{validHistologyImages.length > 0 && (
								<div id="histology-images" className="row mb-5 pt-3">
									<div className="col-12 mb-1">
										<h2 className="mt-0">Histology images</h2>
									</div>
									<div className="col-12">
										<div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-gap-3">
											{validHistologyImages.map(({ url, description }) => (
												<ImageChecker src={url} key={url}>
													<div className="col">
														<div className="ar-16-9 overflow-hidden mb-1">
															<Link
																href={url}
																target="_blank"
																rel="noopener"
																onClick={() =>
																	ReactGA.event("histologyImg_click", {
																		category: "event"
																	})
																}
															>
																<img
																	src={url}
																	alt={description}
																	width={500}
																	height={300}
																	className="mb-1 h-auto w-100 object-fit-cover"
																/>
															</Link>
														</div>
														<p className="text-small mb-0">{description}</p>
													</div>
												</ImageChecker>
											))}
										</div>
									</div>
								</div>
							)}
							{publications.length > 0 && (
								<div id="publications" className="row mb-5 pt-3">
									<div className="col-12">
										<h2 className="mt-0">Publications</h2>
										{publications?.map((publication, idx) => {
											const needsSeparator =
												publications.length > 1 &&
												idx !== publications.length - 1;

											return (
												<div key={publication.pmid}>
													{publication.title && (
														<h3>
															{publication.title.replace(/<[^>]+>/g, " ")}
														</h3>
													)}
													<p className="text-muted text-small">
														{publication.authorString}
													</p>
													<p className="mb-3 text-small">
														{publication.pubYear}
													</p>
													<ul className="ul-noStyle text-small d-md-flex">
														{publication.pmid && (
															<li className="mr-md-3">
																<Link
																	href={publication.pmid}
																	target="_blank"
																	rel="noreferrer noopener"
																	onClick={() =>
																		ReactGA.event(
																			"publication_europepmc_click",
																			{
																				category: "event"
																			}
																		)
																	}
																>
																	View at EuropePMC
																</Link>
															</li>
														)}
														{publication.doi.id && (
															<li className="mr-md-3">
																<Link
																	href={publication.doi.url}
																	target="_blank"
																	rel="noreferrer noopener"
																	onClick={() =>
																		ReactGA.event("publication_doi_click", {
																			category: "event"
																		})
																	}
																>
																	DOI:{publication.doi?.id}
																</Link>
															</li>
														)}
														{publication.pmid && (
															<li>
																<Link
																	href={publication.pmid}
																	target="_blank"
																	rel="noreferrer noopener"
																	onClick={() =>
																		ReactGA.event("publication_pubmed_click", {
																			category: "event"
																		})
																	}
																>
																	PubMed
																</Link>
															</li>
														)}
													</ul>
													{needsSeparator && (
														<hr style={{ backgroundColor: "#d2d2d2" }} />
													)}
												</div>
											);
										})}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</section>
			<ShowHide showOver={bpLarge} windowWidth={windowWidth || 0}>
				<FloatingButton onClick={startTour} priority="secondary" color="dark">
					<p className="mb-0 lh-1">Take page tour</p>
				</FloatingButton>
			</ShowHide>
		</>
	);
};

export default ModelPage;
