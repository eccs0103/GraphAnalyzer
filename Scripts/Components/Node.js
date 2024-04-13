"use strict";

import { FastEngine, PreciseEngine } from "../Modules/Executors.js";
import { } from "../Modules/Extensions.js";
import { Point2D } from "../Modules/Measures.js";

const { min } = Math;

/**
 * Axis factors for coordinate transformation
 * @type {Readonly<Point2D>}
 */
const AXIS_FACTOR = Object.freeze(new Point2D(1, -1));

/**
 * Canvas element for display
 * @type {HTMLCanvasElement}
 */
const canvas = document.getElement(HTMLCanvasElement, `canvas#display`);
/**
 * Canvas 2D drawing context
 * @type {CanvasRenderingContext2D}
 */
const context = canvas.getContext(`2d`) ?? (() => {
	throw new TypeError(`Context is missing`);
})();
window.addEventListener(`resize`, (event) => {
	const { width, height } = canvas.getBoundingClientRect();
	canvas.width = width;
	canvas.height = height;

	const transform = context.getTransform();
	transform.e = canvas.width / 2;
	transform.f = canvas.height / 2;
	transform.c *= AXIS_FACTOR.x;
	transform.d *= AXIS_FACTOR.y;
	context.setTransform(transform);
});

//#region Modification event
/**
 * @typedef VirtualModificationEventInit
 * @property {Node} node
 * 
 * @typedef {EventInit & VirtualModificationEventInit} ModificationEventInit
 */

/**
 * Represents a modification event.
 */
class ModificationEvent extends Event {
	/**
	 * @param {string} type The type of the event.
	 * @param {ModificationEventInit} dict The initialization dictionary.
	 */
	constructor(type, dict) {
		super(type, dict);
		this.#node = dict.node;
	}
	/** @type {Node} */
	#node;
	/**
	 * @readonly
	 * @returns {Node} The node associated with the modification event.
	 */
	get node() {
		return this.#node;
	}
}
//#endregion
//#region Group
/**
 * @template {Node} T
 * Represents a group of nodes.
 */
class Group {
	/**
	 * @param {Node} owner The owner node of the group.
	 * @param {T[]} items Initial items to add to the group.
	 */
	constructor(owner, ...items) {
		this.#owner = owner;
		for (const item of items) {
			this.add(item);
		}
	}
	/** @type {Node} */
	#owner;
	/** @type {Set<T>} */
	#nodes = new Set();
	/**
	 * Adds an item to the group.
	 * @param {T} item The item to add.
	 * @returns {void}
	 */
	add(item) {
		const parent = this.#owner, child = item;
		if (!parent.dispatchEvent(new ModificationEvent(`tryadoptchild`, { node: child, cancelable: true }))) return;
		if (!child.dispatchEvent(new ModificationEvent(`tryadopt`, { node: parent, cancelable: true }))) return;
		this.#nodes.add(item);
		parent.dispatchEvent(new ModificationEvent(`adoptchild`, { node: child }));
		child.dispatchEvent(new ModificationEvent(`adopt`, { node: parent }));
	}
	/**
	 * Removes an item from the group.
	 * @param {T} item The item to remove.
	 * @returns {void}
	 */
	remove(item) {
		const parent = this.#owner, child = item;
		if (!parent.dispatchEvent(new ModificationEvent(`tryabandonchild`, { node: child, cancelable: true }))) return;
		if (!child.dispatchEvent(new ModificationEvent(`tryabandon`, { node: parent, cancelable: true }))) return;
		this.#nodes.delete(item);
		parent.dispatchEvent(new ModificationEvent(`abandonchild`, { node: child }));
		child.dispatchEvent(new ModificationEvent(`abandon`, { node: parent }));
	}
	/**
	 * Checks if an item is in the group.
	 * @param {T} item The item to check.
	 * @returns {boolean} True if the item is in the group, otherwise false.
	 */
	has(item) {
		return this.#nodes.has(item);
	}
	/**
	 * Clears all items from the group.
	 * @returns {void}
	 */
	clear() {
		for (const item of this.#nodes) {
			this.remove(item);
		}
	}
	/**
	 * Gets the number of items in the group.
	 * @returns {number} The number of items in the group.
	 */
	get size() {
		return this.#nodes.size;
	}
	/**
	 * Returns a generator that iterates over the items in the group.
	 * @returns {Generator<T>} A generator for the items in the group.
	 */
	*[Symbol.iterator]() {
		for (const item of this.#nodes) {
			yield item;
		}
		return;
	}
}
//#endregion
//#region Node
/**
 * @typedef VirtualNodeEventMap
 * @property {ModificationEvent} tryadopt
 * @property {ModificationEvent} adopt
 * @property {ModificationEvent} tryabandon
 * @property {ModificationEvent} abandon
 * @property {ModificationEvent} tryadoptchild
 * @property {ModificationEvent} adoptchild
 * @property {ModificationEvent} tryabandonchild
 * @property {ModificationEvent} abandonchild
 * @property {Event} connect
 * @property {Event} disconnect
 * @property {Event} start
 * @property {Event} update
 * @property {Event} fixedupdate
 * @property {Event} render
 * 
 * @typedef {EventListener & VirtualNodeEventMap} NodeEventMap
 */

/**
 * Represents a node in the virtual tree structure.
 */
class Node extends EventTarget {
	/**
	 * Checks if the given node is a progenitor.
	 * @param {Node} node The node to check.
	 * @returns {boolean} True if the node is a progenitor, false otherwise.
	 */
	static isProgenitor(node) {
		return node instanceof Progenitor;
	}
	/**
	 * @param {Node} target 
	 * @returns {void}
	 */
	static #adobt(target) {
		target.#depth = target.parent.#depth + 1;
		for (const child of target.children) {
			Node.#adobt(child);
		}
	}
	/**
	 * @param {Node} target 
	 * @returns {void}
	 */
	static #abandon(target) {
		for (const child of target.children) {
			Node.#abandon(child);
		}
		target.#depth = 0;
	}
	/**
	 * @param {Node} target 
	 * @returns {void}
	 */
	static #connect(target) {
		target.#isConnected = true;
		target.dispatchEvent(new Event(`connect`));
		for (const child of target.children) {
			Node.#connect(child);
		}
	}
	/**
	 * @param {Node} target 
	 * @returns {void}
	 */
	static #disconnect(target) {
		target.#isConnected = false;
		for (const child of target.children) {
			Node.#disconnect(child);
		}
		target.dispatchEvent(new Event(`disconnect`));
	}
	/**
	 * Retrieves the depth of a node in the virtual tree structure.
	 * @param {Node} node The node to get the depth for.
	 * @returns {number} The depth of the node.
	 */
	static getDepth(node) {
		return node.#depth;
	}
	/**
	 * @param {string} name The name of the node.
	 */
	constructor(name = `Node`) {
		super();
		this.name = name;

		this.addEventListener(`adoptchild`, (event) => {
			event.node.#parent = this;
		});
		this.addEventListener(`abandonchild`, (event) => {
			event.node.#parent = null;
		});

		this.addEventListener(`adopt`, (event) => {
			const peak = this.peak;
			Node.#adobt(this);
			if (Node.isProgenitor(peak) || peak.#isConnected) {
				Node.#connect(this);
			}
		});
		this.addEventListener(`abandon`, (event) => {
			Node.#disconnect(this);
			Node.#abandon(this);
		});
	}
	/**
	 * @template {keyof NodeEventMap} K
	 * @param {K} type 
	 * @param {(this: Node, ev: NodeEventMap[K]) => any} listener 
	 * @param {boolean | AddEventListenerOptions} options
	 * @returns {void}
	 */
	addEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/**
	 * @template {keyof NodeEventMap} K
	 * @param {K} type 
	 * @param {(this: Node, ev: NodeEventMap[K]) => any} listener 
	 * @param {boolean | EventListenerOptions} options
	 * @returns {void}
	 */
	removeEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/**
	 * @param {Event} event 
	 * @returns {boolean} 
	 */
	dispatchEvent(event) {
		if (!super.dispatchEvent(event)) return false;
		if (event.bubbles) {
			for (const child of this.children) {
				if (!child.dispatchEvent(event)) return false;
			}
		}
		return true;
	}
	/** @type {string} */
	#name = ``;
	/**
	 * Gets the name of the node.
	 * @returns {string} The name of the node.
	 */
	get name() {
		return this.#name;
	}
	/**
	 * Sets the name of the node.
	 * @param {string} value The new name for the node.
	 * @returns {void}
	 */
	set name(value) {
		this.#name = value;
	}
	/** @type {Node?} */
	#parent = null;
	/**
	 * Gets the parent node of the current node.
	 * @readonly
	 * @returns {Node} The parent node.
	 * @throws {ReferenceError} If the parent of the node is null.
	 */
	get parent() {
		return this.#parent ?? (() => {
			throw new ReferenceError(`Parent of '${this.name}' is null`);
		})();
	}
	/** @type {Group<Node>} */
	#children = new Group(this);
	/**
	 * Gets the children nodes of the current node.
	 * @readonly
	 * @returns {Group<Node>} The children nodes.
	 */
	get children() {
		return this.#children;
	}
	/**
	 * Gets the topmost ancestor of the node.
	 * @readonly
	 * @returns {Node} The peak node.
	 */
	get peak() {
		for (let current = (/** @type {Node} */ (this)); true;) {
			try {
				current = current.parent;
			} catch {
				return current;
			}
		}
	}
	/** @type {number} */
	#depth = 0;
	/** @type {boolean} */
	#isConnected = Node.isProgenitor(this);
	/**
	 * Gets whether the node is connected to progenitor.
	 * @returns {boolean} True if the node is connected, otherwise false.
	 */
	get isConnected() {
		return this.#isConnected;
	}
}
//#endregion

//#region Pointer event
/**
 * @typedef VirtualPointerEventInit
 * @property {Readonly<Point2D>} position
 * 
 * @typedef {EventInit & VirtualPointerEventInit} PointerEventInit
 */

/**
 * Represents a pointer event.
 */
class PointerEvent extends Event {
	/**
	 * @param {string} type The type of the event.
	 * @param {PointerEventInit} dict The event initialization dictionary.
	 */
	constructor(type, dict) {
		super(type, dict);
		this.#position = dict.position;
	}
	/** @type {Readonly<Point2D>} */
	#position;
	/**
	 * Gets the position of the pointer event.
	 * @readonly
	 * @returns {Readonly<Point2D>} The position of the pointer event.
	 */
	get position() {
		return this.#position;
	}
}
//#endregion
//#region Progenitor
/**
 * @typedef VirtualProgenitorEventMap
 * @property {PointerEvent} pointerdown
 * @property {PointerEvent} pointerup
 * @property {PointerEvent} pointermove
 * 
 * @typedef {NodeEventMap & VirtualProgenitorEventMap} ProgenitorEventMap
 */

/**
 * Represents the main node in the virtual tree structure.
 */
class Progenitor extends Node {
	/** @type {Progenitor?} */
	static #instance = null;
	/**
	 * Gets the singleton instance of Progenitor.
	 * @readonly
	 * @returns {Progenitor} The singleton instance of Progenitor.
	 */
	static get instance() {
		return Progenitor.#instance ?? (() => {
			Progenitor.#locked = false;
			Progenitor.#instance = new Progenitor();
			Progenitor.#locked = true;
			return Progenitor.#instance;
		})();
	}
	/** @type {boolean} */
	static #locked = true;
	/**
	 * @param {string} name The name of the Progenitor.
	 * @throws {TypeError} If the constructor is called directly.
	 */
	constructor(name = `Progenitor`) {
		super(name);
		if (Progenitor.#locked) throw new TypeError(`Illegal constructor`);

		//#region Initialize
		const controller = new AbortController();
		controller.signal.addEventListener(`abort`, (event) => {
			this.dispatchEvent(new Event(`start`, { bubbles: true }));
		});
		this.#engineFast.addEventListener(`start`, (event) => {
			controller.abort();
		}, { signal: controller.signal });
		this.#enginePrecise.addEventListener(`start`, (event) => {
			controller.abort();
		}, { signal: controller.signal });

		this.#engineFast.addEventListener(`update`, (event) => {
			this.dispatchEvent(new Event(`update`, { bubbles: true }));
		});
		this.#enginePrecise.addEventListener(`update`, (event) => {
			this.dispatchEvent(new Event(`fixedupdate`, { bubbles: true }));
		});
		//#endregion
		//#region Behavior
		this.addEventListener(`tryadopt`, (event) => {
			event.preventDefault();
			throw new EvalError(`Progenitor can't be adopted by any node`);
		});

		/** @type {boolean} */
		let isPointerDown = false;
		/** @type {boolean} */
		let wasPointerDown = false;
		canvas.addEventListener(`touchstart`, (event) => {
			this.#fixTouchPosition(event);
			isPointerDown = true;
		});
		canvas.addEventListener(`mousedown`, (event) => {
			if (event.button !== 0) return;
			this.#fixMousePosition(event);
			isPointerDown = true;
		});

		/** @type {boolean} */
		let isPointerUp = false;
		window.addEventListener(`touchend`, (event) => {
			if (!wasPointerDown) return;
			this.#fixTouchPosition(event);
			isPointerUp = true;
		});
		window.addEventListener(`mouseup`, (event) => {
			if (event.button !== 0 || !wasPointerDown) return;
			this.#fixMousePosition(event);
			isPointerUp = true;
		});

		/** @type {boolean} */
		let isPointerMove = false;
		window.addEventListener(`touchmove`, (event) => {
			this.#fixTouchPosition(event);
			isPointerMove = true;
		});
		window.addEventListener(`mousemove`, (event) => {
			if (event.button !== 0) return;
			this.#fixMousePosition(event);
			isPointerMove = true;
		});

		this.addEventListener(`update`, (event) => {
			if (isPointerDown) {
				this.dispatchEvent(new PointerEvent(`pointerdown`, { position: this.#pointPointerPosition }));
				wasPointerDown = true;
				isPointerDown = false;
			}
			if (isPointerUp) {
				this.dispatchEvent(new PointerEvent(`pointerup`, { position: this.#pointPointerPosition }));
				wasPointerDown = false;
				isPointerUp = false;
			}
			if (isPointerMove) {
				this.dispatchEvent(new PointerEvent(`pointermove`, { position: this.#pointPointerPosition }));
				isPointerMove = false;
			}
		});
		//#endregion
	}
	/** @type {FastEngine} */
	#engineFast = new FastEngine();
	/** @type {PreciseEngine} */
	#enginePrecise = new PreciseEngine();
	/**
	 * Gets whether the engine is launched.
	 * @returns {boolean} True if engine is launched, otherwise false.
	 */
	get launched() {
		return (this.#engineFast.launched && this.#enginePrecise.launched);
	}
	/**
	 * Sets whether the engine is launched.
	 * @param {boolean} value The new value for the launched state.
	 * @returns {void}
	 */
	set launched(value) {
		this.#engineFast.launched = value;
		this.#enginePrecise.launched = value;
	}
	/**
	 * Gets the FPS limit of the engine.
	 * @returns {number} The FPS limit
	 */
	get limit() {
		return min(this.#engineFast.limit, this.#enginePrecise.limit);
	}
	/**
	 * Sets the FPS limit of the engine.
	 * @param {number} value The new FPS limit.
	 * @returns {void}
	 */
	set limit(value) {
		this.#engineFast.limit = value;
		this.#enginePrecise.limit = value;
	}
	/**
	 * Gets the FPS of the engine.
	 * @readonly
	 * @returns {number} The FPS of the engine.
	 */
	get FPS() {
		return this.#engineFast.FPS;
	}
	/**
	 * Gets the delta time of the engine.
	 * @readonly
	 * @returns {number} The delta time of the engine.
	 */
	get delta() {
		return this.#engineFast.delta;
	}
	/**
	 * Gets the fixed FPS of the engine.
	 * @readonly
	 * @returns {number} The fixed FPS of the engine.
	 */
	get FPSFixed() {
		return this.#enginePrecise.FPS;
	}
	/**
	 * Gets the fixed delta time of the engine.
	 * @readonly
	 * @returns {number} The fixed delta time of the engine.
	 */
	get deltaFixed() {
		return this.#enginePrecise.delta;
	}
	/**
	 * @template {keyof ProgenitorEventMap} K
	 * @param {K} type 
	 * @param {(this: Progenitor, ev: ProgenitorEventMap[K]) => any} listener 
	 * @param {boolean | AddEventListenerOptions} options
	 * @returns {void}
	 */
	addEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/**
	 * @template {keyof ProgenitorEventMap} K
	 * @param {K} type 
	 * @param {(this: Progenitor, ev: ProgenitorEventMap[K]) => any} listener 
	 * @param {boolean | EventListenerOptions} options
	 * @returns {void}
	 */
	removeEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/** @type {Readonly<Point2D>} */
	#pointPointerPosition = Object.freeze(Point2D.repeat(NaN));
	/**
	 * @param {MouseEvent} event 
	 * @returns {void}
	 */
	#fixMousePosition(event) {
		const { clientX: x, clientY: y } = event;
		const pointClientPosition = new Point2D(x, y);
		const { x: xOffset, y: yOffset, width, height } = canvas.getBoundingClientRect();
		const pointCanvasOffset = new Point2D(-xOffset - width / 2, -yOffset - height / 2);
		this.#pointPointerPosition = Object.freeze(pointClientPosition["+"](pointCanvasOffset)["*"](AXIS_FACTOR));
	}
	/**
	 * @param {TouchEvent} event 
	 * @returns {void}
	 */
	#fixTouchPosition(event) {
		const touch = event.touches.item(0);
		if (touch === null) return;
		const { clientX: x, clientY: y } = touch;
		const pointClientPosition = new Point2D(x, y);
		const { x: xOffset, y: yOffset, width, height } = canvas.getBoundingClientRect();
		const pointCanvasOffset = new Point2D(-xOffset - width / 2, -yOffset - height / 2);
		this.#pointPointerPosition = Object.freeze(pointClientPosition["+"](pointCanvasOffset)["*"](AXIS_FACTOR));
	}
}
//#endregion

/**
 * Singleton instance of the Progenitor class.
 * @type {Progenitor}
 */
const progenitor = Progenitor.instance;

export { canvas, context, ModificationEvent, Group, Node, PointerEvent, progenitor };