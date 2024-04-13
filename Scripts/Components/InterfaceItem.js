/** @typedef {import("./Entity.js").EntityEventMap} EntityEventMap */

"use strict";

import { Point2D } from "../Modules/Measures.js";
import { Entity } from "./Entity.js";
import { canvas, progenitor } from "./Node.js";

//#region Interface item
/**
 * @typedef {{}} VirtualInterfaceItemEventMap
 * 
 * @typedef {EntityEventMap & VirtualInterfaceItemEventMap} InterfaceItemEventMap
 */

/**
 * Represents an interface item in the virtual tree structure.
 */
class InterfaceItem extends Entity {
	/**
	 * @param {string} name The name of the interface item.
	 */
	constructor(name = `Interface item`) {
		super(name);
	}
	/**
	 * @template {keyof InterfaceItemEventMap} K
	 * @param {K} type 
	 * @param {(this: InterfaceItem, ev: InterfaceItemEventMap[K]) => any} listener 
	 * @param {boolean | AddEventListenerOptions} options
	 * @returns {void}
	 */
	addEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/**
	 * @template {keyof InterfaceItemEventMap} K
	 * @param {K} type 
	 * @param {(this: InterfaceItem, ev: InterfaceItemEventMap[K]) => any} listener 
	 * @param {boolean | EventListenerOptions} options
	 * @returns {void}
	 */
	removeEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/** @type {Point2D} */
	#anchor = Point2D.ZERO;
	/**
	 * Gets the anchor point of the interface item.
	 * @returns {Readonly<Point2D>}
	 */
	get anchor() {
		return Object.freeze(this.#anchor["*"](Point2D.CONSTANT_DOUBLE));
	}
	/**
	 * Sets the anchor point of the interface item.
	 * @param {Readonly<Point2D>} value The new anchor point.
	 * @returns {void}
	 */
	set anchor(value) {
		if (-1 > this.#anchor.x || this.#anchor.x > 1) throw new RangeError(`Anchor ${this.anchor} is out of range [(-1, -1) - (1, 1)]`);
		if (-1 > this.#anchor.y || this.#anchor.y > 1) throw new RangeError(`Anchor ${this.anchor} is out of range [(-1, -1) - (1, 1)]`);
		this.#anchor = value["/"](Point2D.CONSTANT_DOUBLE);
	}
	/**
	 * Gets the global position of the interface item.
	 * @returns {Readonly<Point2D>}
	 */
	get position() {
		let result = super.position.clone();
		try {
			if (this.parent instanceof Entity) {
				result = result["+"](this.parent.size["*"](this.#anchor));
				result = result["-"](this.size["*"](this.#anchor));
			}
		} catch { }
		return Object.freeze(result);
	}
	/**
	 * Sets the global position of the interface item.
	 * @param {Readonly<Point2D>} value The new position.
	 * @returns {void}
	 */
	set position(value) {
		let result = value;
		try {
			if (this.parent instanceof Entity) {
				result = result["-"](this.parent.size["*"](this.#anchor));
				result = result["+"](this.size["*"](this.#anchor));
			}
		} catch { }
		super.position = result;
	}
}
//#endregion
//#region User interface
/**
 * @typedef {{}} VirtualUserInterfaceEventMap
 * 
 * @typedef {InterfaceItemEventMap & VirtualUserInterfaceEventMap} UserInterfaceEventMap
 */

/**
 * Represents a user interface in the virtual tree structure.
 */
class UserInterface extends InterfaceItem {
	/**
	 * @param {string} name The name of the user interface.
	 */
	constructor(name = `User interface`) {
		super(name);
		super.size = new Point2D(canvas.width, canvas.height);
		window.addEventListener(`resize`, (event) => {
			super.size = new Point2D(canvas.width, canvas.height);
		});
		this.addEventListener(`tryadopt`, (event) => {
			if (event.node !== progenitor) {
				event.preventDefault();
				throw new EvalError(`User interface can be adopted only by Progenitor`);
			}
		});
	}
	/**
	 * @template {keyof UserInterfaceEventMap} K
	 * @param {K} type 
	 * @param {(this: UserInterface, ev: UserInterfaceEventMap[K]) => any} listener 
	 * @param {boolean | AddEventListenerOptions} options
	 * @returns {void}
	 */
	addEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/**
	 * @template {keyof UserInterfaceEventMap} K
	 * @param {K} type 
	 * @param {(this: UserInterface, ev: UserInterfaceEventMap[K]) => any} listener 
	 * @param {boolean | EventListenerOptions} options
	 * @returns {void}
	 */
	removeEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/**
	 * Gets the local location of the user interface.
	 * @readonly
	 * @returns {Readonly<Point2D>}
	 */
	get location() {
		return super.location;
	}
	set location(value) {
		throw new TypeError(`Cannot set property position of #<UserInterface> which has only a getter`);
	}
	/**
	 * Gets the global position of the user interface.
	 * @readonly
	 * @returns {Readonly<Point2D>}
	 */
	get position() {
		return super.position;
	}
	set position(value) {
		throw new TypeError(`Cannot set property position of #<UserInterface> which has only a getter`);
	}
	/**
	 * Gets the size of the user interface.
	 * @readonly
	 * @returns {Readonly<Point2D>}
	 */
	get size() {
		return super.size;
	}
	set size(value) {
		throw new TypeError(`Cannot set property position of #<UserInterface> which has only a getter`);
	}
	/**
	 * Gets the anchor of the user interface.
	 * @readonly
	 * @returns {Readonly<Point2D>}
	 */
	get anchor() {
		return super.anchor;
	}
	set anchor(value) {
		throw new TypeError(`Cannot set property position of #<UserInterface> which has only a getter`);
	}
}
//#endregion

/**
 * The global user interface instance.
 * @type {UserInterface}
 */
const userInterface = new UserInterface();
progenitor.children.add(userInterface);

export { InterfaceItem, UserInterface, userInterface };