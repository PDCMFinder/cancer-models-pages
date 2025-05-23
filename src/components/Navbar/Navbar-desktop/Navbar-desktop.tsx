import Link from "next/link";
import ReactGA from "react-ga4";
import { NavProps } from "../../../../types/globalTypes";
import { type Route } from "../../../types/Routes";
import { routesWithGAEvents } from "../../../utils/routes";
import ActiveLink from "../../ActiveLink/ActiveLink";
import Button from "../../Button/Button";
import Card from "../../Card/Card";
import Logotype from "../../Logotype/Logotype";
import styles from "./Navbar-desktop.module.scss";

const NavDesktop = (props: NavProps) => {
	return (
		<nav
			className={`container ${styles["Navbar-desktop"]} py-3 bg-white`}
			data-test="navbar-desktop"
		>
			<div className="row align-center justify-content-between">
				<div className="col-3">
					<Link
						href="/"
						className={`${styles["Navbar-desktop_logotype-link"]}`}
						aria-label="CancerModels.Org Logo"
					>
						<Logotype color="dark" />
					</Link>
				</div>
				<div className="col-9 col-xl-7">
					<ul className="ul-noStyle align-center justify-content-between m-0">
						{props.routes.map((route: Route) => {
							let link = null,
								children = route.children,
								path = route.path,
								name = route.name;

							if (path && path !== "#") {
								link = (
									<ActiveLink
										className={`${styles.Navbar_item} link-text-light`}
										activeClassName={styles["Navbar_item_link-active"]}
										href={path}
										opensNewTab={route.opensNewTab}
									>
										{name}
									</ActiveLink>
								);
							} else {
								link = name;
							}

							if (children) {
								let childrenItems = children.map((child) => {
									let childPath = child.path,
										childName = child.name,
										onClickProp;

									const childGAEvent = routesWithGAEvents.find(
										(route) => route.routeName === childName
									);

									if (childGAEvent) {
										onClickProp = () =>
											ReactGA.event(childGAEvent.eventName, {
												category: "event"
											});
									}

									return (
										<li key={childPath}>
											<ActiveLink
												className={`${styles.Navbar_item} link-text-light`}
												activeClassName={styles["Navbar_item_link-active"]}
												href={childPath}
												opensNewTab={child.opensNewTab}
												onClick={onClickProp}
											>
												{child.name}
											</ActiveLink>
										</li>
									);
								});

								return (
									<li
										key={path || name}
										className="dropdownParent"
										data-test="navbar-desktop-dropdownParent"
									>
										<Button
											color="light"
											priority="secondary"
											className="m-0 text-primary-primary"
											arrow
											arrowDirection="down"
										>
											{link}
										</Button>
										<Card
											className="dropdownChildren dropdownChildren-flushRight"
											contentClassName="p-0"
											data-test="navbar-desktop-dropdownChildren"
										>
											<ul className={`${styles.Navbar_dropdown} ul-noStyle`}>
												{childrenItems}
											</ul>
										</Card>
									</li>
								);
							} else {
								return (
									<li key={path} className="mb-0">
										{link}
									</li>
								);
							}
						})}
					</ul>
				</div>
			</div>
		</nav>
	);
};

export default NavDesktop;
