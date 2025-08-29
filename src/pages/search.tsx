import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import dynamic from "next/dynamic";
import Head from "next/head";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { NextPage } from "next/types";
import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "react-query";
import { getSearchFacets, getSearchResults } from "../apis/Search.api";
import Button from "../components/Button/Button";
import FloatingButton from "../components/FloatingWidget/FloatingButton";
import Pagination from "../components/Pagination/Pagination";
import SearchBar from "../components/SearchBar/SearchBar";
import SearchFacets from "../components/SearchFilters/SearchFacets";
import SearchResults from "../components/SearchResults/SearchResults";
import SearchResultsLoader from "../components/SearchResults/SearchResultsLoader";
import ShowHide from "../components/ShowHide/ShowHide";
import useWindowDimensions from "../hooks/useWindowDimensions";
import breakPoints from "../utils/breakpoints";
import { searchTourSteps } from "../utils/tourSteps";
import styles from "./search.module.scss";

const Card = dynamic(() => import("../components/Card/Card"), { ssr: false });

const ResultsSummary = (
	totalHits: number,
	page: number,
	resultsPerPage: number
) => {
	if (!totalHits) return null;

	const endIndex = page * resultsPerPage;
	const maxShown = Math.min(totalHits, endIndex);
	const startIndex = (page - 1) * resultsPerPage + 1;

	return `Showing results ${startIndex.toLocaleString()} to
    ${maxShown.toLocaleString()} of ${totalHits.toLocaleString()}
    results`;
};

export type SearchState = {
	page: number;
	selectedFacets: Record<string, string[]>;
	searchQuery: string | null;
};

const resultsPerPage = 10;
const maxModelsToCompare = 4;
const URL_FILTERS_SEPARATOR = " AND ";

const Search: NextPage = () => {
	const { windowWidth = 0 } = useWindowDimensions();
	const bpLarge = breakPoints.large;
	const router = useRouter();
	const urlSearchParams = useSearchParams();
	const urlQuery = urlSearchParams.get("query") ?? "";
	const urlFilters = urlSearchParams.get("filters") ?? "";
	const [showMobileFacets, setShowMobileFacets] = useState(false);
	const [modelsToCompare, setModelsToCompare] = useState<string[]>([]);
	const [driverInstance, setDriverInstance] =
		useState<ReturnType<typeof driver> | null>(null);
	const [searchState, setSearchState] = useState<SearchState>({
		page: 1,
		selectedFacets: {},
		searchQuery: urlQuery ?? ""
	});
	const canCompareModels =
		modelsToCompare.length >= 2 && modelsToCompare.length <= maxModelsToCompare;

	let parsedUrlFilters: Record<string, string[]> = {};
	urlFilters.split(URL_FILTERS_SEPARATOR).forEach((b) => {
		const filterSelection = b?.split(":");
		const filterName = filterSelection[0];
		const filterOptions = filterSelection[1]
			?.split(",")
			.map((option) => option.toLowerCase());

		parsedUrlFilters[`facet.cancermodelsorg.${filterName}`] = filterOptions;
	});

	useEffect(() => {
		const updatedFacets = {
			...(Object.entries(urlFilters).length ? parsedUrlFilters : {})
		};

		setSearchState((prev) => ({
			...prev,
			selectedFacets: {
				...prev.selectedFacets,
				...updatedFacets
			},
			searchQuery: urlQuery
		}));
	}, [urlQuery, urlFilters]);

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
			driverInstance.setSteps(searchTourSteps);
			driverInstance.drive();
		}
	};

	const changePage = (page: number) => {
		setSearchState((prev) => ({ ...prev, page: page }));
		window.scrollTo(0, 370);
	};

	const compareModel = (id: string): void => {
		setModelsToCompare((prev) => {
			if (prev.includes(id)) {
				return prev.filter((model) => model !== id);
			} else {
				return [...prev, id];
			}
		});
	};

	const { data: searchResultsData } = useQuery(
		["search-results", searchState],
		async () =>
			getSearchResults(
				searchState.page,
				searchState.selectedFacets,
				searchState.searchQuery ?? ""
			),
		{
			enabled: searchState.searchQuery !== null
		}
	);
	const { data: facetsData } = useQuery("search-facets", () =>
		getSearchFacets()
	);

	const handleFacetChange = (sectionName: string, facetValue: string) => {
		const newFacetState = { ...searchState.selectedFacets };

		const section = newFacetState[sectionName] || [];
		const isFacetSelected = section.includes(facetValue);

		if (isFacetSelected) {
			newFacetState[sectionName] = section.filter(
				(value) => value !== facetValue
			);
			if (newFacetState[sectionName].length === 0) {
				// delete empty keys (not really needed but lets handle it here)
				delete newFacetState[sectionName];
			}
		} else {
			newFacetState[sectionName] = [...section, facetValue];
		}

		const prefix = "facet.cancermodelsorg.";
		const facetString = Object.entries(newFacetState)
			.map(([key, values]) => `${key.replace(prefix, "")}:${values.join(",")}`)
			.join(URL_FILTERS_SEPARATOR);

		const currentQuery = { ...router.query };
		if (facetString) {
			currentQuery.filters = facetString;
		} else {
			delete currentQuery.filters;
		}

		window.scrollTo(0, 370);
		router.push({ pathname: "/search", query: currentQuery }, undefined, {
			scroll: false,
			shallow: true
		});

		setSearchState((prev) => ({ ...prev, selectedFacets: newFacetState }));
	};

	const handleSearchBarSubmit = (value: string) => {
		if (value === "") {
			router.push({ pathname: "/search" }, undefined, {
				scroll: false,
				shallow: true
			});

			return;
		}
		setSearchState((prev) => ({ ...prev, searchQuery: value }));
		const currentQuery = { ...router.query };
		if (value) {
			currentQuery.query = value;
		} else {
			delete currentQuery.query;
		}

		router.push({ query: currentQuery }, undefined, {
			scroll: false,
			shallow: true
		});
	};

	const compareModels = () => {
		if (modelsToCompare.length > 1) {
			let compareModelsQuery = modelsToCompare.join("+");
			window.open(
				`/cancer-models-pages/compare?models=${compareModelsQuery}`,
				"_blank"
			);

			setModelsToCompare([]);
		}
	};

	const ClearFilterButtonComponent = useMemo(
		() => (
			<Button
				style={{ color: "#b75858" }}
				className="m-0"
				priority="secondary"
				color="dark"
				disabled={Object.keys(searchState.selectedFacets).length === 0}
				onClick={() => {
					setSearchState((prev) => ({ ...prev, selectedFacets: {} }));
					router.push({ pathname: "/search" }, undefined, {
						scroll: false,
						shallow: true
					});
				}}
			>
				Clear
			</Button>
		),
		[searchState.selectedFacets]
	);

	const memoizedSearchFacets = useMemo(
		() => (
			<SearchFacets
				data={facetsData ?? []}
				currentFacetSelection={searchState.selectedFacets}
				onFilterChange={function (
					sectionName: string,
					facetValue: string
				): void {
					handleFacetChange(sectionName, facetValue);
				}}
			/>
		),
		[facetsData, searchState.selectedFacets]
	);

	return (
		<>
			{/* page metadata */}
			<Head>
				<title>
					Explore Patient-Derived Xenograft, Cell and Organoid models
				</title>
				<meta
					name="description"
					content="Discover a diverse catalog of cancer models. Find the perfect PDX, organoid, and cell line models for your research."
				/>
			</Head>
			<header className={`py-5 ${styles.Search_header}`}>
				<div className="container">
					<div className="row">
						<div className="col-12">
							{/* OK to hardcode total models */}
							<h1 className="h2 text-white text-center mt-0">
								Search over 10,342 cancer models
							</h1>
						</div>
					</div>
					<div className="row">
						<div className="col-12 align-end d-md-flex col-gap-2 justify-content-center">
							<SearchBar
								onSubmit={handleSearchBarSubmit}
								defaultValue={urlQuery ?? searchState.searchQuery}
								inputWidth="700px"
							/>
							<Button
								priority="primary"
								color="light"
								className="m-0"
								onClick={() => handleSearchBarSubmit("")}
							>
								See all models
							</Button>
						</div>
					</div>
				</div>
			</header>
			<section>
				<div className="container">
					<div className="row">
						<div className="col-12 col-lg-9 offset-lg-3">
							<div className="row mb-md-3 align-center">
								<div className="col-12 col-md-6">
									<p className="mb-0">
										{ResultsSummary(
											searchResultsData?.totalHits ?? 0,
											searchState.page,
											resultsPerPage
										)}
										&nbsp;
										<br />
										<span className="d-md-none">&nbsp;</span>
										{/* render blank space as a fallback so there's no blink because of height */}
									</p>
								</div>
							</div>
						</div>
					</div>
					<div className="row">
						<div className="col-12 col-lg-3">
							<div className="row align-center mb-1">
								<ShowHide hideOver={bpLarge} windowWidth={windowWidth || 0}>
									{/* mobile filters */}
									<div className="col-6 col-md-8 col-lg-6">
										<Button
											priority="secondary"
											color="dark"
											onClick={() => setShowMobileFacets((prev) => !prev)}
											className="align-center d-flex"
										>
											<>
												Filters
												{Object.keys(searchState.selectedFacets).length !==
													0 && (
													<span
														className={`ml-1 ${styles.Search_filterNotification}`}
													></span>
												)}
											</>
										</Button>
									</div>
								</ShowHide>
								<ShowHide showOver={bpLarge} windowWidth={windowWidth || 0}>
									<div className="col-6 col-md-8 col-lg-6">
										<h2 className="h3 m-0">Filters</h2>
									</div>
									<div className="col-6 col-md-4 col-lg-6 d-flex justify-content-end">
										{ClearFilterButtonComponent}
									</div>
								</ShowHide>
							</div>
							{windowWidth < bpLarge
								? showMobileFacets && memoizedSearchFacets
								: memoizedSearchFacets}
						</div>
						<div className="col-12 col-lg-9">
							{searchResultsData ? (
								searchResultsData.totalHits > 0 ? (
									<>
										<SearchResults
											compareModel={compareModel}
											modelsToCompare={modelsToCompare}
											data={searchResultsData.data}
										/>
										<div className="row">
											<div className="col-12">
												<Pagination
													totalPages={
														searchResultsData?.totalHits !== 0
															? Math.ceil(
																	searchResultsData?.totalHits / resultsPerPage
															  )
															: 1
													}
													currentPage={searchState.page}
													onPageChange={(page: number) => changePage(page)}
												/>
											</div>
										</div>
									</>
								) : (
									<div className="row">
										<div className="col-12 text-center">
											<p>
												There are no results for your search.
												<br />
												Please try again with different filters.
											</p>
											<p>Your search terms:</p>
											<ul className="ul-noStyle">
												{searchState.selectedFacets &&
													Object.entries(searchState.selectedFacets).map(
														([filterName, filterValues]) => (
															<li key={filterName} className="text-capitalize">
																<span className="text-primary-tertiary">•</span>{" "}
																{filterName
																	.split(".")[2]
																	.replaceAll("_", " ")
																	.replace(":", ": ")
																	.replaceAll(",", ", ")}
																: {filterValues.join(", ")}
															</li>
														)
													)}
												{searchState.searchQuery && (
													<li
														key={searchState.searchQuery}
														className="text-capitalize"
													>
														<span className="text-primary-tertiary">•</span>{" "}
														Search term: {searchState.searchQuery}
													</li>
												)}
											</ul>
											{ClearFilterButtonComponent}
										</div>
									</div>
								)
							) : (
								<SearchResultsLoader amount={resultsPerPage} />
							)}
						</div>
					</div>
					{modelsToCompare.length > 0 ? (
						<div className="row position-sticky bottom-0 mt-5">
							<div className="col-10 offset-1">
								<Card
									className="bg-primary-quaternary mb-2"
									contentClassName="py-2"
									id="tour_compareCard"
								>
									{!canCompareModels && (
										<div className="col-12">
											<p className="text-bold">
												* Please add from 2 to 4 models to compare
											</p>
										</div>
									)}
									<div className="d-flex align-center justify-content-between">
										<p className="m-0">
											<b>Compare up to 4 models: </b>
											{modelsToCompare.map((model, idx) => {
												const clearX = (
													<sup>
														<Button
															color="dark"
															priority="secondary"
															className="m-0 ml-1"
															style={{ padding: ".2rem .3rem" }}
															onClick={() =>
																setModelsToCompare((prev) =>
																	prev.filter(
																		(prevModel) => prevModel !== model
																	)
																)
															}
														>
															X
														</Button>
													</sup>
												);

												return (
													<React.Fragment key={model}>
														{idx > 0 && (
															<span className="text-primary-tertiary"> + </span>
														)}
														{model}
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
												onClick={() => compareModels()}
												disabled={!canCompareModels}
											>
												Compare
											</Button>
											<Button
												color="dark"
												priority="secondary"
												className="my-1 ml-1 py-1 bg-transparent"
												onClick={() => setModelsToCompare([])}
											>
												Clear
											</Button>
										</div>
									</div>
								</Card>
							</div>
						</div>
					) : null}
				</div>
			</section>
			<ShowHide showOver={bpLarge} windowWidth={windowWidth || 0}>
				<FloatingButton
					onClick={() => {
						setModelsToCompare([]);
						startTour();
					}}
					priority="secondary"
					color="dark"
				>
					<p className="mb-0 lh-1">Take page tour</p>
				</FloatingButton>
			</ShowHide>
		</>
	);
};

export default Search;
