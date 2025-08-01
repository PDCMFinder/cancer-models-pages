import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import Head from "next/head";
import { NextPage } from "next/types";
import { useEffect, useState } from "react";
import { useQuery } from "react-query";
import { getModelCount } from "../apis/AggregatedData.api";
import { getSearchFacets, getSearchResults } from "../apis/Search.api";
import Card from "../components/Card/Card";
import FloatingButton from "../components/FloatingWidget/FloatingButton";
import InputAndLabel from "../components/Input/InputAndLabel";
import Pagination from "../components/Pagination/Pagination";
import SearchResults from "../components/SearchResults/SearchResults";
import SearchResultsLoader from "../components/SearchResults/SearchResultsLoader";
import ShowHide from "../components/ShowHide/ShowHide";
import useWindowDimensions from "../hooks/useWindowDimensions";
import breakPoints from "../utils/breakpoints";
import { searchTourSteps } from "../utils/tourSteps";
import styles from "./search.module.scss";

const ResultsSummary = (
	totalHits: number,
	currentPage: number,
	resultsPerPage: number
) => {
	if (!totalHits) return null;

	const endIndex = currentPage * resultsPerPage;
	const maxShown = Math.min(totalHits, endIndex);
	const startIndex = (currentPage - 1) * resultsPerPage + 1;

	return `Showing results ${startIndex.toLocaleString()} to
    ${maxShown.toLocaleString()} of ${totalHits.toLocaleString()}
    results`;
};

export type onFilterChangeType = {
	type: "add" | "remove" | "clear" | "toggleOperator" | "init" | "substitute";
};

const resultsPerPage = 10;

const Search: NextPage = () => {
	const { windowWidth = 0 } = useWindowDimensions();
	const bpLarge = breakPoints.large;
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [modelsToCompare, setModelsToCompare] = useState<string[]>([]);

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
			driverInstance.setSteps(searchTourSteps);
			driverInstance.drive();
		}
	};

	const changePage = (page: number) => {
		setCurrentPage(page);
		window.scrollTo(0, 350);
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

	let modelCount = useQuery("modelCount", () => {
		return getModelCount();
	});

	const { data: searchResultsData } = useQuery(
		["search-results", currentPage],
		() => getSearchResults(currentPage)
	);
	const { data: facetsData } = useQuery("search-facets", () =>
		getSearchFacets()
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
							<h1 className="h2 text-white text-center mt-0">
								Search{" "}
								{modelCount && modelCount.data
									? `over ${modelCount.data.toLocaleString()}`
									: ""}{" "}
								cancer models
							</h1>
						</div>
					</div>
					<div className="row">
						<div className="col-12 col-md-10 col-lg-6 offset-md-1 offset-lg-3">
							{/* <SearchBar
								id="searchBar"
								name="searchBar-name"
								isMulti
								onFilterChange={handleFilterChange}
								selection={searchFilterState}
							/> */}
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
											currentPage,
											resultsPerPage
										)}
									</p>
								</div>
							</div>
						</div>
					</div>
					<div className="row">
						<div className="col-12 col-lg-3">
							<div className="row align-center mb-1">
								<ShowHide hideOver={bpLarge} windowWidth={windowWidth || 0}>
									<div className="col-6 col-md-8 col-lg-6">
										{/* <Button
											priority="secondary"
											color="dark"
											onClick={() => setShowFilters(true)}
											className="align-center d-flex"
										>
											<>
												Filters
												{hasFilterSelection && (
													<span
														className={`ml-1 ${styles.Search_filterNotification}`}
													></span>
												)}
											</>
										</Button> */}
									</div>
								</ShowHide>
								<ShowHide showOver={bpLarge} windowWidth={windowWidth || 0}>
									<div className="col-6 col-md-8 col-lg-6">
										<h2 className="h3 m-0">Filters</h2>
									</div>
									<div className="col-6 col-md-4 col-lg-6 d-flex justify-content-end">
										{/* {ClearFilterButtonComponent} */}
									</div>
								</ShowHide>
							</div>
							{/* {windowWidth < bpLarge
								? showFilters && ModalSearchFiltersComponent
								: SearchFiltersComponent} */}

							<Card
								className="bg-lightGray bc-transparent overflow-visible"
								contentClassName="py-3 px-2"
								id="tour_filters"
							>
								{facetsData &&
									facetsData.map((section) => {
										return (
											<div className="w-100" key={section.name}>
												<h3 className="mb-0 p text-bold d-inline-block text-capitalize">
													{section.title}
												</h3>
												<hr />
												<ul className="ul-noStyle m-0 text-capitalize">
													{section.children.map((option) => {
														return (
															<li key={option.name}>
																<InputAndLabel
																	data-hj-allow={true}
																	forId={option.name}
																	id={option.name}
																	name={`${option.name}-name`}
																	type="checkbox"
																	label={option.name}
																	// checked={selection?.includes(option.value)} // no problem passing value since we're checking if it's boolean, if not, pass option as normally. This works for boolean filters
																	// onChange={(
																	// 	e:
																	// 		| ChangeEvent<HTMLInputElement>
																	// 		| ChangeEvent<HTMLTextAreaElement>
																	// ): void => {
																	// 	const target = e.target as HTMLInputElement;
																	// 	const actionType = target.checked
																	// 		? "add"
																	// 		: "remove";

																	// 	props.onFilterChange(
																	// 		option.name,
																	// 		option.value,
																	// 		operator,
																	// 		actionType
																	// 	);
																	// }}
																/>
															</li>
														);
													})}
												</ul>
											</div>
										);
									})}
							</Card>
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
													currentPage={currentPage}
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
											<p>
												Your search terms:
												<br />
												{/* <ul className="ul-noStyle">
                        {selectedFilters.current &&
														selectedFilters.current.map((filter) => (
															<li key={filter} className="text-capitalize">
																<span className="text-primary-tertiary">•</span>{" "}
																{filter
																	.replaceAll("_", " ")
																	.replace(":", ": ")
																	.replaceAll(",", ", ")
																	.replaceAll(" boolean", "")}
															</li>
														))}
                          </ul> */}
											</p>
											{/* {ClearFilterButtonComponent} */}
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
