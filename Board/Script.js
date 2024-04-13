"use strict";

import { Entity } from "../Scripts/Components/Entity.js";
import { userInterface } from "../Scripts/Components/InterfaceItem.js";
import { canvas, context } from "../Scripts/Components/Node.js";
import { Renderer } from "../Scripts/Components/Utilities.js";
import { Point2D } from "../Scripts/Modules/Measures.js";
import { Color } from "../Scripts/Modules/Palette.js";
import { Graph } from "../Scripts/Structure.js";

const { min, abs, hypot, PI } = Math;

try {
	const colorBackground = Color.tryParse(getComputedStyle(document.body).getPropertyValue(`--color-background`)) ?? (() => {
		throw new EvalError(`Unable to parse background color`);
	})();
	const colorForeground = Color.tryParse(getComputedStyle(document.body).getPropertyValue(`--color-foreground`)) ?? (() => {
		throw new EvalError(`Unable to parse foreground color`);
	})();

	//#region Definition
	const inputVerticeTool = document.getElement(HTMLInputElement, `input#vertice-tool`);
	const inputEdgeTool = document.getElement(HTMLInputElement, `input#edge-tool`);
	const buttonCaptureCanvas = document.getElement(HTMLButtonElement, `button#capture-canvas`);
	//#endregion

	const graph = new Graph();

	//#region Binding event
	/**
	 * @typedef VirtualBindingEventInit
	 * @property {VerticeEntity} other
	 * 
	 * @typedef {EventInit & VirtualBindingEventInit} BindingEventInit
	 */

	class BindingEvent extends Event {
		/**
		 * @param {string} type 
		 * @param {BindingEventInit} dict 
		 */
		constructor(type, dict) {
			super(type, dict);
			this.#other = dict.other;
		}
		/** @type {VerticeEntity} */
		#other;
		/** @readonly */
		get other() {
			return this.#other;
		}
	}
	//#endregion
	//#region Vertice entity
	/**
	 * @typedef VirtualVerticeEntityEventMap
	 * @property {BindingEvent} link
	 * @property {BindingEvent} unlink
	 * 
	 * @typedef {import("../Scripts/Components/Entity.js").EntityEventMap & VirtualVerticeEntityEventMap} VerticeEntityEventMap
	 */

	class VerticeEntity extends Entity {
		/** @type {VerticeEntity[]} */
		static #instances = [];
		/**
		 * @param {Readonly<Point2D>} point 
		 * @param {VerticeEntity?} exception
		 * @returns {boolean}
		 */
		static canPlaceAt(point, exception = null) {
			for (const entityVertice of VerticeEntity.#instances) {
				if (entityVertice === exception) continue;
				const { x, y } = entityVertice.position;
				if (hypot(point.x - x, point.y - y) < VerticeEntity.diameter) return false;
			}
			return true;
		}
		/**
		 * @param {Readonly<Point2D>} point 
		 * @param {VerticeEntity?} exception
		 * @returns {VerticeEntity?}
		 */
		static getVerticleAt(point, exception = null) {
			for (const entityVertice of VerticeEntity.#instances) {
				if (entityVertice === exception) continue;
				if (entityVertice.isMesh(point)) return entityVertice;
			}
			return null;
		}
		/** @type {number} */
		static #diameter = min(canvas.width, canvas.height) / 32;
		static get diameter() {
			return this.#diameter;
		}
		static set diameter(value) {
			this.#diameter = value;
		}
		static {
			window.addEventListener(`resize`, () => {
				this.diameter = min(canvas.width, canvas.height) / 32;
			});
		}
		/**
		 * @param {string} name 
		 */
		constructor(name = `Vertice entity`) {
			super(name);
			//#region Behavior
			this.addEventListener(`connect`, () => {
				this.#index = VerticeEntity.#instances.push(this) - 1;
				this.name = `${this.name}-${this.#index}`;
				graph.addVertice();
			});
			this.addEventListener(`disconnect`, () => {
				VerticeEntity.#instances.splice(this.#index, 1);
				for (let index = this.#index; index < VerticeEntity.#instances.length; index++) {
					const vertice = VerticeEntity.#instances[index];
					vertice.#index--;
					vertice.name = `${vertice.name}-${vertice.#index}`;
				}
				graph.removeVertice(this.#index);
			});

			this.addEventListener(`render`, () => {
				context.save();
				context.fillStyle = colorForeground.invert().toString(true);
				const { position: position } = this;
				context.beginPath();
				context.arc(position.x, position.y, VerticeEntity.diameter / 2, 0, 2 * PI);
				context.closePath();
				context.fill();
				context.restore();
			});
			//#endregion
			//#region Vertice control
			this.addEventListener(`click`, () => {
				if (!inputVerticeTool.checked) return;
				userInterface.children.remove(this);
			});
			/** @type {Readonly<Point2D>} */
			let pointInitialPosition;
			this.addEventListener(`dragbegin`, (event) => {
				if (!inputVerticeTool.checked) return;
				pointInitialPosition = event.position;
			});
			this.addEventListener(`drag`, (event) => {
				if (!inputVerticeTool.checked) return;
				this.position = event.position;
			});
			this.addEventListener(`dragend`, (event) => {
				if (!inputVerticeTool.checked) return;
				if (VerticeEntity.canPlaceAt(event.position, this)) return;
				this.position = pointInitialPosition;
			});
			//#endregion
			//#region Edge generation
			/** @type {EdgeEntity} */
			let edgeNewInstance;
			this.addEventListener(`dragbegin`, (event) => {
				if (!inputEdgeTool.checked) return;
				edgeNewInstance = new EdgeEntity();
				edgeNewInstance.addEventListener(`click`, async (event) => {
					if (!inputEdgeTool.checked) return;
					try {
						if (edgeNewInstance.from === null) return;
						if (edgeNewInstance.to === null) return;
						graph.removeEdge(edgeNewInstance.from.#index, edgeNewInstance.to.#index);
						userInterface.children.remove(edgeNewInstance);
					} catch (error) {
						await window.stabilize(Error.generate(error));
					}
				});
				userInterface.children.add(edgeNewInstance);
				edgeNewInstance.from = this;
			});
			this.addEventListener(`drag`, (event) => {
				if (!inputEdgeTool.checked) return;
				if (edgeNewInstance.from === null) return;
				const { position: pointFromPosition } = edgeNewInstance.from;
				const pointToPosition = event.position;
				edgeNewInstance.position = pointFromPosition["+"](pointToPosition)["/"](Point2D.CONSTANT_DOUBLE);
				edgeNewInstance.size = new Point2D(abs(pointToPosition.x - pointFromPosition.x), abs(pointToPosition.y - pointFromPosition.y));
			});
			this.addEventListener(`dragend`, (event) => {
				if (!inputEdgeTool.checked) return;
				if (edgeNewInstance.from === null) return;
				const verticleEntityTo = VerticeEntity.getVerticleAt(event.position);
				if (verticleEntityTo === null) {
					edgeNewInstance.from = null;
					userInterface.children.remove(edgeNewInstance);
				} else {
					try {
						graph.addEdge(edgeNewInstance.from.#index, verticleEntityTo.#index);
						edgeNewInstance.to = verticleEntityTo;
						const { position: pointFromPosition } = edgeNewInstance.from;
						const { position: pointToPosition } = edgeNewInstance.to;
						edgeNewInstance.position = pointFromPosition["+"](pointToPosition)["/"](Point2D.CONSTANT_DOUBLE);
						edgeNewInstance.size = new Point2D(abs(pointToPosition.x - pointFromPosition.x), abs(pointToPosition.y - pointFromPosition.y));
					} catch (error) {
						userInterface.children.remove(edgeNewInstance);
					}
				}
			});
			//#endregion
		}
		/** @type {number} */
		#index;
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
		/**
		 * @param {Readonly<Point2D>} point 
		 * @returns {boolean}
		 */
		isMesh(point) {
			const { x, y } = this.position;
			return (hypot(point.x - x, point.y - y) <= VerticeEntity.diameter / 2);
		}
		get size() {
			return super.size;
		}
		set size(value) {
			throw new TypeError(`Cannot set property position of #<VerticeEntity> which has only a getter`);
		}
	}
	//#endregion

	//#region Edge entity
	/**
	 * @typedef VirtualEdgeEntityEventMap
	 * @property {Event} link
	 * @property {Event} unlink
	 * 
	 * @typedef {import("../Scripts/Components/Entity.js").EntityEventMap & VirtualEdgeEntityEventMap} EdgeEntityEventMap
	 */

	class EdgeEntity extends Entity {
		/**
		 * @param {string} name 
		 */
		constructor(name = `Edge entity`) {
			super(name);
			//#region Behavior
			this.addEventListener(`disconnect`, (event) => {
				this.from = null;
				this.to = null;
			});
			this.addEventListener(`render`, (event) => {
				if (this.from === null) return;
				if (this.to === null) return;
				context.save();
				context.beginPath();
				context.fillStyle = Color.RED.toString(true);
				context.strokeStyle = Color.RED.toString(true);
				const { x: xFrom, y: yFrom } = this.from.position;
				const { x: xTo, y: yTo } = this.to.position;
				const radius = VerticeEntity.diameter / 2;
				context.lineWidth = radius;
				context.moveTo(xFrom, yFrom);
				context.lineTo(xTo, yTo);
				context.closePath();
				context.stroke();
				context.fill();
				context.restore();
				Renderer.markArea(this);
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
		/** @type {VerticeEntity?} */
		#from = null;
		get from() {
			return this.#from;
		}
		/**
		 * @todo Fix edge link-unlink events
		 */
		set from(value) {
			if (this.#from === value) return;
			if (this.#from !== null && this.#to !== null) {
				this.#from.dispatchEvent(new BindingEvent(`unlink`, { other: this.#to }));
				this.#to.dispatchEvent(new BindingEvent(`unlink`, { other: this.#from }));
				this.dispatchEvent(new Event(`unlink`));
			}
			this.#from = value;
			if (this.#from !== null && this.#to !== null) {
				this.#from.dispatchEvent(new BindingEvent(`link`, { other: this.#to }));
				this.#to.dispatchEvent(new BindingEvent(`link`, { other: this.#from }));
				this.dispatchEvent(new Event(`link`));
			}
		}
		/** @type {VerticeEntity?} */
		#to = null;
		get to() {
			return this.#to;
		}
		set to(value) {
			if (this.#to === value) return;
			if (this.#from !== null && this.#to !== null) {
				this.#from.dispatchEvent(new BindingEvent(`unlink`, { other: this.#to }));
				this.#to.dispatchEvent(new BindingEvent(`unlink`, { other: this.#from }));
				this.dispatchEvent(new Event(`unlink`));
			}
			this.#to = value;
			if (this.#from !== null && this.#to !== null) {
				this.#from.dispatchEvent(new BindingEvent(`link`, { other: this.#to }));
				this.#to.dispatchEvent(new BindingEvent(`link`, { other: this.#from }));
				this.dispatchEvent(new Event(`link`));
			}
		}
	}
	//#endregion

	await window.load(Promise.fulfill(() => { }), 200, 1000);

	//#region Canvas
	//#region Vertice drawing
	userInterface.addEventListener(`click`, (event) => {
		if (!inputVerticeTool.checked) return;
		if (!VerticeEntity.canPlaceAt(event.position)) return;
		const verticeNewInstance = new VerticeEntity();
		verticeNewInstance.position = event.position;
		userInterface.children.add(verticeNewInstance);
	});
	//#endregion
	//#region Edge drawing

	//#endregion
	//#endregion

	buttonCaptureCanvas.addEventListener(`click`, async () => {
		try {
			canvas.toBlob((blob) => {
				if (blob === null) throw new ReferenceError(`Unable to initialize canvas for capture`);
				navigator.download(new File([blob], `${Date.now()}.png`));
			});
		} catch (error) {
			await window.stabilize(Error.generate(error));
		}
	});
} catch (error) {
	await window.stabilize(Error.generate(error));
}
