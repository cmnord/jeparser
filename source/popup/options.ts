const rangeInputs = [
	...document.querySelectorAll('input[type="range"][name^="color"]'),
] as HTMLInputElement[];
const numberInputs = [
	...document.querySelectorAll('input[type="number"][name^="color"]'),
] as HTMLInputElement[];
const output = document.querySelector(".color-output");

console.log("options.ts running");

function updateColor() {
	if (output) {
		const outputDiv = output as HTMLDivElement;
		outputDiv.style.backgroundColor = `rgb(${rangeInputs[0].value}, ${rangeInputs[1].value}, ${rangeInputs[2].value})`;
	}
}

function updateInputField(event: Event) {
	const target = event.currentTarget as HTMLInputElement;
	if (target) {
		numberInputs[rangeInputs.indexOf(target)].value = target.value;
	}
}

for (const input of rangeInputs) {
	input.addEventListener("input", updateColor);
	input.addEventListener("input", updateInputField);
}

window.addEventListener("load", updateColor);

export {};
