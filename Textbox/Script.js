/** @typedef {import("../Scripts/Structure.js").MemoryNotation} MemoryNotation */

"use strict";

import { ArchiveManager } from "../Scripts/Modules/Storage.js";
import { Graph, Memory } from "../Scripts/Structure.js";

/** 
 * @type {ArchiveManager<MemoryNotation, Memory>} 
 */
const managerTextbox = await ArchiveManager.construct(`${navigator.getDataPath()}.Textbox`, Memory);

//#region Definition
const textareaInputField = await window.ensure(() => document.getElement(HTMLTextAreaElement, `textarea#input-field`));
const buttonExecuteProgram = await window.ensure(() => document.getElement(HTMLButtonElement, `button#execute-program`));
//#endregion
//#region Interface
await window.load(Promise.fulfill(() => {
	//#region Input
	textareaInputField.value = managerTextbox.data.valueTextbox;
	textareaInputField.addEventListener(`change`, (event) => {
		managerTextbox.data.valueTextbox = textareaInputField.value;
	});
	//#endregion
	//#region Execution
	buttonExecuteProgram.addEventListener(`click`, async (event) => await window.ensure(async () => {
		const graph = Graph.import(JSON.parse(textareaInputField.value));
		const subgraphs = Graph.DFS.getBiconnectedComponents(graph);
		await window.alertAsync(subgraphs.map(subgraph => JSON.stringify(subgraph.export(), undefined, `    `)).join(`\n\n`));
	}));
	//#endregion
}), 200, 200);
//#endregion
