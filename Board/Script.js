/** @typedef {import("../Scripts/Components/Entity.js").EntityEventMap} EntityEventMap */

"use strict";

import { Entity } from "../Scripts/Components/Entity.js";
import { userInterface } from "../Scripts/Components/InterfaceItem.js";
import { PointerEvent, canvas, context, progenitor } from "../Scripts/Components/Node.js";
import { Point2D } from "../Scripts/Modules/Measures.js";
import { Color } from "../Scripts/Modules/Palette.js";
import { Graph } from "../Scripts/Structure.js";

const { min, hypot, PI } = Math;

try {
	const colorBackground = Color.tryParse(getComputedStyle(document.body).getPropertyValue(`--color-background`)) ?? (() => {
		throw new EvalError(`Unable to parse background color`);
	})();
	const colorForeground = Color.tryParse(getComputedStyle(document.body).getPropertyValue(`--color-foreground`)) ?? (() => {
		throw new EvalError(`Unable to parse foreground color`);
	})();
	const graph = new Graph();
	/**
	 * @todo Remove before production
	 */
	Reflect.set(window, `graph`, graph);

	//#region Definition
	const inputVerticeTool = document.getElement(HTMLInputElement, `input#vertice-tool`);
	const inputEdgeTool = document.getElement(HTMLInputElement, `input#edge-tool`);
	const buttonCaptureCanvas = document.getElement(HTMLButtonElement, `button#capture-canvas`);
	//#endregion
	//#region Link event
	/**
	 * @typedef VirtualLinkEventInit
	 * @property {VerticeEntity} vertice
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
			this.#vertice = dict.vertice;
			this.#edge = dict.edge;
		}
		/** @type {VerticeEntity} */
		#vertice;
		/**
		 * @readonly
		 * @returns {VerticeEntity}
		 */
		get vertice() {
			return this.#vertice;
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
	//#endregion
	//#region Vertice entity
	/**
	 * @typedef VirtualVerticeEntityEventMap
	 * @property {LinkEvent} link
	 * @property {LinkEvent} unlink
	 * 
	 * @typedef {EntityEventMap & VirtualVerticeEntityEventMap} VerticeEntityEventMap
	 */

	class VerticeEntity extends Entity {
		/** @type {VerticeEntity[]} */
		static #members = [];
		/** @type {number} */
		static #diameter = min(canvas.width, canvas.height) / 32;
		static {
			window.addEventListener(`resize`, (event) => {
				VerticeEntity.#diameter = min(canvas.width, canvas.height) / 32;
			});
		}
		/**
		 * @param {Readonly<Point2D>} point 
		 * @param {VerticeEntity?} exception 
		 * @returns {boolean}
		 */
		static #canPlaceAt(point, exception = null) {
			for (const vertice of VerticeEntity.#members) {
				if (vertice === exception) continue;
				if (hypot(...point["-"](vertice.position)) < VerticeEntity.#diameter) return false;
			}
			return true;
		}
		/**
		 * @todo Invalid logicial implementation. Do not use "isMesh" except implementation.
		 * @param {Readonly<Point2D>} point 
		 * @returns {VerticeEntity?}
		 */
		static getMemberAt(point) {
			for (const vertice of VerticeEntity.#members) {
				if (vertice.isMesh(point)) return vertice;
			}
			return null;
		}
		/** @type {boolean} */
		static #locked = true;
		/**
		 * @param {Readonly<Point2D>} point 
		 * @returns {VerticeEntity}
		 */
		static tryPlaceAt(point) {
			if (!VerticeEntity.#canPlaceAt(point)) throw new EvalError(`Unable to place at ${point.toFixed()}, 'cause there is already a vertice nearby.`);
			this.#locked = false;
			const vertice = new VerticeEntity();
			this.#locked = true;
			vertice.position = point;
			progenitor.children.add(vertice);
			return vertice;
		}
		/**
		 * @param {string} name 
		 */
		constructor(name = `Vertice entity`) {
			super(name);
			if (VerticeEntity.#locked) throw new TypeError(`Illegal constructor`);

			//#region Behavior
			this.addEventListener(`connect`, (event) => {
				this.#index = VerticeEntity.#members.push(this) - 1;
				graph.addVertice();
			});
			this.addEventListener(`disconnect`, (event) => {
				VerticeEntity.#members.splice(this.#index, 1);
				for (let index = this.#index; index < VerticeEntity.#members.length; index++) {
					const vertice = VerticeEntity.#members[index];
					vertice.#index--;
				}
				graph.removeVertice(this.#index);
				for (const edge of this.#connections) {
					edge.dispatchEvent(new LinkEvent(`unlink`, { vertice: this, edge: edge }));
				}
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
				context.arc(position.x, position.y, VerticeEntity.#diameter / 2, 0, 2 * PI);
				context.closePath();
				context.fill();
				context.restore();
			});
			//#endregion
			//#region Vertice control
			this.addEventListener(`click`, (event) => {
				if (!inputVerticeTool.checked) return;
				progenitor.children.remove(this);
			});
			/**
			 * @todo Fix position change. Fix engine for that.
			 */
			this.addEventListener(`dragbegin`, (event) => {
				if (!inputVerticeTool.checked) return;
				this.#setMoveState(event.position);
			});
			//#endregion
			//#region Edge control
			this.addEventListener(`dragbegin`, (event) => {
				if (!inputEdgeTool.checked) return;
				EdgeEntity.tryLinkThe(this);
			});

			this.addEventListener(`link`, (event) => {
				console.log(`${this.name}: ${event.type}`);
			});
			this.addEventListener(`unlink`, (event) => {
				console.log(`${this.name}: ${event.type}`);
			});
			//#endregion
		}
		/**
		 * @template {keyof VerticeEntityEventMap} K
		 * @param {K} type 
		 * @param {(this: VerticeEntity, ev: VerticeEntityEventMap[K]) => any} listener 
		 * @param {boolean | AddEventListenerOptions} options
		 * @returns {void}
		 */
		addEventListener(type, listener, options = false) {
			// @ts-ignore
			return super.addEventListener(type, listener, options);
		}
		/**
		 * @template {keyof VerticeEntityEventMap} K
		 * @param {K} type 
		 * @param {(this: VerticeEntity, ev: VerticeEntityEventMap[K]) => any} listener 
		 * @param {boolean | EventListenerOptions} options
		 * @returns {void}
		 */
		removeEventListener(type, listener, options = false) {
			// @ts-ignore
			return super.addEventListener(type, listener, options);
		}
		/** @type {number} */
		#index;
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
		/** @type {Set<EdgeEntity>} */
		#connections = new Set();
		/**
		 * @returns {Readonly<Point2D>}
		 */
		get size() {
			return Point2D.repeat(VerticeEntity.#diameter);
		}
		/**
		 * @param {Readonly<Point2D>} value 
		 * @returns {void}
		 */
		set size(value) {
			throw new TypeError(`Cannot set property position of #<VerticeEntity> which has only a getter`);
		}
		/**
		 * @param {Readonly<Point2D>} point 
		 * @returns {boolean}
		 */
		isMesh(point) {
			return (hypot(...point["-"](this.position)) <= VerticeEntity.#diameter / 2);
		}
		/**
		 * @param {Readonly<Point2D>} point 
		 * @returns {boolean}
		 */
		#canMoveAt(point) {
			return VerticeEntity.#canPlaceAt(point, this);
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
	}
	//#endregion
	//#region Edge entity
	class VerticeSocket {
		/**
		 * @param {EdgeEntity} edge 
		 */
		constructor(edge) {
			this.#edge = edge;
		}
		/** @type {EdgeEntity} */
		#edge;
		/** @type {VerticeEntity?} */
		#data = null;
		/**
		 * @returns {VerticeEntity?}
		 */
		get data() {
			return this.#data;
		}
		/**
		 * @param {VerticeEntity?} value 
		 * @returns {void}
		 */
		set data(value) {
			if (value === null) {
				if (this.#data === null) return;
				const edge = this.#edge;
				const vertice = this.#data;
				this.#data = null;
				vertice.dispatchEvent(new LinkEvent(`unlink`, { vertice: vertice, edge: edge }));
			}
			if (value !== null) {
				if (this.#data !== null) return;
				const edge = this.#edge;
				const vertice = value;
				this.#data = vertice;
				vertice.dispatchEvent(new LinkEvent(`link`, { vertice: vertice, edge: edge }));
			}
		}
	};

	/**
	 * @enum {string}
	 */
	const EdgeSelections = {
		/** @readonly */ from: `from`,
		/** @readonly */ to: `to`,
	};
	Object.freeze(EdgeSelections);

	/**
	 * @typedef VirtualEdgeEntityEventMap
	 * @property {LinkEvent} link
	 * @property {LinkEvent} unlink
	 * 
	 * @typedef {EntityEventMap & VirtualEdgeEntityEventMap} EdgeEntityEventMap
	 */

	class EdgeEntity extends Entity {
		/** @type {boolean} */
		static #locked = true;
		/**
		 * @param {VerticeEntity} vertice 
		 * @returns {void}
		 */
		static tryLinkThe(vertice) {
			this.#locked = false;
			const edge = new EdgeEntity();
			this.#locked = true;
			progenitor.children.add(edge);
			edge.#from = vertice;
			const controller = new AbortController();
			vertice.addEventListener(`dragend`, (event) => {
				const target = VerticeEntity.getMemberAt(event.position);
				if (target === null) {
					progenitor.children.remove(edge);
				}
				edge.#to = target;
				edge.dispatchEvent(new Event(`link`));
				controller.abort();
			}, { signal: controller.signal });
		}
		/** @type {Readonly<Point2D>} */
		static #pointPointerPosition = Object.freeze(Point2D.repeat(NaN));
		static {
			progenitor.addEventListener(`pointermove`, (event) => {
				EdgeEntity.#pointPointerPosition = event.position;
			});
		}
		/**
		 * @param {string} name 
		 */
		constructor(name = `Edge entity`) {
			super(name);
			if (EdgeEntity.#locked) throw new TypeError(`Illegal constructor`);

			//#region Behavior
			// this.addEventListener(`unlink`, (event) => {
			// 	progenitor.children.remove(this);
			// 	const [socketCurrent, socketOther] = this.#orderSocketsBy(event.vertice);
			// 	socketCurrent.data = null;
			// 	const vertice = socketOther.data;
			// 	if (vertice === null) return;
			// 	vertice.dispatchEvent(new LinkEvent(`unlink`, { vertice: vertice, edge: this }));
			// });

			this.addEventListener(`render`, () => {
				context.save();
				context.strokeStyle = colorForeground.invert().toString(true);
				const verticeFrom = this.#from;
				const verticeTo = this.#to;
				const pointFrom = (verticeFrom === null ? EdgeEntity.#pointPointerPosition : verticeFrom.position);
				const pointTo = (verticeTo === null ? EdgeEntity.#pointPointerPosition : verticeTo.position);
				context.beginPath();
				context.moveTo(pointFrom.x, pointFrom.y);
				context.lineTo(pointTo.x, pointTo.y);
				context.closePath();
				context.stroke();
				context.restore();
			});
			//#endregion
			//#region Edge control
			this.addEventListener(`link`, (event) => {
				console.log(`${this.name}: ${event.type}`);
			});
			this.addEventListener(`unlink`, (event) => {
				console.log(`${this.name}: ${event.type}`);
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
		// /** @type {VerticeSocket} */
		// #from = new VerticeSocket(this);
		// /** @type {VerticeSocket} */
		// #to = new VerticeSocket(this);
		/** @type {VerticeEntity?} */
		#from = null;
		/** @type {VerticeEntity?} */
		#to = null;
		// /**
		//  * @param {VerticeEntity} vertice 
		//  * @returns {[VerticeSocket, VerticeSocket]}
		//  */
		// #orderSocketsBy(vertice) {
		// 	const socketFrom = this.#from;
		// 	const socketTo = this.#to;
		// 	if (socketFrom.data === vertice) {
		// 		return [socketFrom, socketTo];
		// 	} else if (socketTo.data === vertice) {
		// 		return [socketTo, socketFrom];
		// 	} else throw new ReferenceError(`Unabel to find vertice '${vertice.name}' in sockets`);
		// }
	}
	//#endregion
	//#region Canvas
	userInterface.addEventListener(`click`, async (event) => {
		if (!inputVerticeTool.checked) return;
		try {
			VerticeEntity.tryPlaceAt(event.position);
		} catch (error) {
			/**
			 * @todo Maybe useless.
			 */
			console.log(Error.generate(error));
		}
	});

	buttonCaptureCanvas.addEventListener(`click`, async () => {
		try {
			/**
			 * @todo Change downloading type to link.
			 */
			canvas.toBlob((blob) => {
				if (blob === null) throw new ReferenceError(`Unable to initialize canvas for capture`);
				navigator.download(new File([blob], `${Date.now()}.png`));
			});
		} catch (error) {
			await window.stabilize(Error.generate(error));
		}
	});
	//#endregion
} catch (error) {
	await window.stabilize(Error.generate(error));
}
