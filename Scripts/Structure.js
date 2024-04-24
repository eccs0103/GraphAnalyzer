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
	/**
	 * @param {unknown} source
	 * @returns {Graph}
	 */
	static import(source, name = `source`) {
		try {
			const shell = Object.import(source);
			const result = new Graph();
			const count = Number.import(shell[`vertices`], `property vertices`);
			for (let index = 0; index < count; index++) {
				result.addVertice();
			}
			const edges = Array.import(shell[`connections`], `property connections`);
			for(const item of edges){
				const from = Number.import(shell[`from`], `property from`);
				const to = Number.import(shell[`to`], `property to`);
				result.addEdge(from, to);
			}
			
			return result;
		} catch (error) {
			throw new TypeError(`Unable to import ${name} due its ${typename(source)} type`, { cause: error });
		}
	}
	/** @type {Map<number, GraphVertice>} */
	#vertices = new Map();
	/**
	 * @readonly
	 * @returns {Readonly<Map<number, GraphVertice>>}
	 */
	get vertices() {
		return Object.freeze(this.#vertices);
	}
	/**@type {number} */
	#verticeLast = 0;
	/**
	 * @returns {number}
	 */
	addVertice() {
		this.#vertices.set(++this.#verticeLast, new Graph.Vertice());
		return this.#verticeLast;
	}
	/**
	 * @param {number} index
	 * @returns {void}
	 */
	removeVertice(index) {		
		const verticeSelected = this.#getVertice(index);
		for (const neighbor of verticeSelected.neighbors) {
			Graph.Vertice.disconnect(verticeSelected, neighbor);
		}
		this.#vertices.delete(index);
	}
	/**
	 * @param {number} from
	 * @param {number} to
	 * @returns {void}
	 */
	addEdge(from, to) {
		[from, to] = [from, to].sort((a, b) => a - b);		
		const verticeFrom = this.#getVertice(from);		
		const verticeTo = this.#getVertice(to);
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
		const verticeFrom = this.#getVertice(from);		
		const verticeTo = this.#getVertice(to);
		try {
			Graph.Vertice.disconnect(verticeFrom, verticeTo);
		} catch (error) {
			throw new EvalError(`Connection between ${from} and ${to} doesn't exist`);
		}
	}
	/**
	 * @param {number} index
	 * @returns {GraphVertice}
	 */
	#getVertice(index){
		if (!Number.isInteger(index)) throw new TypeError(`Index ${index} is not finite integer number`);
		if (!this.#vertices.has(index)) throw new RangeError(`Vertice with Index ${index} doesn't exist`);

		return this.#vertices[index];
	}
	/**
	 * @param {GraphVertice} vertice
	 * @returns {number}
	 */
	#getIndex(vertice){
		for(const [key, value] of this.#vertices)
			if (value === vertice)
				return key;

		return -1;
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