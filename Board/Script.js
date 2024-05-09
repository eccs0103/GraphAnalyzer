/** @typedef {import("../Scripts/Components/Entity.js").EntityEventMap} EntityEventMap */

"use strict";

import { Entity } from "../Scripts/Components/Entity.js";
import { userInterface } from "../Scripts/Components/InterfaceItem.js";
import { canvas, context, progenitor } from "../Scripts/Components/Node.js";
import { DataPair, StrictMap } from "../Scripts/Modules/Extensions.js";
import { Point2D } from "../Scripts/Modules/Measures.js";
import { Color } from "../Scripts/Modules/Palette.js";
import { Graph } from "../Scripts/Structure.js";

const { min, abs, hypot, atan2, PI } = Math;

/** 
 * @type {Graph}
 */
const graph = new Graph();
const colorBackground = await window.ensure(() => {
	return Color.tryParse(getComputedStyle(document.body).getPropertyValue(`--color-background`)) ?? (() => {
		throw new EvalError(`Unable to parse background color`);
	})();
});

//#region Definition
const inputVertexTool = await window.ensure(() => document.getElement(HTMLInputElement, `input#vertex-tool`));
const inputEdgeTool = await window.ensure(() => document.getElement(HTMLInputElement, `input#edge-tool`));
const inputExecuteProgram = await window.ensure(() => document.getElement(HTMLInputElement, `input#execute-program`));
const buttonCaptureCanvas = await window.ensure(() => document.getElement(HTMLButtonElement, `button#capture-canvas`));
//#endregion
//#region Member entity
/**
 * @typedef VirtualLinkEventInit
 * @property {VertexEntity} vertex
 * @property {EdgeEntity} edge
 * 
 * @typedef {EventInit & VirtualLinkEventInit} LinkEventInit
 */

class LinkEvent extends Event {
	/**
	 * @param {string} type 
	 * @param {LinkEventInit} dict 
	 */
	constructor(type, dict) {
		super(type, dict);
		this.#vertex = dict.vertex;
		this.#edge = dict.edge;
	}
	/** @type {VertexEntity} */
	#vertex;
	/**
	 * @readonly
	 * @returns {VertexEntity}
	 */
	get vertex() {
		return this.#vertex;
	}
	/** @type {EdgeEntity} */
	#edge;
	/**
	 * @readonly
	 * @returns {EdgeEntity}
	 */
	get edge() {
		return this.#edge;
	}
}

/**
 * @typedef VirtualMemberEntityEventMap
 * @property {Event} attach
 * @property {Event} detach
 * @property {LinkEvent} link
 * @property {LinkEvent} unlink
 * 
 * @typedef {EntityEventMap & VirtualMemberEntityEventMap} MemberEntityEventMap
 */

/**
 * @typedef {Map<Graph, Color>} Palette
 */

/**
 * @abstract
 */
class MemberEntity extends Entity {
	/** @type {Color} */
	static #colorInitial = colorBackground.invert();
	/**
	 * @readonly
	 * @returns {Color}
	 */
	static get colorInitial() {
		return MemberEntity.#colorInitial;
	}
	/**
	 * @param {Palette} palette 
	 * @returns {void}
	 */
	static markHighlighting(palette) {
		throw new ReferenceError(`Not implemented function`);
	}
	/**
	 * @template {keyof MemberEntityEventMap} K
	 * @param {K} type 
	 * @param {(this: MemberEntity, ev: MemberEntityEventMap[K]) => any} listener 
	 * @param {boolean | AddEventListenerOptions} options
	 * @returns {void}
	 */
	addEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/**
	 * @template {keyof MemberEntityEventMap} K
	 * @param {K} type 
	 * @param {(this: MemberEntity, ev: MemberEntityEventMap[K]) => any} listener 
	 * @param {boolean | EventListenerOptions} options
	 * @returns {void}
	 */
	removeEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
}
//#endregion
//#region Vertex member
/**
 * @typedef {{}} VirtualVertexEntityEventMap
 * 
 * @typedef {MemberEntityEventMap & VirtualVertexEntityEventMap} VertexEntityEventMap
 */

class VertexEntity extends MemberEntity {
	/**
	 * @param {Palette} palette 
	 * @returns {void}
	 */
	static markHighlighting(palette) {
		for (const [index, vertex] of VertexEntity.#members) {
			const { x, y } = vertex.position;
			/** @type {[number, Color][]} */
			const colors = [];
			for (const [graph, color] of palette) {
				if (!graph.vertices.has(index)) continue;
				for (const indexNeighbor of graph.getNeighborsOf(index)) {
					const pointNeighborPosition = VertexEntity.#members.get(indexNeighbor).position;
					const angle = atan2(y - pointNeighborPosition.y, x - pointNeighborPosition.x) + PI;
					colors.push([angle, color]);
				}
			}
			vertex.#colors = new Map();
			if (colors.length > 0) {
				colors.sort(([angle1], [angle2]) => angle1 - angle2);
				const [angleLast, colorLast] = colors[colors.length - 1];
				for (let index = 0; index < colors.length; index++) {
					const [anglePrevious, colorPrevious] = (index > 0
						? colors[index - 1]
						: [angleLast - 2 * PI, colorLast]
					);
					const [angleCurrent] = colors[index];
					vertex.#colors.set((anglePrevious + angleCurrent) / 2, colorPrevious);
				}
				vertex.#colors.set(2 * PI, colorLast);
			}
		}
	}
	/** @type {number} */
	static #counter = 0;
	/** @type {StrictMap<number, VertexEntity>} */
	static #members = new StrictMap();
	/** @type {number} */
	static #radius;
	/**
	 * @readonly
	 * @returns {number}
	 */
	static get radius() {
		return VertexEntity.#radius;
	}
	/**
	 * @param {Readonly<Point2D>} point 
	 * @param {VertexEntity?} exception 
	 * @returns {boolean}
	 */
	static #canPlaceAt(point, exception = null) {
		for (const [, vertex] of VertexEntity.#members) {
			if (vertex === exception) continue;
			if (point.getDistanceFrom(vertex.position) < VertexEntity.#radius * 2) return false;
		}
		return true;
	}
	/**
	 * @todo Invalid logicial implementation. Do not use "isMesh" except implementation.
	 * @param {Readonly<Point2D>} point 
	 * @returns {VertexEntity?}
	 */
	static getMemberAt(point) {
		for (const [, vertex] of VertexEntity.#members) {
			if (vertex.isMesh(point)) return vertex;
		}
		return null;
	}
	/** @type {boolean} */
	static #locked = true;
	/**
	 * @param {Readonly<Point2D>} point 
	 * @returns {void}
	 */
	static tryAttachAt(point) {
		if (!VertexEntity.#canPlaceAt(point)) return;
		VertexEntity.#locked = false;
		const vertex = new VertexEntity();
		VertexEntity.#locked = true;
		progenitor.children.add(vertex);
		vertex.position = point;
		vertex.dispatchEvent(new Event(`attach`));
	}
	static {
		VertexEntity.#radius = min(canvas.width, canvas.height) / 64;
		window.addEventListener(`resize`, (event) => {
			VertexEntity.#radius = min(canvas.width, canvas.height) / 64;
		});
	}
	/**
	 * @param {string} name 
	 */
	constructor(name = `Vertex member`) {
		super(name);
		if (VertexEntity.#locked) throw new TypeError(`Illegal constructor`);

		//#region Behavior
		this.addEventListener(`attach`, (event) => {
			this.#index = VertexEntity.#counter++;
			VertexEntity.#members.set(this.#index, this);
			graph.addVertex(this.#index);
		});
		this.addEventListener(`detach`, (event) => {
			graph.removeVertex(this.#index);
			VertexEntity.#members.delete(this.#index);
			this.#index = NaN;
		});

		this.addEventListener(`link`, (event) => {
			this.#connections.add(event.edge);
		});
		this.addEventListener(`unlink`, (event) => {
			this.#connections.delete(event.edge);
		});

		this.addEventListener(`render`, () => {
			context.save();
			this.#fillSector(context, 0, 2 * PI);
			let previous = 0;
			for (const [angle, color] of this.#colors) {
				this.#fillSector(context, previous, angle, color);
				previous = angle;
			}
			context.closePath();
			context.restore();
		});
		//#endregion
		//#region Vertex control
		this.addEventListener(`click`, (event) => {
			if (inputExecuteProgram.checked || !inputVertexTool.checked) return;
			for (const edge of this.#connections) {
				this.#connections.delete(edge);
				edge.dispatchEvent(new LinkEvent(`unlink`, { vertex: this, edge: edge }));
			}
			progenitor.children.remove(this);
			this.dispatchEvent(new Event(`detach`));
		});

		/**
		 * @todo Fix position change. Fix engine for that.
		 */
		this.addEventListener(`dragbegin`, (event) => {
			if (inputExecuteProgram.checked || !inputVertexTool.checked) return;
			this.#setMoveState(event.position);
		});
		//#endregion
		//#region Edge control
		this.addEventListener(`dragbegin`, (event) => {
			if (inputExecuteProgram.checked || !inputEdgeTool.checked) return;
			EdgeEntity.tryAttachFrom(this);
		});
		//#endregion
	}
	/**
	 * @template {keyof VertexEntityEventMap} K
	 * @param {K} type 
	 * @param {(this: VertexEntity, ev: VertexEntityEventMap[K]) => any} listener 
	 * @param {boolean | AddEventListenerOptions} options
	 * @returns {void}
	 */
	addEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/**
	 * @template {keyof VertexEntityEventMap} K
	 * @param {K} type 
	 * @param {(this: VertexEntity, ev: VertexEntityEventMap[K]) => any} listener 
	 * @param {boolean | EventListenerOptions} options
	 * @returns {void}
	 */
	removeEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/**
	 * @returns {string}
	 */
	get name() {
		return `${super.name} (${this.#index})`;
	}
	/**
	 * @param {string} value 
	 * @returns {void}
	 */
	set name(value) {
		super.name = value;
	}
	/**
	 * @readonly
	 * @returns {Readonly<Point2D>}
	 */
	get size() {
		return Point2D.repeat(VertexEntity.#radius * 2);
	}
	/**
	 * @param {Readonly<Point2D>} point 
	 * @returns {boolean}
	 */
	isMesh(point) {
		return (point.getDistanceFrom(this.position) <= VertexEntity.#radius);
	}
	/** @type {number} */
	#index = NaN;
	/**
	 * @readonly
	 * @returns {number}
	 */
	get index() {
		return this.#index;
	}
	/** @type {Set<EdgeEntity>} */
	#connections = new Set();
	/**
	 * @param {Readonly<Point2D>} point 
	 * @returns {boolean}
	 */
	#canMoveAt(point) {
		return VertexEntity.#canPlaceAt(point, this);
	}
	/**
	 * @param {Readonly<Point2D>} position 
	 * @returns {void}
	 */
	#setMoveState(position) {
		const controller = new AbortController();
		this.addEventListener(`drag`, (event) => {
			this.position = event.position;
		}, { signal: controller.signal });
		this.addEventListener(`dragend`, (event) => {
			if (!this.#canMoveAt(event.position)) {
				this.position = position;
			}
			controller.abort();
		}, { signal: controller.signal });
	}
	/** @type {Map<number, Color>} */
	#colors = new Map();
	/**
	 * @param {CanvasRenderingContext2D} context 
	 * @param {number} begin 
	 * @param {number} end 
	 * @param {Color} color 
	 * @returns {void}
	 */
	#fillSector(context, begin, end, color = MemberEntity.colorInitial) {
		const { x, y } = this.position;
		context.beginPath();
		context.moveTo(x, y);
		context.arc(x, y, VertexEntity.#radius, begin, end);
		context.closePath();
		context.fillStyle = color.toString(true);
		context.fill();
	}
}
//#endregion
//#region Edge member
/**
 * @typedef {{}} VirtualEdgeEntityEventMap
 * 
 * @typedef {MemberEntityEventMap & VirtualEdgeEntityEventMap} EdgeEntityEventMap
 */

/**
 * @typedef {InstanceType<EdgeEntity.Socket>} EdgeEntitySocket
 */

class EdgeEntity extends MemberEntity {
	/**
	 * @param {Palette} palette 
	 * @returns {void}
	 */
	static markHighlighting(palette) {
		for (const edge of EdgeEntity.#members) {
			for (const [graph, color] of palette) {
				const vertices = graph.vertices;
				if (vertices.has(edge.#socketFrom.ensured.index) && vertices.has(edge.#socketTo.ensured.index)) {
					edge.#color = color;
				}
			}
		}
	}
	/** @type {Set<EdgeEntity>} */
	static #members = new Set();
	/** @type {boolean} */
	static #locked = true;
	/**
	 * @param {VertexEntity} vertex 
	 * @returns {Promise<void>}
	 */
	static async tryAttachFrom(vertex) {
		EdgeEntity.#locked = false;
		const edge = new EdgeEntity();
		EdgeEntity.#locked = true;
		progenitor.children.add(edge);

		edge.#socketFrom.content = vertex;
		vertex.dispatchEvent(new LinkEvent(`link`, { vertex: vertex, edge: edge }));

		const controller = new AbortController();
		const promise = (/** @type {Promise<VertexEntity?>} */ (new Promise((resolve) => {
			vertex.addEventListener(`dragend`, (event) => {
				resolve(VertexEntity.getMemberAt(event.position));
			}, { signal: controller.signal });
		})));
		promise.finally(() => {
			controller.abort();
		});

		const target = await promise;
		if (target === null) {
			edge.#socketFrom.content = null;
			progenitor.children.remove(edge);
			vertex.dispatchEvent(new LinkEvent(`unlink`, { vertex: vertex, edge: edge }));
		} else {
			edge.#socketTo.content = target;
			edge.dispatchEvent(new Event(`attach`));
			target.dispatchEvent(new LinkEvent(`link`, { vertex: target, edge: edge }));
		}
	}
	/** @type {number} */
	static #width;
	/**
	 * @readonly
	 * @returns {number}
	 */
	static get width() {
		return EdgeEntity.#width;
	}
	/** @type {Readonly<Point2D>} */
	static #pointPointerPosition;

	//#region Socket
	static Socket = class EdgeEntitySocket {
		/**
		 * @param {EdgeEntity} owner 
		 */
		constructor(owner) {
			this.#owner = owner;
		}
		/** @type {EdgeEntity} */
		#owner;
		/** @type {VertexEntity?} */
		#content = null;
		/**
		 * @returns {VertexEntity?}
		 */
		get content() {
			return this.#content;
		}
		/**
		 * @returns {VertexEntity}
		 */
		get ensured() {
			if (this.#content === null) throw new ReferenceError(`The content of ${this.#owner.name} is missing`);
			return this.#content;
		}
		/**
		 * @param {VertexEntity?} value 
		 * @returns {void}
		 */
		set content(value) {
			this.#content = value;
		}
	};
	//#endregion

	static {
		EdgeEntity.#width = min(canvas.width, canvas.height) / 128;
		window.addEventListener(`resize`, (event) => {
			EdgeEntity.#width = min(canvas.width, canvas.height) / 128;
		});

		/**
		 * @todo Fix drag position
		 */
		EdgeEntity.#pointPointerPosition = Object.freeze(Point2D.repeat(NaN));
		progenitor.addEventListener(`pointermove`, (event) => {
			EdgeEntity.#pointPointerPosition = event.position;
		});
	}
	/**
	 * @param {string} name 
	 */
	constructor(name = `Edge member`) {
		super(name);
		if (EdgeEntity.#locked) throw new TypeError(`Illegal constructor`);

		//#region Behavior
		this.addEventListener(`attach`, (event) => {
			try {
				graph.addEdge(this.#socketFrom.ensured.index, this.#socketTo.ensured.index);
				EdgeEntity.#members.add(this);
			} catch (error) {
				/**
				 * @todo Destory this entity
				 */
				throw error;
			}
		});
		this.addEventListener(`detach`, (event) => {
			graph.removeEdge(this.#socketFrom.ensured.index, this.#socketTo.ensured.index);
			EdgeEntity.#members.delete(this);
		});

		this.addEventListener(`unlink`, (event) => {
			this.dispatchEvent(new Event(`detach`));
			const [socketFrom, socketTo] = this.#orderSocketsBy(event.vertex);
			socketFrom.content = null;
			const previous = socketTo.ensured;
			socketTo.content = null;
			previous.dispatchEvent(new LinkEvent(`unlink`, { vertex: previous, edge: this }));
			progenitor.children.remove(this);
		});

		this.addEventListener(`render`, () => {
			context.save();
			context.fillStyle = this.#color.toString(true);
			const pointFrom = Object.map(this.#socketFrom.content, content => content.position) ?? EdgeEntity.#pointPointerPosition;
			const pointTo = Object.map(this.#socketTo.content, content => content.position) ?? EdgeEntity.#pointPointerPosition;
			const angle = Math.atan2(pointFrom.y - pointTo.y, pointFrom.x - pointTo.x);
			const offset = Math.asin(EdgeEntity.#width / 2 / VertexEntity.radius);
			context.beginPath();
			context.arc(pointFrom.x, pointFrom.y, VertexEntity.radius, angle + PI - offset, angle + PI + offset);
			context.arc(pointTo.x, pointTo.y, VertexEntity.radius, angle - offset, angle + offset);
			context.closePath();
			context.fill();
			context.restore();
		});
		//#endregion
		//#region Edge control
		this.addEventListener(`click`, (event) => {
			if (inputExecuteProgram.checked || !inputEdgeTool.checked) return;
			this.dispatchEvent(new Event(`detach`));
			for (const socket of [this.#socketFrom, this.#socketTo]) {
				const previous = socket.ensured;
				socket.content = null;
				previous.dispatchEvent(new LinkEvent(`unlink`, { vertex: previous, edge: this }));
			}
			progenitor.children.remove(this);
		});
		//#endregion
	}
	/**
	 * @template {keyof EdgeEntityEventMap} K
	 * @param {K} type 
	 * @param {(this: EdgeEntity, ev: EdgeEntityEventMap[K]) => any} listener 
	 * @param {boolean | AddEventListenerOptions} options
	 * @returns {void}
	 */
	addEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/**
	 * @template {keyof EdgeEntityEventMap} K
	 * @param {K} type 
	 * @param {(this: EdgeEntity, ev: EdgeEntityEventMap[K]) => any} listener 
	 * @param {boolean | EventListenerOptions} options
	 * @returns {void}
	 */
	removeEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/**
	 * @returns {string}
	 */
	get name() {
		const from = Object.map(this.#socketFrom.content, content => content.index) ?? NaN;
		const to = Object.map(this.#socketTo.content, content => content.index) ?? NaN;
		return `${super.name} (${from} - ${to})`;
	}
	/**
	 * @param {string} value 
	 * @returns {void}
	 */
	set name(value) {
		super.name = value;
	}
	/**
	 * @returns {Readonly<Point2D>}
	 */
	get size() {
		const unknown = Object.freeze(Point2D.repeat(NaN));
		const from = (Object.map(this.#socketFrom.content, content => content.position) ?? unknown);
		const to = (Object.map(this.#socketTo.content, content => content.position) ?? unknown);
		return Object.freeze(new Point2D(abs(to.x - from.x), abs(to.y - from.y)));
	}
	/**
	 * @param {Readonly<Point2D>} point 
	 * @returns {boolean}
	 */
	isMesh(point) {
		const vertexFrom = this.#socketFrom.content;
		const vertexTo = this.#socketTo.content;
		if (vertexFrom === null || vertexTo === null) return false;
		const pointFrom = vertexFrom.position;
		const pointTo = vertexTo.position;
		const pointCenter1Mouse = point["-"](pointFrom);
		const pointCenter1Center2 = pointTo["-"](pointFrom);
		const distanceCenter1Mouse = hypot(...pointCenter1Mouse);
		const distanceCenter1Center2 = hypot(...pointCenter1Center2);
		return (
			abs(pointCenter1Mouse.y - pointCenter1Mouse.x * pointCenter1Center2.y / pointCenter1Center2.x) < EdgeEntity.#width / 2 &&
			VertexEntity.radius < distanceCenter1Mouse && distanceCenter1Mouse < distanceCenter1Center2 &&
			VertexEntity.radius < distanceCenter1Mouse && distanceCenter1Mouse < distanceCenter1Center2
		);
	}
	/** @type {EdgeEntitySocket} */
	#socketFrom = new EdgeEntity.Socket(this);
	/** @type {EdgeEntitySocket} */
	#socketTo = new EdgeEntity.Socket(this);
	/**
	 * @param {VertexEntity} vertex 
	 * @returns {[EdgeEntitySocket, EdgeEntitySocket]}
	 * @throws {ReferenceError}
	 */
	#orderSocketsBy(vertex) {
		const socketFrom = this.#socketFrom;
		const socketTo = this.#socketTo;
		if (socketFrom.content === vertex) {
			return [socketFrom, socketTo];
		} else if (socketTo.content === vertex) {
			return [socketTo, socketFrom];
		} else throw new ReferenceError(`Unable to find vertex '${vertex.name}' in sockets`);
	}
	/** @type {Color} */
	#color = EdgeEntity.colorInitial;
}
//#endregion
//#region Controller
await window.load(Promise.fulfill(() => {
	userInterface.addEventListener(`click`, (event) => {
		if (inputExecuteProgram.checked || !inputVertexTool.checked) return;
		VertexEntity.tryAttachAt(event.position);
	});

	inputExecuteProgram.addEventListener(`change`, async () => await window.ensure(async () => {
		inputVertexTool.disabled = inputExecuteProgram.checked;
		inputEdgeTool.disabled = inputExecuteProgram.checked;

		/**
		 * @todo Fix in controller
		 */
		/** @type {Palette} */
		const palette = new Map((inputExecuteProgram.checked
			? await window.load(Promise.resolve(Graph.DFS.getBiconnectedComponents(graph).map((graph, index, array) => new DataPair(graph, Color.viaHSL(index / array.length * 360, 100, 50)))))
			: [new DataPair(graph, MemberEntity.colorInitial)]
		).map(rule => rule.toArray()));

		EdgeEntity.markHighlighting(palette);
		VertexEntity.markHighlighting(palette);
	}));

	buttonCaptureCanvas.addEventListener(`click`, async () => await window.ensure(() => {
		const canvasClone = document.createElement(`canvas`);
		canvasClone.width = canvas.width;
		canvasClone.height = canvas.height;
		const contextClone = canvasClone.getContext(`2d`) ?? (() => {
			throw new TypeError(`Context is missing`);
		})();
		contextClone.fillStyle = colorBackground.toString(true);
		contextClone.fillRect(0, 0, canvasClone.width, canvasClone.height);
		contextClone.drawImage(canvas, 0, 0);
		canvasClone.toBlob((blob) => {
			if (blob === null) throw new ReferenceError(`Unable to initialize canvas for capture`);
			navigator.download(new File([blob], `${Date.now()}.png`));
		});
	}));
}), 200, 1000);
//#endregion