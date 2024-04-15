"use strict";

import { Entity } from "../Scripts/Components/Entity.js";
import { userInterface } from "../Scripts/Components/InterfaceItem.js";
import { canvas, context, progenitor } from "../Scripts/Components/Node.js";
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

	//#region Definition
	const inputVerticeTool = document.getElement(HTMLInputElement, `input#vertice-tool`);
	const inputEdgeTool = document.getElement(HTMLInputElement, `input#edge-tool`);
	const buttonCaptureCanvas = document.getElement(HTMLButtonElement, `button#capture-canvas`);
	//#endregion
	//#region Vertice entity
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
		/** @type {boolean} */
		static #locked = true;
		/**
		 * @param {Readonly<Point2D>} point 
		 * @returns {void}
		 */
		static tryPlaceAt(point) {
			if (!VerticeEntity.#canPlaceAt(point)) return;
			this.#locked = false;
			const vertice = new VerticeEntity();
			vertice.position = point;
			this.#locked = true;
			progenitor.children.add(vertice);
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
				this.name = `${this.name}-${this.#index}`;
				graph.addVertice();
			});
			this.addEventListener(`disconnect`, (event) => {
				VerticeEntity.#members.splice(this.#index, 1);
				for (let index = this.#index; index < VerticeEntity.#members.length; index++) {
					const vertice = VerticeEntity.#members[index];
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
				this.#setDragState(event.position);
			});
			//#endregion

			// console.log(VerticeEntity.#members);
		}
		/** @type {number} */
		#index;
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
		#setDragState(position) {
			const controller = new AbortController();
			this.addEventListener(`drag`, (event) => {
				super.position = event.position;
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
	class EdgeEntity extends Entity {
		/**
		 * @param {string} name 
		 */
		constructor(name = `Edge entity`) {
			super(name);
		}
	}
	//#endregion
	//#region Canvas
	userInterface.addEventListener(`click`, async (event) => {
		if (!inputVerticeTool.checked) return;
		try {
			VerticeEntity.tryPlaceAt(event.position);
		} catch (error) {
			await window.stabilize(Error.generate(error));
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
