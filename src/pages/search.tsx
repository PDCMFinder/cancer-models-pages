import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import Head from "next/head";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { NextPage } from "next/types";
import { useEffect, useMemo, useState } from "react";
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

const Search: NextPage = () => {
	const { windowWidth = 0 } = useWindowDimensions();
	const bpLarge = breakPoints.large;
	const router = useRouter();
	const urlSearchParams = useSearchParams();
	const urlQuery = urlSearchParams.get("query") ?? "";
	const [showMobileFacets, setShowMobileFacets] = useState(false);
	const [modelsToCompare, setModelsToCompare] = useState<string[]>([]);
	const [driverInstance, setDriverInstance] =
		useState<ReturnType<typeof driver> | null>(null);
	const [searchState, setSearchState] = useState<SearchState>({
		page: 1,
		selectedFacets: {},
		searchQuery: urlQuery ?? ""
	});

	// const createQueryString = useCallback(
	// 	(name: string, value: string) => {
	// 		const params = new URLSearchParams(searchParams);
	// 		params.set(name, value);

	// 		return params.toString();
	// 	},
	// 	[searchParams]
	// );
	// pathname + '?' + createQueryString('sort', 'desc')

	useEffect(() => {
		setSearchState((prev) => ({ ...prev, searchQuery: urlQuery }));
	}, [urlQuery]);

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

	// let modelCount = useQuery("modelCount", () => {
	// 	return getModelCount();
	// });

	const { data: searchResultsData } = useQuery(
		[
			"search-results",
			searchState.page,
			searchState.selectedFacets,
			searchState.searchQuery
		],
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
		const newState = structuredClone(searchState.selectedFacets);
		const section = newState[sectionName] ?? [];

		if (section.includes(facetValue)) {
			const updatedSection = section.filter((value) => value !== facetValue);
			if (updatedSection.length > 0) {
				newState[sectionName] = updatedSection;
			} else {
				// delete empty keys (not really needed but lets handle it here)
				delete newState[sectionName];
			}
		} else {
			newState[sectionName] = [...section, facetValue];
		}

		setSearchState((prev) => ({ ...prev, selectedFacets: newState }));
	};

	const handleSearchBarSubmit = (value: string) => {
		setSearchState((prev) => ({ ...prev, searchQuery: value }));
		router.replace({
			pathname: "/search",
			query: { query: value }
		});
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
						<div className="col-12 col-md-10 col-lg-6 offset-md-1 offset-lg-3">
							<SearchBar
								onSubmit={handleSearchBarSubmit}
								defaultValue={urlQuery ?? searchState.searchQuery ?? ""}
							/>
						</div>
					</div>
				</div>
			</header>
			<section>
				<div className="container">
					<div className="row">
						<div className="col-12 col-lg-9 offset-lg-3">
							<div className="row mb-3 align-center">
								<div className="col-12 col-md-6">
									<p className="mb-md-0">
										{ResultsSummary(
											searchResultsData?.totalHits ?? 0,
											searchState.page,
											resultsPerPage
										)}
										&nbsp;
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
											onClick={() => setShowMobileFacets(true)}
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
							{/* {windowWidth < bpLarge
								? showFilters && ModalSearchFiltersComponent
								: SearchFiltersComponent} */}
							{facetsData && memoizedSearchFacets}
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
																	.replaceAll(",", ", ")
																	.replaceAll(" boolean", "")}
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
					{/* {modelsToCompare[0] ? (
						<div className="row position-sticky bottom-0 mt-5">
							<div className="col-10 offset-1">
								<Card
									className="bg-primary-quaternary mb-2"
									contentClassName="py-2"
									id="tour_compareCard"
								>
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
					) : null} */}
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
