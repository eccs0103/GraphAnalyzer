"use strict";

import { } from "./Modules/Executors.js";
import { } from "./Modules/Extensions.js";
import { } from "./Modules/Generators.js";
import { } from "./Modules/Measures.js";
import { } from "./Modules/Palette.js";
import { } from "./Modules/Storage.js";
import { } from "./Modules/Time.js";

import { } from "./Components/Node.js";
import { } from "./Components/Entity.js";
import { } from "./Components/InterfaceItem.js";
import { } from "./Components/Corporeal.js";
import { } from "./Components/Utilities.js";


//#region Vertice
/**
 * @typedef VerticeNotation
 * @property {VerticeNotation[]} neighbors
 */

class Vertice {
	/**
	 * @param {Vertice} vertice
	 * @returns {boolean}
	 */
	isNeighbor(vertice) {
		return this.#neighbors.includes(vertice);
	}
	/**
	 * @param {Vertice} vertice
	 * @returns {void}
	 */
	#addNeighbor(vertice) {
		if (this.isNeighbor(vertice))
			throw new EvalError(`Failed to add already neighboring ${vertice.name} to ${this.name}`);
		this.#neighbors.push(vertice);
	}
	/**
	 * @param {Vertice} neighbor
	 * @returns {void}
	 */
	#removeNeighbor(neighbor) {
		const index = this.#neighbors.indexOf(neighbor);
		if (index === -1)
			throw new EvalError(`Failed to remove not neighboring ${neighbor.name} from ${this.name}`);
		this.#neighbors.splice(index, 1);
	}
	/**
	 * @param {Vertice} vertice1
	 * @param {Vertice} vertice2
	 * @returns {void}
	 */
	static addConnection(vertice1, vertice2) {
		vertice1.#addNeighbor(vertice2);
		vertice2.#addNeighbor(vertice1);
	}
	/**
	 * @param {Vertice} vertice1
	 * @param {Vertice} vertice2
	 * @returns {void}
	 */
	static removeConnection(vertice1, vertice2) {
		vertice1.#removeNeighbor(vertice2);
		vertice2.#removeNeighbor(vertice1);
	}
	/**
	 * @param {String} name
	 */
	constructor(name) {
		this.#name = name;
	}
	/**@type {String} */
	#name;
	/** @readonly */
	get name() {
		return this.#name;
	}
	/**@type {Vertice[]} */
	#neighbors = [];
	/** @readonly */
	get neighbors() {
		return Object.freeze(this.#neighbors);
	}
	/**
	 * @readonly
	 */
	get degree() {
		return this.#neighbors.length;
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
			const from = Number.import(shell[`from`], `property from`);
			const to = Number.import(shell[`to`], `property to`);
			const verticeFrom = connections[from];
			const verticeTo = connections[to];
			Vertice.addConnection(verticeFrom, verticeTo); // TODO not good
			const result = new Edge(verticeFrom, verticeTo);
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
	/** @readonly */
	get from() {
		return this.#from;
	}
	/** @type {Vertice} */
	#to;
	/** @readonly */
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
			const verticeCount = Number.import(shell[`vertices`], `property vertices`);
			for (let i = 0; i < verticeCount; i++) {
				result.addVertice();
			}
			const edges = Array.import(shell[`connections`], `property connections`).map(
				(item, index) => Edge.import(item, result.vertices, `property connections[${index}]`)
			);
			return result;
		} catch (error) {
			throw new TypeError(
				`Unable to import ${name} due its ${typename(source)} type`,
				{ cause: error }
			);
		}
	}
	/**
	 * @returns {GraphNotation}
	 */
	export() {
		return {
			vertices: this.#vertices.length,
			connections: this.#edges.map(edge => Edge.export())
		};
	}
	/** @type {Vertice[]} */
	#vertices = [];
	/** @readonly */
	get vertices() {
		return Object.freeze(this.#vertices);
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
			throw new RangeError(
				`Vertice index ${index} is out of range [0 - ${this.#vertices.length})`
			);
		const verticeSelected = this.#vertices[index];
		verticeSelected.neighbors.map(
			(neighbor) => Vertice.removeConnection(neighbor, verticeSelected)
		);
		this.#edges = this.#edges.filter(
			(edge) => edge.from !== verticeSelected && edge.to !== verticeSelected
		);
		this.#vertices.splice(index, 1);
	}
	/** @type {Edge[]} */
	#edges = [];
	/** @readonly */
	get edges() {
		return Object.freeze(this.#edges);
	}
	/**
	 * @param {number} from
	 * @param {number} to
	 * @returns {void}
	 */
	addEdge(from, to) {
		if (from > to) {
			const temp = from;
			from = to;
			to = temp;
		}
		if (!Number.isInteger(from) || 0 > from || from >= this.#vertices.length)
			throw new RangeError(
				`Vertice index ${from} is out of range [0 - ${this.#vertices.length})`
			);
		const verticeFrom = this.#vertices[from];
		if (!Number.isInteger(to) || 0 > to || to >= this.#vertices.length)
			throw new RangeError(
				`Vertice index ${to} is out of range [0 - ${this.#vertices.length})`
			);
		const verticeTo = this.#vertices[to];
		if (
			this.#edges.find(
				(edge) => edge.from === verticeFrom && edge.to === verticeTo
			) !== undefined
		)
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
		if (!Number.isInteger(from) || 0 > from || from >= this.#vertices.length)
			throw new RangeError(
				`Vertice index ${from} is out of range [0 - ${this.#vertices.length})`
			);
		const verticeFrom = this.#vertices[from];
		if (!Number.isInteger(to) || 0 > to || to >= this.#vertices.length)
			throw new RangeError(
				`Vertice index ${to} is out of range [0 - ${this.#vertices.length})`
			);
		const verticeTo = this.#vertices[to];
		const indexSelected = this.#edges.findIndex(
			(edge) => edge.from === verticeFrom && edge.to === verticeTo
		);
		if (indexSelected < 0)
			throw new ReferenceError(`Unable to find edge from ${from} to ${to}`);
		Vertice.removeConnection(verticeFrom, verticeTo);
		this.#edges.splice(indexSelected, 1);
	}
}
//#endregion

export { Vertice, Edge, Graph };
