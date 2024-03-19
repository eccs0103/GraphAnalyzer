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

const { min, max } = Math;

//#region Vertice
class Vertice { }
//#endregion
//#region Edge
class Edge {
	/**
	 * @param {string} text 
	 * @returns {[number, number]}
	 */
	static parse(text) {
		const match = /^(\d+)-(\d+)$/.exec(text);
		if (match === null) throw new SyntaxError(`Unable to parse edge from '${(text)}'`);

		const [, vertice1, vertice2] = match.map(part => Number(part));

		return [min(vertice1, vertice2), max(vertice1, vertice2)];
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
class Graph {
	/**
	 * @param {string} text 
	 * @returns {Graph}
	 */
	static parse(text) {
		const match = /^vertices: (d+)\nconnections:?$/.exec(text); // TODO
		if (match === null) throw new SyntaxError(`Unable to parse graph from '${(text)}'`);

		// TODO
		throw new ReferenceError(`Not implemented function`);
	}
	/** @type {Vertice[]} */
	#vertices = [];
	/** @readonly */
	get vertices() {
		return Object.freeze(this.#vertices);
	}
	/**
	 * @returns {void}
	 */
	addVertice() {
		this.#vertices.push(new Vertice());
	}
	/**
	 * @param {number} index 
	 * @returns {void}
	 */
	removeVertice(index) {
		if (!Number.isInteger(index) || 0 > index || index >= this.#vertices.length)
			throw new RangeError(`Vertice index ${index} is out of range [0 - ${this.#vertices.length})`);
		const verticeSelected = this.#vertices[index];
		this.#edges = this.#edges.filter(edge => (edge.from !== verticeSelected && edge.to !== verticeSelected));
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
		if (!Number.isInteger(from) || 0 > from || from >= this.#vertices.length)
			throw new RangeError(`Vertice index ${from} is out of range [0 - ${this.#vertices.length})`);
		const verticeFrom = this.#vertices[from];
		if (!Number.isInteger(to) || 0 > to || to >= this.#vertices.length)
			throw new RangeError(`Vertice index ${to} is out of range [0 - ${this.#vertices.length})`);
		const verticeTo = this.#vertices[to];
		if (this.#edges.find(edge => (edge.from === verticeFrom && edge.to === verticeTo)) !== undefined)
			throw new EvalError(`Edge from ${from} to ${to} already exists`);
		this.#edges.push(new Edge(verticeFrom, verticeTo));
	}
	/**
	 * @param {number} from 
	 * @param {number} to 
	 * @returns {void}
	 */
	removeEdge(from, to) {
		if (!Number.isInteger(from) || 0 > from || from >= this.#vertices.length)
			throw new RangeError(`Vertice index ${from} is out of range [0 - ${this.#vertices.length})`);
		const verticeFrom = this.#vertices[from];
		if (!Number.isInteger(to) || 0 > to || to >= this.#vertices.length)
			throw new RangeError(`Vertice index ${to} is out of range [0 - ${this.#vertices.length})`);
		const verticeTo = this.#vertices[to];
		const indexSelected = this.#edges.findIndex(edge => (edge.from === verticeFrom && edge.to === verticeTo));
		if (indexSelected < 0) throw new ReferenceError(`Unable to find edge from ${from} to ${to}`);
		this.#edges.splice(indexSelected, 1);
	}
}
//#endregion

export { Vertice, Edge, Graph };