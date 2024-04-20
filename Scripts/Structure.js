"use strict";

import {} from "./Modules/Executors.js";
import {} from "./Modules/Extensions.js";
import {} from "./Modules/Generators.js";
import {} from "./Modules/Measures.js";
import {} from "./Modules/Palette.js";
import {} from "./Modules/Storage.js";
import {} from "./Modules/Time.js";

import {} from "./Components/Node.js";
import {} from "./Components/Entity.js";
import {} from "./Components/InterfaceItem.js";
import {} from "./Components/Corporeal.js";
import {} from "./Components/Utilities.js";

const { min, max } = Math;

//#region Vertice
class Vertice {}
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
      const result = new Edge(connections[from], connections[to]);
      return result;
    } catch (error) {
      throw new TypeError(
        `Unable to import ${name} due its ${typename(source)} type`,
        { cause: error }
      );
    }
  }

  /**
   * @param {Readonly<Vertice[]>} connections 
   * @returns {EdgeNotation}
   */
  export(connections){
	const indexFrom = connections.indexOf(this.#from);
	if(indexFrom < 0) throw ReferenceError(`Unable to find index of from`);
	const indexTo = connections.indexOf(this.#to);
	if(indexTo < 0) throw ReferenceError(`Unable to find index of to`);
	return {
		from: indexFrom,
		to : indexTo
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
      const length = Number.import(shell[`vertices`], `property vertices`);
      const vertices = new Array(length);
      const edges = Array.import(shell[`connections`], `property connections`).map((item, index) =>Edge.import(item, vertices, `property connections[${index}]`));
      const result = new Graph();
      result.#vertices = vertices;
      result.#edges = edges;
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
    const qanak = this.#vertices.length;
    if(qanak < 0) throw ReferenceError(`Unable to build the graph`);
		return {
      vertices: qanak, 
      connections : this.#edges.map(edge => Edge.export())
		};
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
      throw new RangeError(
        `Vertice index ${index} is out of range [0 - ${this.#vertices.length})`
      );
    const verticeSelected = this.#vertices[index];
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
    this.#edges.splice(indexSelected, 1);
  }
}
//#endregion

export { Vertice, Edge, Graph };
