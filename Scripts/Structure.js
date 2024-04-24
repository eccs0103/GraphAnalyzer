"use strict";

import { } from "./Modules/Executors.js";
import { } from "./Modules/Extensions.js";
import { } from "./Modules/Generators.js";
import { } from "./Modules/Measures.js";
import { } from "./Modules/Palette.js";
import { } from "./Modules/Storage.js";
import { } from "./Modules/Time.js";

//#region Graph
/**
* @typedef EdgeNotation	
* @property {number} from
* @property {number} to
*/
/**
 * @typedef GraphNotation
 * @property {number[]} vertices
 * @property {EdgeNotation[]} connections
 */
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
			const verticeIndices = Array.import(shell[`vertices`], `property vertices`);
			for (const index of verticeIndices) {
				result.addVertice(index);
			}
			const edges = Array.import(shell[`connections`], `property connections`);
			for (const item of edges) {
				const from = Number.import(item[`from`], `property from`);
				const to = Number.import(item[`to`], `property to`);
				result.addEdge(from, to);
			}
			return result;
		} catch (error) {
			throw new TypeError(`Unable to import ${name} due its ${typename(source)} type`, { cause: error });
		}
	}
	/**
	 * @todo DFS for connections
	 * @returns {GraphNotation}
	 */
	export() {
		return {
			vertices: [],
			connections: []
		};
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
	/**
	 * @readonly
	 * @returns {Set<number>}
	 */
	get verticeIndices(){
		return new Set(this.#vertices.keys());
	}
	/**
	 * @param {number} index
	 * @returns {void}
	 */
	addVertice(index) {
		if (this.verticeIndices.has(index)) throw new EvalError(`Vertice of index ${index} already exists`);
		this.#vertices.set(index, new Graph.Vertice());
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
	#getVertice(index) {
		if (!Number.isInteger(index)) throw new TypeError(`Index ${index} is not finite integer number`);
		if (!this.#vertices.has(index)) throw new RangeError(`Vertice with Index ${index} doesn't exist`);

		return this.#vertices[index];
	}
	/**
	 * @param {GraphVertice} vertice
	 * @returns {number}
	 */
	#getIndex(vertice) {
		for (const [key, value] of this.#vertices)
			if (value === vertice)
				return key;

		//is this ok?
		return -1;
	}
}
//#endregion

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