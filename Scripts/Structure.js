"use strict";

import { } from "./Modules/Executors.js";
import { } from "./Modules/Extensions.js";
import { } from "./Modules/Generators.js";
import { } from "./Modules/Measures.js";
import { } from "./Modules/Palette.js";
import { } from "./Modules/Storage.js";
import { } from "./Modules/Time.js";

//#region Graph
class Graph {
	//#region Vertice
	/**
	 * @typedef {InstanceType<Graph.Vertice>} GraphVertice
	 */
	static Vertice = class GraphVertice {
		/**
		 * @param {GraphVertice} vertice1 
		 * @param {GraphVertice} vertice2 
		 * @returns {void}
		 */
		static connect(vertice1, vertice2) {
			if (vertice1.#neighbors.has(vertice2) || vertice2.#neighbors.has(vertice1)) throw new EvalError(`Connection already exists`);
			vertice1.#neighbors.add(vertice2);
			vertice2.#neighbors.add(vertice1);
		}
		/**
		 * @param {GraphVertice} vertice1 
		 * @param {GraphVertice} vertice2 
		 * @returns {void}
		 */
		static disconnect(vertice1, vertice2) {
			if (!vertice1.#neighbors.has(vertice2) || !vertice2.#neighbors.has(vertice1)) throw new EvalError(`Connection doesn't exists`);
			vertice1.#neighbors.delete(vertice2);
			vertice2.#neighbors.delete(vertice1);
		}
		/** @type {Set<GraphVertice>} */
		#neighbors = new Set();
		/**
		 * @readonly
		 * @returns {Set<GraphVertice>}
		 */
		get neighbors() {
			return this.#neighbors;
		}
		/**
		 * @readonly
		 * @returns {number}
		 */
		get degree() {
			return this.#neighbors.size;
		}
		/**
		 * @param {GraphVertice} vertice 
		 * @returns {boolean}
		 */
		isNeighbor(vertice) {
			return this.#neighbors.has(vertice);
		}
	};
	//#endregion

	/** @type {Map<number, GraphVertice>} */
	#vertices = new Map();
	/**
	 * @readonly
	 * @returns {Readonly<Map<number, GraphVertice>>}
	 */
	get vertices() {
		return Object.freeze(this.#vertices);
	}
	/**
	 * @returns {number}
	 */
	addVertice() {
		return (this.#vertices.push(new Graph.Vertice()) - 1);
	}
	/**
	 * @param {number} index
	 * @returns {void}
	 */
	removeVertice(index) {
		if (!Number.isInteger(index)) throw new TypeError(`Index ${index} is not finite integer number`);
		if (0 > index || index >= this.#vertices.length) throw new RangeError(`Index ${index} is out of range [0 - ${this.#vertices.length})`);
		const verticeSelected = this.#vertices[index];
		for (const neighbor of verticeSelected.neighbors) {
			Graph.Vertice.disconnect(verticeSelected, neighbor);
		}
		this.#vertices.splice(index, 1);
	}
	/**
	 * @param {number} from
	 * @param {number} to
	 * @returns {void}
	 */
	addEdge(from, to) {
		[from, to] = [from, to].sort((a, b) => a - b);
		if (!Number.isInteger(from)) throw new TypeError(`Index ${from} is not finite integer number`);
		if (0 > from || from >= this.#vertices.length) throw new RangeError(`Index ${from} is out of range [0 - ${this.#vertices.length})`);
		const verticeFrom = this.#vertices[from];
		if (!Number.isInteger(to)) throw new TypeError(`Index ${to} is not finite integer number`);
		if (0 > to || to >= this.#vertices.length) throw new RangeError(`Index ${to} is out of range [0 - ${this.#vertices.length})`);
		const verticeTo = this.#vertices[to];
		try {
			Graph.Vertice.connect(verticeFrom, verticeTo);
		} catch (error) {
			throw new EvalError(`Connection between ${from} and ${to} already exists`);
		}
	}
	/**
	 * @param {number} from
	 * @param {number} to
	 * @returns {void}
	 */
	removeEdge(from, to) {
		[from, to] = [from, to].sort((a, b) => a - b);
		if (!Number.isInteger(from)) throw new TypeError(`Index ${from} is not finite integer number`);
		if (0 > from || from >= this.#vertices.length) throw new RangeError(`Index ${from} is out of range [0 - ${this.#vertices.length})`);
		const verticeFrom = this.#vertices[from];
		if (!Number.isInteger(to)) throw new TypeError(`Index ${to} is not finite integer number`);
		if (0 > to || to >= this.#vertices.length) throw new RangeError(`Index ${to} is out of range [0 - ${this.#vertices.length})`);
		const verticeTo = this.#vertices[to];
		try {
			Graph.Vertice.disconnect(verticeFrom, verticeTo);
		} catch (error) {
			throw new EvalError(`Connection between ${from} and ${to} doesn't exists`);
		}
	}
}
//#endregion

const unnamed = {
	vertices: 15,
	connections: [
		{ from: 1, to: 2 },
		{ from: 4, to: 6 },
		{ from: 8, to: 12 }
	]
};
const graph = Graph.import(unnamed);
console.log(graph);

//#region Memory
/**
 * @typedef MemoryNotation
 * @property {string} valueTextbox
 */

class Memory {
	/**
	 * @param {unknown} source 
	 * @returns {Memory}
	 */
	static import(source, name = `source`) {
		try {
			const shell = Object.import(source);
			const valueTextbox = String.import(shell[`valueTextbox`], `property valueTextbox`);
			const result = new Memory();
			result.#valueTextbox = valueTextbox;
			return result;
		} catch (error) {
			throw new TypeError(`Unable to import ${(name)} due its ${typename(source)} type`, { cause: error });
		}
	}
	/**
	 * @returns {MemoryNotation}
	 */
	export() {
		return {
			valueTextbox: this.#valueTextbox
		};
	}
	/** @type {string} */
	#valueTextbox = `{\n\t"vertices": 15,\n\t"connections": [\n\t\t{\n\t\t\t"from": 1,\n\t\t\t"to": 2\n\t\t},\n\t\t{\n\t\t\t"from": 4,\n\t\t\t"to": 6\n\t\t},\n\t\t{\n\t\t\t"from": 8,\n\t\t\t"to": 12\n\t\t}\n\t]\n}`;
	/**
	 * @returns {string}
	 */
	get valueTextbox() {
		return this.#valueTextbox;
	}
	/**
	 * @param {string} value 
	 * @returns {void}
	 */
	set valueTextbox(value) {
		this.#valueTextbox = value;
	}
}
//#endregion

export { Graph, Memory };