import { memo } from "react";

type ShowHideBasics = { children: React.ReactNode; windowWidth: number };

interface IShowOver extends ShowHideBasics {
	showOver: number;
	hideOver?: never;
}

interface IHideOver extends ShowHideBasics {
	hideOver: number;
	showOver?: never;
}

type ShowHideProps = IShowOver | IHideOver;

const ShowHide = ({
	windowWidth,
	showOver,
	hideOver,
	children
}: ShowHideProps) => {
	if (
		(hideOver && windowWidth >= hideOver) ||
		(showOver && windowWidth < showOver)
	) {
		return null;
	}

	return <>{children}</>;
};

export default memo(ShowHide);
