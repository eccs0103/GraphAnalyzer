/** @typedef {import("../Scripts/Structure.js").MemoryNotation} MemoryNotation */

"use strict";

import { ArchiveManager } from "../Scripts/Modules/Storage.js";
import { Graph, Memory } from "../Scripts/Structure.js";

try {
	//#region Initializing
	/** @type {ArchiveManager<MemoryNotation, Memory>} */
	const managerTextbox = await ArchiveManager.construct(`${navigator.getDataPath()}.Textbox`, Memory);
	//#endregion
	//#region Definition
	const textareaInputField = document.getElement(HTMLTextAreaElement, `textarea#input-field`);
	const buttonExecuteProgram = document.getElement(HTMLButtonElement, `button#execute-program`);
	//#endregion
	//#region Input
	textareaInputField.value = managerTextbox.data.valueTextbox;
	textareaInputField.addEventListener(`change`, (event) => {
		managerTextbox.data.valueTextbox = textareaInputField.value;
	});
	//#endregion
	//#region Execution
	buttonExecuteProgram.addEventListener(`click`, async (event) => {
		const graph = Graph.import(JSON.parse(textareaInputField.value));
		/**
		 * @todo Graph calculating function
		 */
	});
	//#endregion
} catch (error) {
	await window.stabilize(Error.generate(error));
}
