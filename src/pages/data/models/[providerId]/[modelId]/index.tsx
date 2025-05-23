import "driver.js/dist/driver.css";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useQuery } from "react-query";
import { getAllModelData } from "../../../../../apis/ModelDetails.api";
import ModelPage from "../../../../../components/ModelPage/ModelPage";

const DynamicLoader = dynamic(
	() => import("../../../../../components/Loader/Loader"),
	{
		ssr: false
	}
);

const ModelDetails = () => {
	const router = useRouter();
	const modelId = (router.query.modelId ?? "") as string;
	const providerId = (router.query.providerId ?? "") as string;
	const { data, isLoading, isError } = useQuery(
		["model-data", modelId],
		() => getAllModelData(modelId, providerId),
		{ enabled: !!modelId && !!providerId }
	);

	if (isLoading)
		return (
			<div style={{ height: "300px" }} className="w-100">
				<DynamicLoader />
			</div>
		);
	if (isError || !data)
		return <div className="text-center">Sorry, there has been an error</div>;

	return <ModelPage {...data} />;
};

export default ModelDetails;
