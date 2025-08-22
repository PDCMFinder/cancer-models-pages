import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import projectsAndProviders from "../utils/data/projectsAndProviders.json";

export type ProjectData = {
	project_abbreviation: string;
	project_full_name?: string;
	providers?: ({ data_source: string; provider_name: string } | undefined)[];
	project_description?: string;
	project_settings: {
		main_color: string;
		secondary_color: string;
		logo?: string;
	};
};

export const useActiveProject = () => {
	const router = useRouter();
	const { project: projectFromUrl } = router.query;
	const [activeProject, setActiveProject] =
		useState<string | undefined>(undefined);

	useEffect(() => {
		if (!router.isReady) return;

		const randomProjectIndex = Math.floor(
			Math.random() * projectsAndProviders.length
		);

		if (projectFromUrl) {
			const project = Array.isArray(projectFromUrl)
				? projectFromUrl[0]
				: projectFromUrl;
			setActiveProject(project);
		} else {
			setActiveProject(
				projectsAndProviders[randomProjectIndex].project_abbreviation
			);
		}
	}, [projectFromUrl, router.isReady]);

	// Use useMemo to derive activeProjectData after state is stable
	const activeProjectData = useMemo(() => {
		return projectsAndProviders.find(
			(project) => project.project_abbreviation === activeProject
		) as ProjectData | undefined;
	}, [activeProject]);

	const handleProjectClick = (projectName: string) => {
		if (projectName !== activeProject) {
			setActiveProject(projectName);
			router.replace(
				{
					query: {
						project: projectName
					}
				},
				undefined,
				{ scroll: false }
			);
		}
	};

	const isLoadingProviders =
		activeProject === undefined || activeProjectData === undefined;

	return {
		setActiveProject,
		activeProjectData,
		isLoadingProviders,
		handleProjectClick
	};
};
