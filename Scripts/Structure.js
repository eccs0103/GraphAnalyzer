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

/**
 * @typedef {InstanceType<Graph.Vertex>} GraphVertex
 */

/**
 * @typedef {[GraphVertex, GraphVertex]} GraphEdge
 */

/**
 * @typedef {InstanceType<Graph.DFS>} GraphDFS
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
			vertices: Array.from(this.vertices),
			connections: Graph.DFS.walkDepthFirst(this).map(([from, to]) => ({ from, to }))
		};
	}

	//#region Vertex
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
	static DFS = class GraphDFS {
		/**
		 * @param {Graph} graph 
		 * @returns {Graph[]}
		 * @throws {TypeError}
		 * @throws {EvalError}
		 */
		static getBiconnectedComponents(graph) {
			const dfs = new GraphDFS();
			for (const [, vertex] of graph.#vertices) {
				if (dfs.#visits.ask(vertex) === null) {
					dfs.#walkDepthFirstExtended(vertex);
				}
				dfs.#paths.push(dfs.#stack.clear());
			}
			return dfs.#paths
				.filter(path => path.length > 0)
				.map(path => graph.getSubgraphWith(new Set(path
					.flat()
					.map(vertex => graph.#getIndex(vertex))
				)));
		}
		/**
		 * @param {Graph} graph
		 * @returns {[number, number][]}
		 * @throws {EvalError}
		 */
		static walkDepthFirst(graph) {
			const dfs = new GraphDFS();
			for (const [, vertex] of graph.#vertices) {
				if (dfs.#visits.ask(vertex) === null) {
					dfs.#walkDepthFirst(vertex);
				}
			}
			return dfs.#stack.clear()
				.map(([from, to]) => [graph.#getIndex(from), graph.#getIndex(to)]);
		}
		/**
		 * @param {Graph} graph 
		 */
		/** @type {GraphEdge[][]} */
		#paths = [];
		/** @type {Stack<GraphEdge>} */
		#stack = new Stack();
		/** @type {number} */
		#time = 0;
		/** @type {StrictMap<GraphVertex, number>} */
		#lowlinks = new StrictMap();
		/** @type {StrictMap<GraphVertex, number>} */
		#visits = new StrictMap();
		/** @type {StrictMap<GraphVertex, GraphVertex>} */
		#parent = new StrictMap();
		/**
		 * @param {GraphVertex} vertex 
		 * @returns {void}
		 */
		#walkDepthFirstExtended(vertex) {
			++this.#time;
			this.#lowlinks.set(vertex, this.#time);
			this.#visits.set(vertex, this.#time);
			let children = 0;

			for (const neighbor of vertex.neighbors) {
				if (this.#visits.ask(neighbor) === null) {
					++children;
					this.#parent.set(neighbor, vertex);
					this.#stack.push([vertex, neighbor]);

					this.#walkDepthFirstExtended(neighbor);

					if (this.#lowlinks.get(vertex) > this.#lowlinks.get(neighbor)) {
						this.#lowlinks.set(vertex, this.#lowlinks.get(neighbor));
					}
					if ((this.#visits.get(vertex) === 1 && children > 1) || (this.#visits.get(vertex) > 1 && this.#lowlinks.get(neighbor) >= this.#visits.get(vertex))) {
						/** @type {GraphEdge[]} */
						const path = [];
						while (true) {
							const edge = this.#stack.peek;
							path.push(this.#stack.pop());
							if (edge[0] === vertex && edge[1] === neighbor) break;
						}
						this.#paths.push(path);
					}
				} else if (neighbor !== this.#parent.ask(vertex) && this.#visits.get(neighbor) < this.#visits.get(vertex)) {
					if (this.#lowlinks.get(vertex) > this.#visits.get(neighbor)) {
						this.#lowlinks.set(vertex, this.#visits.get(neighbor));
					}
					this.#stack.push([vertex, neighbor]);
				}
			}
		}
		/**
		 * @param {GraphVertex} vertex 
		 * @returns {void}
		 */
		#walkDepthFirst(vertex) {
			++this.#time;
			this.#visits.set(vertex, this.#time);
			let children = 0;

			for (const neighbor of vertex.neighbors) {
				if (this.#visits.ask(neighbor) === null) {
					++children;
					this.#parent.set(neighbor, vertex);
					this.#stack.push([vertex, neighbor]);
					this.#walkDepthFirst(neighbor);
				} else if (neighbor !== this.#parent.ask(vertex) && this.#visits.get(neighbor) < this.#visits.get(vertex)) {
					this.#stack.push([vertex, neighbor]);
				}
			}
		}
	};
	//#endregion

	/** @type {StrictMap<number, GraphVertex>} */
	#vertices = new StrictMap();
	/**
	 * @param {number} index 
	 * @returns {GraphVertex}
	 * @throws {EvalError}
	 */
	#getVertex(index) {
		if (!this.#vertices.has(index)) throw new EvalError(`Vertex with index ${index} doesn't exist`);
		return this.#vertices.get(index);
	}
	/**
	 * @param {number} index 
	 * @param {GraphVertex} vertex 
	 * @returns {void}
	 * @throws {EvalError}
	 */
	#setVertex(index, vertex) {
		if (this.#vertices.has(index)) throw new EvalError(`Vertex of index ${index} already exists`);
		this.#vertices.set(index, vertex);
		this.#indices.set(vertex, index);
	}
	/**
	 * @readonly
	 * @returns {Readonly<Set<number>>}
	 */
	get vertices() {
		return Object.freeze(new Set(this.#vertices.keys()));
	}
	/** @type {StrictMap<GraphVertex, number>} */
	#indices = new StrictMap();
	/**
	 * @param {GraphVertex} vertex
	 * @returns {number}
	 * @throws {EvalError}
	 */
	#getIndex(vertex) {
		if (!this.#indices.has(vertex)) throw new EvalError(`Vertex doesn't exist`);
		return this.#indices.get(vertex);
	}
	/**
	 * @param {number} index
	 * @returns {void}
	 * @throws {TypeError}
	 * @throws {EvalError}
	 */
	addVertex(index) {
		if (!Number.isInteger(index)) throw new TypeError(`Index ${index} is not finite integer number`);
		this.#setVertex(index, new Graph.Vertex());
	}
	/**
	 * @param {number} index
	 * @returns {void}
	 * @throws {TypeError}
	 * @throws {EvalError}
	 */
	removeVertex(index) {
		if (!Number.isInteger(index)) throw new TypeError(`Index ${index} is not finite integer number`);
		const vertex = this.#getVertex(index);
		for (const neighbor of vertex.neighbors) {
			Graph.Vertex.disconnect(vertex, neighbor);
		}
		this.#vertices.delete(index);
		this.#indices.delete(vertex);
	}
	/**
	 * @param {number} from
	 * @param {number} to
	 * @returns {void}
	 * @throws {TypeError}
	 * @throws {EvalError}
	 */
	addEdge(from, to) {
		if (!Number.isInteger(from)) throw new TypeError(`Index ${from} is not finite integer number`);
		if (!Number.isInteger(to)) throw new TypeError(`Index ${to} is not finite integer number`);
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
	 * @throws {EvalError}
	 */
	removeEdge(from, to) {
		if (!Number.isInteger(from)) throw new TypeError(`Index ${from} is not finite integer number`);
		if (!Number.isInteger(to)) throw new TypeError(`Index ${to} is not finite integer number`);
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
	 * @param {Set<number>} vertices
	 * @returns {Graph}
	 * @throws {TypeError}
	 * @throws {EvalError}
	 */
	getSubgraphWith(vertices) {
		const subgraph = new Graph();
		const arrayVertices = Array.from(vertices);
		for (let index = 0; index < arrayVertices.length; index++) {
			const indexFrom = arrayVertices[index];
			const vertexFrom = this.#getVertex(indexFrom);
			if (index === 0) subgraph.addVertex(indexFrom);
			for (let index2 = index + 1; index2 < arrayVertices.length; index2++) {
				const indexTo = arrayVertices[index2];
				const vertexTo = this.#getVertex(indexTo);
				if (index === 0) subgraph.addVertex(indexTo);
				if (vertexFrom.isNeighbor(vertexTo)) {
					subgraph.addEdge(indexFrom, indexTo);
				}
			}
		}
		return subgraph;
	}
	/**
	 * @param {number} index 
	 * @returns {Set<number>}
	 * @throws {TypeError}
	 * @throws {EvalError}
	 */
	getNeighborsOf(index) {
		if (!Number.isInteger(index)) throw new TypeError(`Index ${index} is not finite integer number`);
		/** @type {Set<number>} */
		const setNeighbors = new Set();
		for (const neighbor of this.#getVertex(index).neighbors) {
			setNeighbors.add(this.#getIndex(neighbor));
		};
		return setNeighbors;
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
	#valueTextbox = `{\n\t"vertices": [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ],\n\t"connections": [\n\t\t{ "from": 0, "to": 1 },\n\t\t{ "from": 1, "to": 2 },\n\t\t{ "from": 2, "to": 3 },\n\t\t{ "from": 0, "to": 3 },\n\t\t{ "from": 1, "to": 4 },\n\t\t{ "from": 3, "to": 4 },\n\t\t{ "from": 4, "to": 5 },\n\t\t{ "from": 5, "to": 6 },\n\t\t{ "from": 6, "to": 7 },\n\t\t{ "from": 7, "to": 5 },\n\t\t{ "from": 5, "to": 8 },\n\t\t{ "from": 8, "to": 9 },\n\t\t{ "from": 9, "to": 5 }\n\t]\n}`;
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

