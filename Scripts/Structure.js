"use strict";

import { } from "./Modules/Executors.js";
import { Stack, StrictMap } from "./Modules/Extensions.js";
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
	/**
	 * @param {unknown} source
	 * @returns {Graph}
	 * @throws {TypeError}
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
	 * @returns {GraphNotation}
	 */
	export() {
		return {
			vertices: [],
			connections: []
		};
	}

	//#region Vertex
	/**
	 * @typedef {InstanceType<Graph.Vertex>} GraphVertex
	 */
	static Vertex = class GraphVertex {
		/**
		 * @param {GraphVertex} vertex1 
		 * @param {GraphVertex} vertex2 
		 * @returns {void}
		 * @throws {EvalError}
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
		 * @throws {EvalError}
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
		/**
		 * @param {Graph} graph 
		 * @returns {Graph[]}
		 */
		static walkDepthFirst(graph) {
			const dfs = new GraphDFS();
			dfs.#graph = graph;
			for (const vertex of graph.vertices) {
				if (dfs.#visits.ask(vertex) === null) {
					dfs.#walkDepthFirst(vertex);
				}
				dfs.#paths.push(dfs.#stack.clear());
			}
			return dfs.#paths.filter(path => path.length > 0).map(path => dfs.#graph.getConnectedComponent(new Set(path.flat())));
		}
		/** @type {Graph} */
		#graph;
		/** @type {number[][][]} */
		#paths = [];
		/** @type {Stack<number[]>} */
		#stack = new Stack();
		/** @type {number} */
		#time = 0;
		/** @type {StrictMap<number, number>} */
		#lowlinks = new StrictMap();
		/** @type {StrictMap<number, number>} */
		#visits = new StrictMap();
		/** @type {StrictMap<number, number>} */
		#parent = new StrictMap();
		/**
		 * @param {number} vertex 
		 * @returns {void}
		 */
		#walkDepthFirst(vertex) {
			++this.#time;
			this.#lowlinks.set(vertex, this.#time);
			this.#visits.set(vertex, this.#time);
			let children = 0;

			for (const neighbor of this.#graph.getNeighborsOf(vertex)) {
				if (this.#visits.ask(neighbor) === null) {
					++children;
					this.#parent.set(neighbor, vertex);
					this.#stack.push(this.#getEdge(vertex, neighbor));

					this.#walkDepthFirst(neighbor);

					if (this.#lowlinks.get(vertex) > this.#lowlinks.get(neighbor)) {
						this.#lowlinks.set(vertex, this.#lowlinks.get(neighbor));
					}
					if ((this.#visits.get(vertex) === 1 && children > 1) || (this.#visits.get(vertex) > 1 && this.#lowlinks.get(neighbor) >= this.#visits.get(vertex))) {
						/** @type {number[][]} */
						const path = [];
						while (true) {
							const peekEdge = this.#stack.peek;
							if (peekEdge[0] === vertex && peekEdge[1] === neighbor) break;
							path.push(this.#stack.pop());
						}
						path.push(this.#stack.pop());
						this.#paths.push(path);
					}
				} else if (neighbor !== this.#parent.ask(vertex) && this.#visits.get(neighbor) < this.#visits.get(vertex)) {
					if (this.#lowlinks.get(vertex) > this.#visits.get(neighbor)) {
						this.#lowlinks.set(vertex, this.#visits.get(neighbor));
					}
					this.#stack.push(this.#getEdge(vertex, neighbor));
				}
			}
		}
		/**
		 * @param {number} from
		 * @param {number} to
		 * @returns {number[]}
		 */
		#getEdge(from, to) {
			const edge = [];
			edge.push(from);
			edge.push(to);
			return edge;
		}
	};
	//#endregion

	/** @type {StrictMap<number, GraphVertex>} */
	#vertices = new StrictMap();
	/**
	 * @readonly
	 * @returns {Set<number>}
	 */
	get vertices() {
		return new Set(this.#vertices.keys());
	}
	/** @type {StrictMap<GraphVertex, number>} */
	#indices = new StrictMap();
	/**
	 * @param {number} index
	 * @returns {GraphVertex}
	 * @throws {TypeError}
	 * @throws {RangeError}
	 */
	#getVertex(index) {
		if (!Number.isInteger(index)) throw new TypeError(`Index ${index} is not finite integer number`);
		return this.#vertices.ask(index) ?? (() => {
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
	 * @throws {EvalError}
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
	 * @throws {TypeError}
	 * @throws {RangeError}
	 * @throws {EvalError}
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
	 * @throws {TypeError}
	 * @throws {RangeError}
	 * @throws {EvalError}
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
	 * @throws {TypeError}
	 * @throws {RangeError}
	 * @throws {EvalError}
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
	 * @throws {TypeError}
	 * @throws {RangeError}
	 */
	getNeighborsOf(index) {
		/** @type {Set<number>} */
		const neighborIndices = new Set();
		for (const neighbor of this.#getVertex(index).neighbors) {
			neighborIndices.add(this.#getIndex(neighbor));
		}
		return neighborIndices;
	}
	/**
	 * @param {Set<number>} vertices
	 * @returns {Graph}
	 */
	getConnectedComponent(vertices) {
		const component = new Graph();
		const verticeArr = Array.from(vertices);
		for(let i = 0; i < verticeArr.length; i++){
			if(i === 0) component.addVertex(verticeArr[i]);
			for(let j = i+1; j < verticeArr.length; j++){
				if(i === 0) component.addVertex(verticeArr[j]);
				if(this.getNeighborsOf(verticeArr[i]).has(verticeArr[j])) component.addEdge(verticeArr[i], verticeArr[j]);		
			}
		}
		return component;
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