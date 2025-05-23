import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import FileSaver from "file-saver";
import JSZip from "jszip";
import dynamic from "next/dynamic";
import Head from "next/head";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import ReactGA from "react-ga4";
import { useQueries, useQuery } from "react-query";
import { ReactFlowProvider } from "reactflow";
import {
	getModelPubmedIds,
	getMolecularData,
	getMolecularDataDownload,
	getPublicationData
} from "../../../src/apis/ModelDetails.api";
import Button from "../../components/Button/Button";
import Card from "../../components/Card/Card";
import FloatingButton from "../../components/FloatingWidget/FloatingButton";
import CloseIcon from "../../components/Icons/CloseIcon/CloseIcon";
import ModelTypeIcon from "../../components/Icons/ModelTypeIcon";
import ImageChecker from "../../components/ImageChecker/ImageChecker";
import InputAndLabel from "../../components/Input/InputAndLabel";
import Loader from "../../components/Loader/Loader";
import ModelIdentifiers from "../../components/ModelIdentifiers/ModelIdentifiers";
import ModelNotAvailable from "../../components/ModelNotAvailable/ModelNotAvailable";
import ModelPurchaseButton from "../../components/ModelPurchaseButton/ModelPurchaseButton";
import MolecularDataTable from "../../components/MolecularDataTable/MolecularDataTable";
import QualityBadge from "../../components/QualityBadge/QualityBadge";
import ShowHide from "../../components/ShowHide/ShowHide";
import Tooltip from "../../components/Tooltip/Tooltip";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import {
	AllModelData,
	ExternalDbLink,
	ModelImage,
	MolecularData,
	Publication
} from "../../types/ModelData.model";
import breakPoints from "../../utils/breakpoints";
import {
	constructCleanMolecularDataFilename,
	constructMolecularDataFilename
} from "../../utils/constructMolecularDataFilename";
import imageIsBrokenChecker from "../../utils/imageIsBrokenChecker";
import { modelTourSteps } from "../../utils/tourSteps";
import styles from "./Model.module.scss";

const DynamicModal = dynamic(() => import("../../components/Modal/Modal"), {
	loading: () => <Loader />
});

const DynamicHierarchyTree = dynamic(
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

type DataFileConfig = { data: MolecularData; filename: string; id: string };
const ModelPage = ({
	metadata,
	extLinks,
	immuneMarkers,
	drugDosing,
	patientTreatment,
	qualityData,
	cellModelData,
	engraftments,
	modelImages,
	knowledgeGraph
}: AllModelData) => {
	const NA_STRING = "N/A",
		MODEL_GENOMICS_STRING = "Model Genomics",
		HLA_TYPE_STRING = "HLA type",
		PDX_STRING = "PDX";
	const isHCMI = metadata.projectName?.toLowerCase() === "hcmi";

	// Client side mol data so we have latest molecular_characterization_id that changes on every etl execution
	const { data: molecularData, isLoading: molecularDataIsLoading } = useQuery(
		["molecular-data", metadata.modelId],
		() => getMolecularData(metadata.modelId)
	);
	const [selectedMolecularViewData, setSelectedMolecularViewData] =
		useState<MolecularData>();
	const [dataToDownload, setDataToDownload] = useState<DataFileConfig[]>([]);
	const [fileDownloadStatus, setFileDownloadStatus] = useState({
		totalFiles: 0,
		downloadedFiles: 0,
		isDownloading: false
	});

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
	// New metadata object without the "score" property to use in metadata file download; take out modelId to rearrange
	const { score: _, modelId: metadataModelId, ...metadataFileData } = metadata;

	const pubmedIdsQuery = useQuery(
		[
			"pubmed-ids-data",
			{ modelId: metadata.modelId, providerId: metadata.providerId }
		],
		() => getModelPubmedIds(metadata.modelId, metadata.providerId)
	);

	const pubmedIds = pubmedIdsQuery.data || [];

	const publicationsQuery = useQueries<Publication[]>(
		pubmedIds.map((p: string) => {
			return {
				queryKey: ["publication-data", p],
				queryFn: () => getPublicationData(p)
			};
		})
	);

	const publications: Publication[] = publicationsQuery
		.map((q) => q.data as Publication)
		.filter((d) => d !== undefined);

	const createMetadataFile = (download: boolean = false) => {
		const filename = `CancerModelsOrg_${metadata.modelId}_metadata.tsv`;

		const firstEngraftmentData = engraftments[0] || {};

		const contentA = {
			modelId: metadataModelId,
			...cellModelData,
			...metadataFileData,
			pdxModelPublications: pubmedIds
		};
		const combinedData = {
			...contentA,
			...(firstEngraftmentData ?? {})
		};
		const columnHeaders = Object.keys(combinedData);

		const contentALength = Object.keys(contentA).length;
		const contentCompensationEmptyCells = Array(contentALength).fill(""); // create empty cells

		let contentB = "";
		for (let i = 1; i < engraftments.length; i++) {
			contentB +=
				"\n" +
				contentCompensationEmptyCells.join("\t") +
				"\t" +
				Object.values(engraftments[i]).join("\t");
		}

		const tsvData =
			columnHeaders.join("\t") +
			"\n" +
			Object.values(combinedData).join("\t") +
			contentB;

		const blob = new Blob([tsvData], { type: "text/tsv" });

		if (download) {
			FileSaver.saveAs(blob, filename);

			ReactGA.event("download_data", {
				category: "event",
				value: 1
			});

			// exit early
			// if we download, it doesn't matter what we return
			return {} as Record<string, any>;
		}

		return { blob, filename };
	};

	const toggleFromDownload = (data: MolecularData) => {
		const id = data.molecularCharacterizationId.toString();
		let filename = constructMolecularDataFilename(
			metadata.modelId,
			data.dataType,
			data.sampleId,
			data.platformName
		);

		if (dataToDownload.some((el) => el.id === id)) {
			setDataToDownload((prev) => prev.filter((el) => el.id !== id));
		} else {
			if (dataToDownload.some((el) => el.filename === filename)) {
				filename = constructMolecularDataFilename(
					metadata.modelId,
					data.dataType,
					data.sampleId,
					data.platformName,
					id
				);
			}
			setDataToDownload((prev) => [
				...prev,
				{
					data,
					filename,
					id
				}
			]);
		}
	};

	const downloadData = async (
		data = {} as MolecularData,
		filename: string = ""
	) => {
		// Create new zip
		let zip = new JSZip();

		// Create metadata file
		const { blob: metadataBlob, filename: metadataFileName } =
			createMetadataFile();
		// Add metadata file to zip
		zip.file(metadataFileName, metadataBlob);

		// Create quality control file
		const { blob: qualityControlBlob, filename: qualityControlFileName } =
			createQualityControlFile();
		// Add quality control file to zip
		zip.file(qualityControlFileName, qualityControlBlob);

		// If we pass some data, that means we just want to download that single data file
		if (data.molecularCharacterizationId) {
			const molecularData = await getMolecularDataDownload(data);

			// Extract headers
			const headers = Object.keys(molecularData[0]);

			// Convert object values to array of arrays
			const values = molecularData.map((obj: { [key: string]: any }) =>
				headers.map((header) => obj[header])
			);

			// Join headers and values using tab characters
			const tsv = [headers.join("\t")]
				.concat(values.map((row: string[]) => row.join("\t")))
				.join("\n");

			zip.file(filename, tsv);

			// Adding 1 for metadata
			ReactGA.event("download_data", {
				category: "event",
				value: 1 + 1
			});
		} else {
			setFileDownloadStatus((prevState) => ({
				...prevState,
				totalFiles: dataToDownload.length,
				isDownloading: true
			}));

			// Create files and add to zip for each data added
			for (const data of dataToDownload) {
				await getMolecularDataDownload(data.data).then((d: MolecularData[]) => {
					if (d.length > 0) {
						// Extract headers
						const headers = Object.keys(d[0]);

						// Convert object values to array of arrays
						const values = d.map(Object.values);

						// Join headers and values using tab characters
						const tsv = [headers.join("\t")]
							.concat(values.map((row: string[]) => row.join("\t")))
							.join("\n");

						// Create file inside zip
						zip.file(data.filename, tsv);

						setFileDownloadStatus((prevState) => ({
							...prevState,
							downloadedFiles: prevState.downloadedFiles + 1
						}));
					}
				});
			}

			// Adding 1 for metadata
			ReactGA.event("download_data", {
				category: "event",
				value: dataToDownload.length + 1
			});
		}

		zip.generateAsync({ type: "blob" }).then(function (content) {
			// Save file to users computer
			FileSaver.saveAs(content, `CancerModelsOrg_${metadata.modelId}-data.zip`);
		});

		setDataToDownload([]);
		setFileDownloadStatus({
			totalFiles: 0,
			downloadedFiles: 0,
			isDownloading: false
		});
	};

	const downloadAllMolecularData = async () => {
		let allDataZip = new JSZip();
		let totalDownloadFiles = 0;

		const { blob: metadataBlob, filename: metadataFileName } =
			createMetadataFile();

		// Add metadata file to zip
		allDataZip.file(metadataFileName, metadataBlob);

		const { blob: qualityControlBlob, filename: qualityControlFileName } =
			createQualityControlFile();

		// Add metadata file to zip
		allDataZip.file(qualityControlFileName, qualityControlBlob);

		for (const data of molecularData ?? []) {
			if (data.dataExists === "TRUE") {
				if (data.dataRestricted === "FALSE") {
					totalDownloadFiles++;
				}
			}
		}

		setFileDownloadStatus((prevState) => ({
			...prevState,
			totalFiles: totalDownloadFiles,
			isDownloading: true
		}));

		for (const data of molecularData ?? []) {
			await getMolecularDataDownload(data).then((d: MolecularData[]) => {
				if (d.length > 0) {
					// Extract headers
					const headers = Object.keys(d[0]);

					// Convert object values to array of arrays
					const values = d.map(Object.values);

					// Join headers and values using tab characters
					const tsv = [headers.join("\t")]
						.concat(values.map((row) => row.join("\t")))
						.join("\n");

					// Create file inside zip
					allDataZip.file(
						`CancerModelsOrg_${metadata.modelId}_${
							data.dataType.split(" ").join("-") ?? ""
						}_${data.sampleId ?? ""}_${
							data.platformName.split(" ").join("-") ?? ""
						}.tsv`,
						tsv
					);

					setFileDownloadStatus((prevState) => ({
						...prevState,
						downloadedFiles: prevState.downloadedFiles + 1
					}));
				}
			});
		}

		allDataZip.generateAsync({ type: "blob" }).then(function (content) {
			// Save file to users computer
			FileSaver.saveAs(content, `CancerModelsOrg_${metadata.modelId}-data.zip`);
		});

		// Adding 1 for metadata
		ReactGA.event("download_data", {
			category: "event",
			value: totalDownloadFiles + 1
		});

		setFileDownloadStatus({
			totalFiles: 0,
			downloadedFiles: 0,
			isDownloading: false
		});
	};

	const createQualityControlFile = () => {
		const filename = `CancerModelsOrg_${metadataModelId}_qualityControl.tsv`;
		const modQualityData = qualityData.map((data) => {
			delete data.modelId;
			delete data.id;

			return {
				modelId: metadataModelId,
				...data
			};
		});

		const headers = Object.keys(modQualityData[0]);

		const values = modQualityData.map((data) => Object.values(data));

		const tsv = [headers.join("\t")]
			.concat(values.map((row) => row.join("\t")))
			.join("\n");

		const blob = new Blob([tsv], { type: "text/tsv" });

		return { blob, filename };
	};

	const downloadAllQualityControlData = async () => {
		let allDataZip = new JSZip();
		let totalDownloadFiles = 1;

		const { blob: metadataBlob, filename: metadataFileName } =
			createMetadataFile();

		allDataZip.file(metadataFileName, metadataBlob);

		const { blob: qualityControlBlob, filename: qualityControlFileName } =
			createQualityControlFile();

		allDataZip.file(qualityControlFileName, qualityControlBlob);

		setFileDownloadStatus((prevState) => ({
			...prevState,
			downloadedFiles: prevState.downloadedFiles + 1
		}));

		allDataZip.generateAsync({ type: "blob" }).then(function (content) {
			// Save file to users computer
			FileSaver.saveAs(content, `CancerModelsOrg_${metadataModelId}-data.zip`);
		});

		// Adding 1 for metadata
		ReactGA.event("download_data", {
			category: "event",
			value: totalDownloadFiles + 1
		});
	};

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
								{metadata.modelType.toLowerCase() !== "other" && (
									<ModelTypeIcon
										modelType={metadata.modelType}
										size="1.5em"
										className="mb-1 mr-4"
										hideOther={true}
										id="tour_model-type"
									/>
								)}
								{metadata.score > 0 && (
									<QualityBadge
										score={metadata.score}
										containerClassName="text-white"
										style={{ width: "10em" }}
										id="tour_model-score"
									/>
								)}
							</div>
							{cellModelData?.modelName && (
								<p className="mt-2 mb-0">
									<b>Aliases:</b> {cellModelData.modelName}
								</p>
							)}
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
							<div className="d-flex flex-column align-end">
								{extLinks.externalModelLinksByType.supplier?.length > 0 &&
									extLinks.externalModelLinksByType.supplier.map(
										(supplier, index) => {
											const isLastSupplier =
												index !==
												extLinks.externalModelLinksByType.supplier.length - 1;

											return (
												<ModelPurchaseButton
													key={supplier.resourceLabel + supplier.linkLabel}
													supplier={supplier}
													isLastSupplier={isLastSupplier}
												/>
											);
										}
									)}
								{!metadata.modelAvailable && (
									<ModelNotAvailable className="mb-2" isPill />
								)}
							</div>
							<p className="mb-1">
								{metadata.modelGenerator ? "Generated by" : "Provided by"}
							</p>
							<h3 className="my-0 mb-3 mb-lg-0 lh-1">
								<Link
									className="text-white text-noDecoration"
									href={`/about/providers/${metadata.providerId.toLowerCase()}`}
								>
									{metadata.providerName}
								</Link>
							</h3>
							<div className="d-flex flex-column d-lg-block mt-1">
								{extLinks.sourceDatabaseUrl && (
									<Link
										className="text-white mr-lg-3"
										href={extLinks.sourceDatabaseUrl}
										target="_blank"
										rel="noopener noreferrer"
										onClick={() =>
											ReactGA.event("provider_view_data", {
												category: "event",
												provider: metadata.providerId
											})
										}
									>
										View data at {metadata.viewDataAt}
									</Link>
								)}
								{extLinks.contactLink && (
									<Link
										color="white"
										href={extLinks.contactLink}
										className="text-white"
										onClick={() =>
											ReactGA.event("provider_contact", {
												category: "event",
												provider: metadata.providerId
											})
										}
									>
										Contact{" "}
										{isHCMI ? "HCMI" : metadata.providerId || "provider"}
									</Link>
								)}
							</div>
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
								<div className="pt-5 sticky top-0">
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
												cellModelData?.id ? (
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
											{!molecularDataIsLoading && molecularData.length ? (
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
											{knowledgeGraph.edges.length > 0 &&
											knowledgeGraph.nodes.length > 0 ? (
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
								<div className="col-12">
									<Button
										color="dark"
										priority="secondary"
										onClick={() => createMetadataFile(true)}
										className="mt-0"
									>
										Download model metadata
									</Button>
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
							{metadata.modelType !== PDX_STRING && cellModelData?.id && (
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
											<Button
												htmlTag="button"
												priority="secondary"
												color="dark"
												onClick={() => downloadAllQualityControlData()}
											>
												Download all
											</Button>
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
								{!molecularDataIsLoading && molecularData.length > 0 && (
									<div className="row mb-5 pt-3">
										<div className="col-12 mb-1">
											<div className="d-flex align-flex-start align-md-center flex-column flex-md-row justify-content-between">
												<h2 className="my-0">Molecular data</h2>
												<div className="d-flex align-center flex-column flex-md-row align-flex-start">
													{!molecularDataIsLoading &&
														molecularData &&
														molecularData.some(
															(data: MolecularData) =>
																data.dataExists === "TRUE" &&
																data.dataRestricted !== "TRUE"
														) && (
															<Button
																priority="secondary"
																color="dark"
																className="ml-md-5"
																onClick={() => downloadAllMolecularData()}
															>
																Download all
															</Button>
														)}
												</div>
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
														{!molecularDataIsLoading &&
															molecularData &&
															molecularData.map((data: MolecularData) => {
																let sampleType: string,
																	rawDataExternalLinks: ExternalDbLink[] = [],
																	dataAvailableContent: JSX.Element;

																switch (data.source) {
																	case "xenograft":
																		sampleType = "Engrafted Tumour";
																		break;
																	case "patient":
																		sampleType = "Patient Tumour";
																		break;
																	default:
																		sampleType = "Tumour Cells";
																}

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

																if (data.dataExists === "TRUE") {
																	if (data.dataRestricted === "TRUE") {
																		dataAvailableContent = (
																			<Link
																				href={extLinks.contactLink || ""}
																				target="_blank"
																				rel="noreferrer noopener"
																				onClick={() =>
																					ReactGA.event(
																						"provider_request_data",
																						{
																							category: "event",
																							provider: metadata.providerId
																						}
																					)
																				}
																			>
																				REQUEST DATA
																			</Link>
																		);
																	} else {
																		dataAvailableContent = (
																			<>
																				<Button
																					htmlTag="button"
																					color="dark"
																					priority="secondary"
																					className="text-left link-text mt-0 mr-3 mr-md-0 mb-md-1 mr-xxx-3 p-0 text-link"
																					onClick={() => {
																						setSelectedMolecularViewData(data);
																						ReactGA.event("view_data", {
																							category: "event"
																						});
																					}}
																				>
																					VIEW DATA
																				</Button>
																				<Button
																					color="dark"
																					priority="secondary"
																					className="text-left link-text mt-0 m-0 mr-3 mr-md-0 mb-md-1 mr-xxx-3 p-0 text-link"
																					onClick={() => {
																						// Handles GA event inside downloadData function
																						downloadData(data);
																					}}
																				>
																					DOWNLOAD DATA
																				</Button>
																				<InputAndLabel
																					label="Add to batch download"
																					name={`add-to-download-${data.molecularCharacterizationId}`}
																					type="checkbox"
																					forId={`add-to-download-id-${data.molecularCharacterizationId}`}
																					checked={dataToDownload.some(
																						(batchData) =>
																							batchData.id ===
																							data.molecularCharacterizationId.toString() // if this changes, update in toggleFromDownload
																					)}
																					onChange={() =>
																						toggleFromDownload(data)
																					}
																					className="text-smaller mt-1"
																				/>
																			</>
																		);
																	}
																} else {
																	dataAvailableContent = (
																		<Tooltip
																			content={
																				<>
																					<p className={`text-small my-0`}>
																						Available on next release
																					</p>
																				</>
																			}
																		>
																			Pending
																		</Tooltip>
																	);
																}

																return (
																	<tr key={data.molecularCharacterizationId}>
																		<td className="white-space-nowrap">
																			{data.sampleId}
																		</td>
																		<td>{sampleType}</td>
																		<td>
																			{data.xenograftPassage || NA_STRING}
																		</td>
																		<td className="text-capitalize">
																			{data.dataType}
																		</td>
																		<td>{dataAvailableContent}</td>
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
																				{/* hack to handle height from name row links */}
																				{/* {treatment.externalDbLinks?.map(
																					(externalDbLink) => {
																						return (
																							<span
																								key={externalDbLink.link}
																								className="text-white"
																								style={{ opacity: 0 }}
																							>
																								.
																							</span>
																						);
																					}
																				)} */}
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
							{knowledgeGraph.edges.length > 0 &&
								knowledgeGraph.nodes.length > 0 && (
									<div id="related-models" className="row mb-5 pt-3">
										<div className="col-12 mb-1">
											<h2 className="mt-0 mb-4">Related models</h2>
											<ReactFlowProvider>
												<DynamicHierarchyTree
													providerId={metadata.providerId}
													modelId={metadata.modelId}
													data={knowledgeGraph}
												/>
											</ReactFlowProvider>
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
														{publication.journalTitle} - {publication.pubYear}
													</p>
													<ul className="ul-noStyle text-small d-md-flex">
														{publication.pmid && (
															<li className="mr-md-3">
																<Link
																	href={`https://europepmc.org/article/MED/${publication.pmid}`}
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
														{publication.doi && (
															<li className="mr-md-3">
																<Link
																	href={`https://doi.org/${publication.doi}`}
																	target="_blank"
																	rel="noreferrer noopener"
																	onClick={() =>
																		ReactGA.event("publication_doi_click", {
																			category: "event"
																		})
																	}
																>
																	DOI:{publication.doi}
																</Link>
															</li>
														)}
														{publication.pmid && (
															<li>
																<Link
																	href={`https://pubmed.ncbi.nlm.nih.gov/${publication.pmid}`}
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

			{/* file floating card */}
			{dataToDownload.length > 0 && !fileDownloadStatus.isDownloading ? (
				<div className="row position-sticky bottom-0 mt-5">
					<div className="col-10 offset-1">
						<Card
							className="bg-primary-quaternary mb-2"
							contentClassName="py-2"
						>
							<div className="d-flex align-center justify-content-between">
								<p className="m-0">
									<b>Download selected data: </b>
									{dataToDownload.map((data, idx) => {
										const cleanFilename = constructCleanMolecularDataFilename(
												metadata.modelId,
												data.data.dataType,
												data.data.sampleId,
												data.data.platformName
											),
											clearX = (
												<sup>
													<Button
														color="dark"
														priority="secondary"
														className="text-underline m-0 ml-1"
														style={{ padding: ".2rem .3rem" }}
														onClick={() =>
															setDataToDownload((prev) =>
																prev.filter((el) => el.id !== data.id)
															)
														}
													>
														X
													</Button>
												</sup>
											);

										return (
											<React.Fragment key={cleanFilename}>
												{" "}
												{idx > 0 && (
													<span className="text-primary-tertiary">+</span>
												)}{" "}
												{cleanFilename}
												{clearX}
											</React.Fragment>
										);
									})}
								</p>
								<div className="d-flex">
									<Button
										color="dark"
										priority="primary"
										className="my-1 py-1"
										onClick={() => downloadData()}
									>
										Download
									</Button>
									<Button
										color="dark"
										priority="secondary"
										className="my-1 ml-1 py-1"
										onClick={() => setDataToDownload([])}
									>
										Clear
									</Button>
								</div>
							</div>
						</Card>
					</div>
				</div>
			) : null}

			{/* file count downloading floating card */}
			{fileDownloadStatus.isDownloading ? (
				<div className="row position-sticky bottom-0 mt-5">
					<div className="col-10 offset-1">
						<Card
							className="bg-primary-quaternary mb-2"
							contentClassName="py-2"
						>
							<div className="d-flex align-center justify-content-between">
								<p className="m-0">
									<b>Fetching files: </b>
									{fileDownloadStatus.downloadedFiles + 1}/
									{fileDownloadStatus.totalFiles}
								</p>
							</div>
						</Card>
					</div>
				</div>
			) : null}
			{/* data modal */}
			{selectedMolecularViewData && (
				<DynamicModal
					verticalAlign="top"
					modalWidth="100"
					handleClose={() => setSelectedMolecularViewData(undefined)}
				>
					<Card
						className="bg-white"
						contentClassName="py-3"
						header={
							<header className="d-flex justify-content-between">
								<h3 className="m-0">
									{selectedMolecularViewData.platformName} data
								</h3>
								<CloseIcon
									color="dark"
									onClick={() => setSelectedMolecularViewData(undefined)}
								/>
							</header>
						}
					>
						<MolecularDataTable
							data={selectedMolecularViewData}
							handleDownload={() => downloadData(selectedMolecularViewData)}
						/>
					</Card>
				</DynamicModal>
			)}
			<ShowHide showOver={bpLarge} windowWidth={windowWidth || 0}>
				<FloatingButton onClick={startTour} priority="secondary" color="dark">
					<p className="mb-0 lh-1">Take page tour</p>
				</FloatingButton>
			</ShowHide>
		</>
	);
};

export default ModelPage;
