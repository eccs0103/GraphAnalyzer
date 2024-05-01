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
	//#region Vertex
	/**
	 * @typedef {InstanceType<Graph.Vertex>} GraphVertex
	 */
	static Vertex = class GraphVertex {
		/**
		 * @param {GraphVertex} vertex1 
		 * @param {GraphVertex} vertex2 
		 * @returns {void}
		 */
		static connect(vertex1, vertex2) {
			if (vertex1.#neighbors.has(vertex2) || vertex2.#neighbors.has(vertex1)) throw new EvalError(`Connection already exists`);
			vertex1.#neighbors.add(vertex2);
			vertex2.#neighbors.add(vertex1);
		}
		/**
		 * @param {GraphVertex} vertex1 
		 * @param {GraphVertex} vertex2 
		 * @returns {void}
		 */
		static disconnect(vertex1, vertex2) {
			if (!vertex1.#neighbors.has(vertex2) || !vertex2.#neighbors.has(vertex1)) throw new EvalError(`Connection doesn't exists`);
			vertex1.#neighbors.delete(vertex2);
			vertex2.#neighbors.delete(vertex1);
		}
		/** @type {Set<GraphVertex>} */
		#neighbors = new Set();
		/**
		 * @readonly
		 * @returns {Set<GraphVertex>}
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
		 * @param {GraphVertex} vertex 
		 * @returns {boolean}
		 */
		isNeighbor(vertex) {
			return this.#neighbors.has(vertex);
		}
	};
	//#endregion

	//#region DFS
	/**
	 * @typedef {InstanceType<Graph.DFS>} GraphDFS
	 */
	static DFS = class GraphDFS {
		/** @type {Graph} */
		#graph;
		/**
		 * @param {Graph} graph
		 */
		constructor(graph) {
			this.#graph = graph;
		}
		/** 
		 * @returns {void}
		 */
		traverse() {
			if (this.#graph.vertices.size === 0) return;
			while (true) {
				const unvisitedVertices = this.#getUnvisitedVertices();
				if (unvisitedVertices.size === 0)
					break;

				const startVertex = this.#graph.vertices.values().next().value;
				this.traverseConnectedComponent(startVertex);
			}
		}
		/**
		 * @param {number} startVertex
		 * @returns {void}
		 */
		traverseConnectedComponent(startVertex) {
			if (!this.#graph.vertices.has(startVertex)) throw new RangeError(`Vertex with index ${startVertex} doesn't exist`);
			const visited = new Map();
			for (const index of this.#graph.vertices)
				visited[index] = false;
			this.#traverse(startVertex, visited);
		}
		/**
		 * @returns {Set<number>}
		 */
		#getUnvisitedVertices() {
			const unvisitedVertices = new Set(this.#graph.vertices);
			for (const vertex of unvisitedVertices)
				if (this.#vertices.has(vertex))
					unvisitedVertices.delete(vertex);
			return unvisitedVertices;
		}
		/**
		 * @param {number} startVertex
		 * @param {Map<number, boolean>} visited
		 * @returns {void}
		 */
		#traverse(startVertex, visited) {
			visited[startVertex] = true;
			const neighbors = this.#graph.getNeighborsOf(startVertex);
			for (const neighbor of neighbors) {
				this.#vertices.add(neighbor);
				this.#connections.add({ from: startVertex, to: neighbor });
				if (!visited[neighbor])
					this.#traverse(neighbor, visited);
			}
		}
		/** @type {Set<number>} */
		#vertices = new Set();
		/**
		 * @readonly
		 * @returns {Set<number>}
		 */
		get vertices() {
			return Object.freeze(this.#vertices);
		}
		/**@type {Set<EdgeNotation>} */
		#connections = new Set();
		/**
		 * @readonly
		 * @returns {Set<EdgeNotation>}
		 */
		get connections() {
			return Object.freeze(this.#connections);
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
			const vertexIndices = Array.import(shell[`vertices`], `property vertices`);
			for (const index of vertexIndices) {
				result.addVertex(index);
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
		const dfs = new Graph.DFS(this);
		dfs.traverse();
		return {
			vertices: Array.from(this.vertices),
			connections: Array.from(dfs.connections)
		};
	}
	/** @type {Map<number, GraphVertex>} */
	#vertices = new Map();
	/**
	 * @readonly
	 * @returns {Set<number>}
	 */
	get vertices() {
		return new Set(this.#vertices.keys());
	}
	/** @type {Map<GraphVertex, number>} */
	#indices = new Map();
	/**
	 * @param {number} index
	 * @returns {GraphVertex}
	 */
	#getVertex(index) {
		if (!Number.isInteger(index)) throw new TypeError(`Index ${index} is not finite integer number`);
		return this.#vertices.get(index) ?? (() => {
			throw new RangeError(`Vertex with index ${index} doesn't exist`);
		})();
	}
	/**
	 * @param {GraphVertex} vertex
	 * @returns {number}
	 */
	#getIndex(vertex) {
		return this.#indices.get(vertex) ?? NaN;
	}
	/**
	 * @param {number} index
	 * @returns {void}
	 */
	addVertex(index) {
		if (this.vertices.has(index)) throw new EvalError(`Vertex of index ${index} already exists`);
		const vertex = new Graph.Vertex();
		this.#vertices.set(index, vertex);
		this.#indices.set(vertex, index);
	}
	/**
	 * @param {number} index
	 * @returns {void}
	 */
	removeVertex(index) {
		const verticeSelected = this.#getVertex(index);
		for (const neighbor of verticeSelected.neighbors) {
			Graph.Vertex.disconnect(verticeSelected, neighbor);
		}
		this.#vertices.delete(index);
		this.#indices.delete(verticeSelected);
	}
	/**
	 * @param {number} from
	 * @param {number} to
	 * @returns {void}
	 */
	addEdge(from, to) {
		[from, to] = [from, to].sort((a, b) => a - b);
		const vertexFrom = this.#getVertex(from);
		const vertexTo = this.#getVertex(to);
		try {
			Graph.Vertex.connect(vertexFrom, vertexTo);
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
		const vertexFrom = this.#getVertex(from);
		const vertexTo = this.#getVertex(to);
		try {
			Graph.Vertex.disconnect(vertexFrom, vertexTo);
		} catch (error) {
			throw new EvalError(`Connection between ${from} and ${to} doesn't exist`);
		}
	}
	/**
	 * @param {number} index
	 * @returns {Set<number>}
	 */
	getNeighborsOf(index) {
		const vertex = this.#getVertex(index);
		const neighborIndices = new Set();
		for (const neighbor of vertex.neighbors)
			neighborIndices.add(this.#getIndex(neighbor));
		return neighborIndices;
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