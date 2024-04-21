"use strict";

import { } from "./Modules/Executors.js";
import { } from "./Modules/Extensions.js";
import { } from "./Modules/Generators.js";
import { } from "./Modules/Measures.js";
import { } from "./Modules/Palette.js";
import { } from "./Modules/Storage.js";
import { } from "./Modules/Time.js";

//#region Vertice
/**
 * @typedef VerticeNotation
 * @property {VerticeNotation[]} neighbors
 */

class Vertice {
	/**
	 * @param {Vertice} vertice1
	 * @param {Vertice} vertice2
	 * @returns {void}
	 */
	static addConnection(vertice1, vertice2) {
		vertice1.#neighbors.add(vertice2);
		vertice2.#neighbors.add(vertice1);
	}
	/**
	 * @param {Vertice} vertice1
	 * @param {Vertice} vertice2
	 * @returns {void}
	 */
	static removeConnection(vertice1, vertice2) {
		vertice1.#neighbors.delete(vertice2);
		vertice2.#neighbors.delete(vertice1);
	}
	/**
	 * @param {string} name
	 */
	constructor(name) {
		this.#name = name;
	}
	/** @type {string} */
	#name;
	/**
	 * @readonly
	 * @returns {string}
	 */
	get name() {
		return this.#name;
	}
	/**
	 * @param {Vertice} vertice
	 * @returns {boolean}
	 */
	isNeighbor(vertice) {
		return this.#neighbors.has(vertice);
	}
	/** @type {Set<Vertice>} */
	#neighbors = new Set();
	/**
	 * @readonly
	 * @returns {Set<Vertice>}
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
}
//#endregion
//#region Edge
/**
 * @typedef EdgeNotation
 * @property {number} from
 * @property {number} to
 */

class Edge {
	/**
	 * @param {unknown} source 
	 * @param {Readonly<Vertice[]>} connections
	 * @returns {Edge}
	 */
	static import(source, connections, name = `source`) {
		try {
			const shell = Object.import(source);
			const from = connections[Number.import(shell[`from`], `property from`)];
			const to = connections[Number.import(shell[`to`], `property to`)];
			/**
			 * @todo Not good
			 */
			Vertice.addConnection(from, to);
			const result = new Edge(from, to);
			return result;
		} catch (error) {
			throw new TypeError(`Unable to import ${(name)} due its ${typename(source)} type`, { cause: error });
		}
	}
	/**
	 * @param {Readonly<Vertice[]>} connections
	 * @returns {EdgeNotation}
	 */
	export(connections) {
		const indexFrom = connections.indexOf(this.#from);
		if (indexFrom < 0) throw new ReferenceError(`Unable to find the index of from`);
		const indexTo = connections.indexOf(this.#to);
		if (indexTo < 0) throw new ReferenceError(`Unable to find the index of to`);
		return {
			from: indexFrom,
			to: indexTo
		};
	}
	/**
	 * @param {Vertice} from 
	 * @param {Vertice} to 
	 */
	constructor(from, to) {
		this.#from = from;
		this.#to = to;
	}
	/** @type {Vertice} */
	#from;
	/**
	 * @readonly
	 * @returns {Vertice}
	 */
	get from() {
		return this.#from;
	}
	/** @type {Vertice} */
	#to;
	/**
	 * @readonly
	 * @returns {Vertice}
	 */
	get to() {
		return this.#to;
	}
}
//#endregion
//#region Graph
/**
 * @typedef GraphNotation
 * @property {number} vertices
 * @property {EdgeNotation[]} connections
 */

class Graph {
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
			const edges = Array.import(shell[`connections`], `property connections`)
				.map((item, index) => Edge.import(item, result.vertices, `property connections[${index}]`));
			result.#edges = edges;
			return result;
		} catch (error) {
			throw new TypeError(`Unable to import ${name} due its ${typename(source)} type`, { cause: error });
		}
	}
	/**
	 * @returns {GraphNotation}
	 */
	export() {
		return {
			vertices: this.#vertices.length,
			connections: this.#edges.map(edge => edge.export(this.#vertices))
		};
	}
	/** @type {Vertice[]} */
	#vertices = [];
	/**
	 * @readonly
	 * @returns {Vertice[]}
	 */
	get vertices() {
		return this.#vertices;
	}
	/**
	 * @returns {Vertice}
	 */
	addVertice() {
		const index = this.#vertices.length;
		const vertice = new Vertice(`v${index}`);
		this.#vertices.push(vertice);
		return vertice;
	}
	/**
	 * @param {number} index
	 * @returns {void}
	 */
	removeVertice(index) {
		if (!Number.isInteger(index) || 0 > index || index >= this.#vertices.length)
			throw new RangeError(`Vertice index ${index} is out of range [0 - ${this.#vertices.length})`);
		const verticeSelected = this.#vertices[index];
		for (const neighbor of verticeSelected.neighbors) {
			Vertice.removeConnection(neighbor, verticeSelected);
		}
		this.#edges = this.#edges.filter((edge) => edge.from !== verticeSelected && edge.to !== verticeSelected);
		this.#vertices.splice(index, 1);
	}
	/** @type {Edge[]} */
	#edges = [];
	/**
	 * @readonly
	 * @returns {Edge[]}
	 */
	get edges() {
		return this.#edges;
	}
	/**
	 * @param {number} from
	 * @param {number} to
	 * @returns {void}
	 */
	addEdge(from, to) {
		[from, to] = [from, to].sort((a, b) => a - b);
		if (!Number.isInteger(from) || 0 > from || from >= this.#vertices.length)
			throw new RangeError(`Vertice index ${from} is out of range [0 - ${this.#vertices.length})`);
		const verticeFrom = this.#vertices[from];
		if (!Number.isInteger(to) || 0 > to || to >= this.#vertices.length)
			throw new RangeError(`Vertice index ${to} is out of range [0 - ${this.#vertices.length})`);
		const verticeTo = this.#vertices[to];
		if (this.#edges.find((edge) => edge.from === verticeFrom && edge.to === verticeTo) !== undefined)
			throw new EvalError(`Edge from ${from} to ${to} already exists`);
		Vertice.addConnection(verticeFrom, verticeTo);
		this.#edges.push(new Edge(verticeFrom, verticeTo));
	}
	/**
	 * @param {number} from
	 * @param {number} to
	 * @returns {void}
	 */
	removeEdge(from, to) {
		[from, to] = [from, to].sort((a, b) => a - b);
		if (!Number.isInteger(from) || 0 > from || from >= this.#vertices.length)
			throw new RangeError(`Vertice index ${from} is out of range [0 - ${this.#vertices.length})`);
		const verticeFrom = this.#vertices[from];
		if (!Number.isInteger(to) || 0 > to || to >= this.#vertices.length)
			throw new RangeError(`Vertice index ${to} is out of range [0 - ${this.#vertices.length})`);
		const verticeTo = this.#vertices[to];
		const indexSelected = this.#edges.findIndex((edge) => edge.from === verticeFrom && edge.to === verticeTo);
		if (indexSelected < 0)
			throw new ReferenceError(`Unable to find edge from ${from} to ${to}`);
		Vertice.removeConnection(verticeFrom, verticeTo);
		this.#edges.splice(indexSelected, 1);
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

export { Vertice, Edge, Graph, Memory };
