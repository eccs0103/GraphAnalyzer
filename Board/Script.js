/** @typedef {import("../Scripts/Components/Entity.js").EntityEventMap} EntityEventMap */

"use strict";

import { Entity } from "../Scripts/Components/Entity.js";
import { userInterface } from "../Scripts/Components/InterfaceItem.js";
import { canvas, context, progenitor } from "../Scripts/Components/Node.js";
import { Point2D } from "../Scripts/Modules/Measures.js";
import { Color } from "../Scripts/Modules/Palette.js";
import { Graph } from "../Scripts/Structure.js";

const { min, abs, hypot, PI } = Math;

/** 
 * @type {Graph}
 */
const graph = new Graph();
const colorForeground = await window.ensure(() => {
	return Color.tryParse(getComputedStyle(document.body).getPropertyValue(`--color-background`)) ?? (() => {
		throw new EvalError(`Unable to parse background color`);
	})();
});

//#region Definition
const inputVertexTool = await window.ensure(() => document.getElement(HTMLInputElement, `input#vertex-tool`));
const inputEdgeTool = await window.ensure(() => document.getElement(HTMLInputElement, `input#edge-tool`));
const buttonCaptureCanvas = await window.ensure(() => document.getElement(HTMLButtonElement, `button#capture-canvas`));
//#endregion
//#region Member entity
/**
 * @typedef VirtualLinkEventInit
 * @property {VertexMember} vertex
 * @property {EdgeMember} edge
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
	/** @type {VertexMember} */
	#vertex;
	/**
	 * @readonly
	 * @returns {VertexMember}
	 */
	get vertex() {
		return this.#vertex;
	}
	/** @type {EdgeMember} */
	#edge;
	/**
	 * @readonly
	 * @returns {EdgeMember}
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
 * @abstract
 */
class MemberEntity extends Entity {
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
 * @typedef {{}} VirtualVertexMemberEventMap
 * 
 * @typedef {MemberEntityEventMap & VirtualVertexMemberEventMap} VertexMemberEventMap
 */

class VertexMember extends MemberEntity {
	/** @type {number} */
	static #counter = 0;
	/** @type {Map<number, VertexMember>} */
	static #members = new Map();
	/** @type {number} */
	static #diameter;
	/**
	 * @readonly
	 * @returns {number}
	 */
	static get diameter() {
		return this.#diameter;
	}
	/**
	 * @param {Readonly<Point2D>} point 
	 * @param {VertexMember?} exception 
	 * @returns {boolean}
	 */
	static #canPlaceAt(point, exception = null) {
		for (const [, vertex] of VertexMember.#members) {
			if (vertex === exception) continue;
			if (hypot(...point["-"](vertex.position)) < VertexMember.#diameter) return false;
		}
		return true;
	}
	/**
	 * @todo Invalid logicial implementation. Do not use "isMesh" except implementation.
	 * @param {Readonly<Point2D>} point 
	 * @returns {VertexMember?}
	 */
	static getMemberAt(point) {
		for (const [, vertex] of VertexMember.#members) {
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
		if (!VertexMember.#canPlaceAt(point)) return;
		VertexMember.#locked = false;
		const vertex = new VertexMember();
		VertexMember.#locked = true;
		progenitor.children.add(vertex);
		vertex.position = point;
		vertex.dispatchEvent(new Event(`attach`));
	}
	static {
		VertexMember.#diameter = min(canvas.width, canvas.height) / 32;
		window.addEventListener(`resize`, (event) => {
			VertexMember.#diameter = min(canvas.width, canvas.height) / 32;
		});
	}
	/**
	 * @param {string} name 
	 */
	constructor(name = `Vertex member`) {
		super(name);
		if (VertexMember.#locked) throw new TypeError(`Illegal constructor`);

		//#region Behavior
		this.addEventListener(`attach`, (event) => {
			this.#index = VertexMember.#counter++;
			VertexMember.#members.set(this.#index, this);
			graph.addVertex(this.#index);
		});
		this.addEventListener(`detach`, (event) => {
			graph.removeVertex(this.#index);
			VertexMember.#members.delete(this.#index);
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
			context.fillStyle = colorForeground.invert().toString(true);
			const { position: position } = this;
			context.beginPath();
			context.arc(position.x, position.y, VertexMember.#diameter / 2, 0, 2 * PI);
			context.closePath();
			context.fill();
			context.restore();
		});
		//#endregion
		//#region Vertex control
		this.addEventListener(`click`, (event) => {
			if (!inputVertexTool.checked) return;
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
			if (!inputVertexTool.checked) return;
			this.#setMoveState(event.position);
		});
		//#endregion
		//#region Edge control
		this.addEventListener(`dragbegin`, (event) => {
			if (!inputEdgeTool.checked) return;
			EdgeMember.tryAttachFrom(this);
		});
		//#endregion
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
	/** @type {Set<EdgeMember>} */
	#connections = new Set();
	/**
	 * @returns {Readonly<Point2D>}
	 */
	get size() {
		return Point2D.repeat(VertexMember.#diameter);
	}
	/**
	 * @param {Readonly<Point2D>} value 
	 * @returns {void}
	 */
	set size(value) {
		throw new TypeError(`Cannot set property size of #<VertexMember> which has only a getter`);
	}
	/**
	 * @param {Readonly<Point2D>} point 
	 * @returns {boolean}
	 */
	isMesh(point) {
		return (hypot(...point["-"](this.position)) <= VertexMember.#diameter / 2);
	}
	/**
	 * @param {Readonly<Point2D>} point 
	 * @returns {boolean}
	 */
	#canMoveAt(point) {
		return VertexMember.#canPlaceAt(point, this);
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
	/**
	 * @template {keyof VertexMemberEventMap} K
	 * @param {K} type 
	 * @param {(this: VertexMember, ev: VertexMemberEventMap[K]) => any} listener 
	 * @param {boolean | AddEventListenerOptions} options
	 * @returns {void}
	 */
	addEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/**
	 * @template {keyof VertexMemberEventMap} K
	 * @param {K} type 
	 * @param {(this: VertexMember, ev: VertexMemberEventMap[K]) => any} listener 
	 * @param {boolean | EventListenerOptions} options
	 * @returns {void}
	 */
	removeEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
}
//#endregion
//#region Edge member
/**
 * @typedef {{}} VirtualEdgeMemberEventMap
 * 
 * @typedef {MemberEntityEventMap & VirtualEdgeMemberEventMap} EdgeMemberEventMap
 */

class EdgeMember extends MemberEntity {
	//#region Socket
	/**
	 * @typedef {InstanceType<EdgeMember.Socket>} EdgeMemberSocket
	 */
	static Socket = class EdgeMemberSocket {
		/**
		 * @param {EdgeMember} owner 
		 */
		constructor(owner) {
			this.#owner = owner;
		}
		/** @type {EdgeMember} */
		#owner;
		/** @type {VertexMember?} */
		#content = null;
		/**
		 * @returns {VertexMember?}
		 */
		get content() {
			return this.#content;
		}
		/**
		 * @returns {VertexMember}
		 */
		get ensured() {
			if (this.#content === null) throw new ReferenceError(`The content of ${this.#owner.name} is missing`);
			return this.#content;
		}
		/**
		 * @param {VertexMember?} value 
		 * @returns {void}
		 */
		set content(value) {
			this.#content = value;
		}
	};
	//#endregion

	/** @type {boolean} */
	static #locked = true;
	/**
	 * @param {VertexMember} vertex 
	 * @returns {Promise<void>}
	 */
	static async tryAttachFrom(vertex) {
		EdgeMember.#locked = false;
		const edge = new EdgeMember();
		EdgeMember.#locked = true;
		progenitor.children.add(edge);

		edge.#socketFrom.content = vertex;
		vertex.dispatchEvent(new LinkEvent(`link`, { vertex: vertex, edge: edge }));

		const controller = new AbortController();
		const promise = (/** @type {Promise<VertexMember?>} */ (new Promise((resolve) => {
			vertex.addEventListener(`dragend`, (event) => {
				resolve(VertexMember.getMemberAt(event.position));
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
		return this.#width;
	}
	/** @type {Readonly<Point2D>} */
	static #pointPointerPosition;
	static {
		EdgeMember.#width = min(canvas.width, canvas.height) / 128;
		window.addEventListener(`resize`, (event) => {
			EdgeMember.#width = min(canvas.width, canvas.height) / 128;
		});

		/**
		 * @todo Fix drag position
		 */
		EdgeMember.#pointPointerPosition = Object.freeze(Point2D.repeat(NaN));
		progenitor.addEventListener(`pointermove`, (event) => {
			EdgeMember.#pointPointerPosition = event.position;
		});
	}
	/**
	 * @param {string} name 
	 */
	constructor(name = `Edge member`) {
		super(name);
		if (EdgeMember.#locked) throw new TypeError(`Illegal constructor`);

		//#region Behavior
		this.addEventListener(`attach`, (event) => {
			graph.addEdge(this.#socketFrom.ensured.index, this.#socketTo.ensured.index);
		});
		this.addEventListener(`detach`, (event) => {
			graph.removeEdge(this.#socketFrom.ensured.index, this.#socketTo.ensured.index);
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
			context.lineWidth = EdgeMember.#width;
			context.strokeStyle = colorForeground.invert().toString(true);
			const pointFrom = Object.map(this.#socketFrom.content, content => content.position) ?? EdgeMember.#pointPointerPosition;
			const pointTo = Object.map(this.#socketTo.content, content => content.position) ?? EdgeMember.#pointPointerPosition;
			context.beginPath();
			context.moveTo(pointFrom.x, pointFrom.y);
			context.lineTo(pointTo.x, pointTo.y);
			context.closePath();
			context.stroke();
			context.restore();
		});
		//#endregion
		//#region Edge control
		this.addEventListener(`click`, (event) => {
			if (!inputEdgeTool.checked) return;
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
	/** @type {EdgeMemberSocket} */
	#socketFrom = new EdgeMember.Socket(this);
	/** @type {EdgeMemberSocket} */
	#socketTo = new EdgeMember.Socket(this);
	/**
	 * @param {VertexMember} vertex 
	 * @returns {[EdgeMemberSocket, EdgeMemberSocket]}
	 */
	#orderSocketsBy(vertex) {
		const socketFrom = this.#socketFrom;
		const socketTo = this.#socketTo;
		if (socketFrom.content === vertex) {
			return [socketFrom, socketTo];
		} else if (socketTo.content === vertex) {
			return [socketTo, socketFrom];
		} else throw new ReferenceError(`Unabel to find vertex '${vertex.name}' in sockets`);
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
	 * @param {Readonly<Point2D>} value 
	 * @returns {void}
	 */
	set size(value) {
		throw new TypeError(`Cannot set property size of #<EdgeMember> which has only a getter`);
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
			abs(pointCenter1Mouse.y - pointCenter1Mouse.x * pointCenter1Center2.y / pointCenter1Center2.x) < EdgeMember.#width / 2 &&
			VertexMember.diameter / 2 < distanceCenter1Mouse && distanceCenter1Mouse < distanceCenter1Center2 &&
			VertexMember.diameter / 2 < distanceCenter1Mouse && distanceCenter1Mouse < distanceCenter1Center2
		);
	}
}
//#endregion
//#region Canvas
await window.load(Promise.fulfill(() => {
	userInterface.addEventListener(`click`, (event) => {
		if (!inputVertexTool.checked) return;
		VertexMember.tryAttachAt(event.position);
	});

	buttonCaptureCanvas.addEventListener(`click`, async () => await window.ensure(() => {
		canvas.toBlob((blob) => {
			if (blob === null) throw new ReferenceError(`Unable to initialize canvas for capture`);
			navigator.download(new File([blob], `${Date.now()}.png`));
		});
	}));
}), 200, 1000);
//#endregion