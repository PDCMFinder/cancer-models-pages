import dynamic from "next/dynamic";
import { useQuery } from "react-query";
import { getModelCount } from "../../apis/AggregatedData.api";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import breakPoints from "../../utils/breakpoints";
import { routes } from "../../utils/routes";
import ShowHide from "../ShowHide/ShowHide";
import NavDesktop from "./Navbar-desktop/Navbar-desktop";
import NavMobile from "./Navbar-mobile/Navbar-mobile";

const DynamicModal = dynamic(() => import("../Modal/Modal"), {
	ssr: false
});
const DynamicCard = dynamic(() => import("../Card/Card"), {
	ssr: false
});

// controls responsive change of component
const Navbar = () => {
	const { windowWidth } = useWindowDimensions();
	const bpLarge = breakPoints.large;

	// we're using /info as our way to see if the API is working
	// /info is really light weight aka fast
	const { data: modelCountData, isLoading: isLoadingModelCount } = useQuery(
		"modelCount",
		() => getModelCount(),
		{
			retry: false // we're trying to know as soon as possible
		}
	);

	return (
		<>
			<header>
				<ShowHide showOver={bpLarge} windowWidth={windowWidth || 0}>
					<NavDesktop routes={routes} />
				</ShowHide>
				<ShowHide hideOver={bpLarge} windowWidth={windowWidth || 0}>
					<NavMobile routes={routes} />
				</ShowHide>
			</header>
		</>
	);
};

export default Navbar;
