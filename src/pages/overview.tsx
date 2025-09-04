import { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "react-query";
import { getLatestDataReleaseInformation } from "../apis/AggregatedData.api";
import { getSearchFacets } from "../apis/Search.api";
import Button from "../components/Button/Button";
import Card from "../components/Card/Card";
import BarChart from "../components/Charts/BarChart";
import {
	datasetCountColors,
	patientAgeColors,
	tumourTypeColors
} from "../components/Charts/colors";
import PieChart from "../components/Charts/PieChart";
import RadialChart from "../components/Charts/RadialChart";
import SunBurstChart from "../components/Charts/SunBurstChart";
import findMultipleByKeyValues from "../utils/findMultipleByKeyValues";
import { transformPatientAgeSunBurstData } from "../utils/transformPatientAgeSunBurstData";

const Overview: NextPage = () => {
	const [chartData, setChartData] = useState<
		Record<string, Record<string, number>>
	>({});

	const { data: searchFacetsData } = useQuery("searchFacets", getSearchFacets);

	useEffect(() => {
		if (!searchFacetsData) return;

		const facets = [
			{
				outputKey: "modelType",
				facetName: "facet.cancermodelsorg.model_type"
			},
			{
				outputKey: "datasetAvailable",
				facetName: "facet.cancermodelsorg.dataset_available"
			},
			{
				outputKey: "patientSex",
				facetName: "facet.cancermodelsorg.patient_sex"
			},
			{
				outputKey: "tumourType",
				facetName: "facet.cancermodelsorg.tumour_type"
			},
			{
				outputKey: "patientEthnicity",
				facetName: "facet.cancermodelsorg.patient_ethnicity_group"
			},
			{
				outputKey: "patientAge",
				facetName: "facet.cancermodelsorg.patient_age"
			},
			{
				outputKey: "cancerSystem",
				facetName: "facet.cancermodelsorg.cancer_system"
			}
		] as const;

		const criteria = facets.map((f) => ({
			key: "name",
			value: f.facetName
		}));

		const selectedData = findMultipleByKeyValues(searchFacetsData, criteria);

		type FacetNode = { value: string; hits: number };
		const toCountMap = (nodes: FacetNode[] = []) => {
			const counts: Record<string, number> = {};

			nodes.forEach((node) => {
				counts[node.value] = node.hits;
			});

			return Object.fromEntries(
				Object.entries(counts).sort(([, a], [, b]) => b - a)
			);
		};

		const nextChartData = facets.reduce<Record<string, Record<string, number>>>(
			(acc, f) => {
				const children: FacetNode[] =
					selectedData[`name:${f.facetName}`]?.[0]?.children ?? [];

				acc[f.outputKey] = toCountMap(children);

				return acc;
			},
			{}
		);

		setChartData(nextChartData);
	}, [searchFacetsData]);
	const { data: dataReleaseData, isLoading: isDataLoading } = useQuery(
		"dataReleaseData",
		getLatestDataReleaseInformation
	);

	const totalModelCount = useMemo(() => {
		if (chartData.modelType) {
			return Object.values(chartData.modelType).reduce(
				(sum, value) => sum + value,
				0
			);
		}
	}, [chartData]);

	return (
		<>
			{/* page metadata */}
			<Head>
				<title>Comprehensive Overview of Patient-Derived Cancer Models</title>
				<meta
					name="description"
					content="Gain insights of PDX, organoid, and cell line models data on our portal."
				/>
				<meta
					name="keywords"
					content="Patient-derived cancer models, overview, research insights"
				/>
			</Head>
			<header className="bg-primary-primary text-white mb-5 py-5">
				<div className="container">
					<div className="row py-5">
						<div className="col-12 col-lg-8">
							<h1 className="m-0">
								Find the right PDX, organoid or cell line patient-derived cancer
								model for your next project.
							</h1>
						</div>
					</div>
				</div>
			</header>
			<section>
				<div className="container">
					<div className="row">
						<div className="col-12">
							<h2>Current data release</h2>
							<ul>
								{dataReleaseData && !isDataLoading ? (
									<li>Data release version: {dataReleaseData.tag_name}</li>
								) : null}
								{dataReleaseData && !isDataLoading ? (
									<li>Date of publication: {dataReleaseData?.released_at}</li>
								) : null}
								{totalModelCount ? (
									<li>
										Number of models:{" "}
										{totalModelCount?.toLocaleString() ??
											10342?.toLocaleString()}
									</li>
								) : null}
								<li>
									{/* from when we released github pages, hard to get from BioStudies api */}
									Number of providers: {56}
								</li>
							</ul>
							<Link href="/about/releases">Release log</Link>
						</div>
					</div>
				</div>
			</section>
			<section>
				<div className="container">
					<div className="row mb-5">
						{chartData.modelType && (
							<div className="col-md-6 col-lg-4 mb-4">
								<Card className="py-0 px-5 h-100">
									<PieChart
										title="Models by model type"
										data={chartData.modelType}
										dataEndPoint="model_type"
									/>
								</Card>
							</div>
						)}
						{chartData.cancerSystem && (
							<div className="col-md-6 col-lg-4 mb-4">
								<Card className="py-0 px-5 h-100">
									<PieChart
										title="Models by cancer system"
										data={chartData.cancerSystem}
										dataEndPoint="cancer_system"
										holeRadius={100}
									/>
								</Card>
							</div>
						)}
						{chartData.tumourType && (
							<div className="col-md-6 col-lg-4 mb-4">
								<Card className="py-0 px-5 h-100">
									<PieChart
										title="Models by tumour type"
										data={chartData.tumourType}
										dataEndPoint="tumour_type"
										colors={tumourTypeColors}
									/>
								</Card>
							</div>
						)}
						{chartData.patientEthnicity && (
							<div className="col-md-12 col-lg-8 mb-4">
								<Card className="py-0 px-2 h-100">
									<BarChart
										title="Models by patient ethnicity"
										x={Object.keys(chartData.patientEthnicity)}
										y={Object.values(chartData.patientEthnicity)}
										dataEndPoint="patient_ethnicity"
									/>
								</Card>
							</div>
						)}
						{chartData.patientAge && (
							<div className="col-md-6 col-lg-4 mb-4">
								<Card className="py-0 px-5 h-100">
									<SunBurstChart
										title="Models by patient age"
										values={
											transformPatientAgeSunBurstData(chartData.patientAge)
												.values
										}
										labels={
											transformPatientAgeSunBurstData(chartData.patientAge)
												.labels
										}
										parents={
											transformPatientAgeSunBurstData(chartData.patientAge)
												.parents
										}
										dataEndPoint="patient_age"
										colors={patientAgeColors}
									/>
								</Card>
							</div>
						)}
						{chartData.patientSex && (
							<div className="col-md-6 col-lg-4 mb-4">
								<Card className="py-0 px-5 h-100">
									<PieChart
										title="Models by patient sex"
										data={chartData.patientSex}
										dataEndPoint="patient_sex"
									/>
								</Card>
							</div>
						)}
						{chartData.datasetAvailable && (
							<div className="col-md-6 col-lg-4 mb-4">
								<Card className="py-0 px-5 h-100">
									<RadialChart
										title="Models by available data"
										data={chartData.datasetAvailable}
										dataEndPoint="dataset_available"
										colors={datasetCountColors}
										totalModelCount={totalModelCount ?? 0}
									/>
								</Card>
							</div>
						)}
					</div>
					<div className="row">
						<div className="col-12 text-center">
							<Button
								href="/submit"
								priority="primary"
								color="dark"
								className="mb-1 mr-md-3"
								htmlTag="a"
							>
								Submit model data
							</Button>
							<Button
								href="/search"
								priority="secondary"
								color="dark"
								className="mt-1 ml-md-3"
								htmlTag="a"
							>
								Search all model data
							</Button>
						</div>
					</div>
				</div>
			</section>
		</>
	);
};

export default Overview;
