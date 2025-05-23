import { expect } from "@jest/globals";
import { screen } from "@testing-library/dom";
import { render } from "@testing-library/react";
import Button from "./Button";

describe.skip("Button UI component", () => {
	it("should render a button with text", () => {
		render(
			<Button color="dark" priority="primary">
				Button text
			</Button>
		);

		const button = screen.getByRole("button");

		expect(button).toBeTruthy();
		expect(button.textContent).toBe("Button text");
	});

	it("should render the component with anchor tag", () => {
		render(
			<Button color="dark" priority="primary" htmlTag="a" href="/">
				Button text
			</Button>
		);

		expect(screen.getByRole("link")).toBeTruthy();
	});

	it("should set external link target to new window", () => {
		render(
			<Button
				color="dark"
				priority="primary"
				htmlTag="a"
				href="https://cancermodels.org"
			>
				Button text
			</Button>
		);

		expect(screen.getByRole("link").getAttribute("target")).toBe("_blank");
	});
});
