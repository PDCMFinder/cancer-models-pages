import type { NextPage } from "next";
import Head from "next/head";
import RegexHighlighter from "../../components/RegexHighlighter/RegexHighlighter";
import metadataDictionaryData from "../../utils/metadataDictionaryData.json";
import styles from "./dictionary.module.scss";

const Dictionary: NextPage = () => {
	return (
		<>
			<Head>
				<title>
					Metadata dictionary with details of the CancerModels.Org data model
				</title>
				<meta
					name="description"
					content="The CancerModels.org Metadata Dictionary expresses the details of the data model, which adheres to specific formats and restrictions to ensure a standard of data quality."
				/>
			</Head>
			<header className="bg-primary-primary text-white mb-5 py-5">
				<div className="container">
					<div className="row py-5">
						<div className="col-12">
							<h1 className="m-0">Metadata Dictionary</h1>
						</div>
					</div>
				</div>
			</header>
			<section>
				<div className="container">
					{metadataDictionaryData.schemas.map((schema) => {
						const TableTitle = (
							<>
								<span className="text-capitalize">
									{schema.name.replace("_", " ")}
								</span>{" "}
								({schema.name})
							</>
						);

						return (
							<div className="row" key={schema.name}>
								<div className="col-12">
									<h2>{TableTitle}</h2>
									<p>{schema.description}</p>
									<div className="overflow-auto showScrollbar-vertical">
										<table className="table-verticalBorder table-align-top text-small">
											<caption>{TableTitle}</caption>
											<thead>
												<tr>
													<th className={styles["Dictionary_fieldDescription"]}>
														Field & Description
													</th>
													<th className={styles["Dictionary_attributes"]}>
														Attributes
													</th>
													<th className={styles["Dictionary_type"]}>Type</th>
													<th
														className={styles["Dictionary_permissibleValues"]}
													>
														Permissible Values
													</th>
													<th className={styles["Dictionary_notes"]}>Notes</th>
												</tr>
											</thead>
											<tbody>
												{schema.fields.map((field) => {
													let PermissibleValue = <></>;
													if (field.restrictions.regex) {
														PermissibleValue = (
															<span>
																Values must meet the regular expression:
																<span className="text-family-secondary">
																	<RegexHighlighter
																		pattern={field.restrictions.regex}
																	/>
																</span>
																Examples:
																<div>
																	<a
																		style={{ wordBreak: "break-all" }}
																		target="_blank"
																		rel={"noreferrer"}
																		href={`http://www.regexplanet.com/advanced/xregexp/index.html?regex=${encodeURIComponent(
																			field.restrictions.regex
																		)}&input=${encodeURIComponent(
																			field.meta.examples
																		)}`}
																	>
																		{field.meta.examples}
																	</a>
																</div>
															</span>
														);
													} else if (field.restrictions.codeList) {
														PermissibleValue = (
															<span>
																Any of the following:
																<ul className="text-medium ul-noStyle mb-0">
																	{field.restrictions.codeList.map((item) => (
																		<li className="m-0" key={field.name + item}>
																			{item}
																		</li>
																	))}
																</ul>
															</span>
														);
													}

													return (
														<tr key={field.name}>
															<td
																className={
																	styles["Dictionary_fieldDescription"]
																}
															>
																<b>{field.name}</b>
																<br />
																{field.description}
															</td>
															<td className={styles["Dictionary_attributes"]}>
																{field.restrictions.required && (
																	<span
																		style={{
																			backgroundColor: "red",
																			borderRadius: "8px",
																			padding: ".2rem .7rem",
																			color: "#FFF"
																		}}
																	>
																		Required
																	</span>
																)}
															</td>
															<td className={styles["Dictionary_type"]}>
																{field.valueType === "string" ? "TEXT" : ""}
															</td>
															<td
																className={
																	styles["Dictionary_permissibleValues"]
																}
															>
																{PermissibleValue}
															</td>
															<td className={styles["Dictionary_notes"]}>
																{field.meta.format}
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</section>
		</>
	);
};

export default Dictionary;
