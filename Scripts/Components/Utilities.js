"use strict";

import { Color } from "../Modules/Palette.js";
import { Entity } from "./Entity.js";
import { Node, canvas, context, progenitor } from "./Node.js";

//#region Animator
/**
 * @typedef AnimatorEventMap
 * @property {Event} update
 */

/**
 * Animate events over a specified duration.
 */
class Animator extends EventTarget {
	/**
	 * @param {number} duration The duration of the animation.
	 */
	constructor(duration) {
		super();
		this.#duration = duration;
		const frameController = new AbortController();
		this.#frame = 0;
		progenitor.addEventListener(`update`, (event) => {
			if (this.#frame < this.#duration) {
				this.dispatchEvent(new Event(`update`));
				this.#frame++;
			} else {
				frameController.abort();
			}
		}, { signal: frameController.signal });
	}
	/**
	 * @template {keyof AnimatorEventMap} K
	 * @param {K} type 
	 * @param {(this: Animator, ev: AnimatorEventMap[K]) => any} listener 
	 * @param {boolean | AddEventListenerOptions} options
	 * @returns {void}
	 */
	addEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/**
	 * @template {keyof AnimatorEventMap} K
	 * @param {K} type 
	 * @param {(this: Animator, ev: AnimatorEventMap[K]) => any} listener 
	 * @param {boolean | EventListenerOptions} options
	 * @returns {void}
	 */
	removeEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/** @type {number} */
	#duration;
	/**
	 * Gets the duration of the animation.
	 * @readonly
	 * @returns {number}
	 */
	get duration() {
		return this.#duration;
	}
	/** @type {number} */
	#frame;
	/**
	 * Gets the current frame of the animation.
	 * @readonly
	 * @returns {number}
	 */
	get frame() {
		return this.#frame;
	}
}
//#endregion
//#region Walker
/**
 * Utility class for traversing and reducing nodes in a tree-like structure.
 */
class Walker {
	/**
	 * Traverse the tree downward and apply an action to each node.
	 * @param {Node} node The root node.
	 * @param {(node: Node) => any} action The action to be applied to each node.
	 * @returns {void}
	 */
	static downTraverse(node, action) {
		action(node);
		for (const child of node.children) {
			Walker.downTraverse(child, action);
		}
	}
	/**
	 * Traverse the tree upward and apply an action to each node.
	 * @param {Node} node The leaf node.
	 * @param {(node: Node) => any} action The action to be applied to each node.
	 * @returns {void}
	 */
	static upTraverse(node, action) {
		action(node);
		try {
			Walker.upTraverse(node.parent, action);
		} catch (error) { }
	}
	/**
	 * Reduce the tree downward by applying an action to each node.
	 * @template T
	 * @param {Node} root The root node.
	 * @param {(previous: T, current: Node) => T} action The action to reduce each node.
	 * @param {T} initial The initial value for reduction.
	 * @returns {T} The reduced result.
	 */
	static downReduce(root, action, initial) {
		let result = initial;
		Walker.downTraverse(root, (node) => {
			result = action(result, node);
		});
		return result;
	}
	/**
	 * Reduce the tree upward by applying an action to each node.
	 * @template T
	 * @param {Node} root The leaf node.
	 * @param {(previous: T, current: Node) => T} action The action to reduce each node.
	 * @param {T} initial The initial value for reduction.
	 * @returns {T} The reduced result.
	 */
	static upReduce(root, action, initial) {
		let result = initial;
		Walker.upTraverse(root, (node) => {
			result = action(result, node);
		});
		return result;
	}
	/**
	 * @param {Node} root The root node for traversal.
	 */
	constructor(root) {
		this.#root = root;
	}
	/** @type {Node} */
	#root;
	/**
	 * Traverse the tree downward and apply an action to each node.
	 * @param {(node: Node) => any} action The action to be applied to each node.
	 * @returns {void}
	 */
	downTraverse(action) {
		Walker.downTraverse(this.#root, action);
	}
	/**
	 * Traverse the tree upward and apply an action to each node.
	 * @param {(node: Node) => any} action The action to be applied to each node.
	 * @returns {void}
	 */
	upTraverse(action) {
		Walker.upTraverse(this.#root, action);
	}
	/**
	 * Reduce the tree downward by applying an action to each node.
	 * @template T
	 * @param {(previous: T, current: Node) => T} action The action to reduce each node.
	 * @param {T} initial The initial value for reduction.
	 * @returns {T} The reduced result.
	 */
	downReduce(action, initial) {
		return Walker.downReduce(this.#root, action, initial);
	}
	/**
	 * Reduce the tree upward by applying an action to each node.
	 * @template T
	 * @param {(previous: T, current: Node) => T} action The action to reduce each node.
	 * @param {T} initial The initial value for reduction.
	 * @returns {T} The reduced result.
	 */
	upReduce(action, initial) {
		return Walker.upReduce(this.#root, action, initial);
	}
}
//#endregion
//#region Renderer
/**
 * Utility class for rendering entities with highlighting capabilities.
 */
class Renderer {
	/** @type {Color} */
	static #colorHighlight = Color.viaHSL(308, 100, 50);
	/**
	 * Gets the color used for highlighting.
	 * @returns {Color}
	 */
	static get colorHighlight() {
		return this.#colorHighlight;
	}
	/**
	 * Sets the color used for highlighting.
	 * @param {Color} value 
	 * @returns {void}
	 */
	static set colorHighlight(value) {
		this.#colorHighlight = value;
	}
	/**
	 * Mark the area of an entity with a highlight.
	 * @param {Entity} entity The entity to highlight.
	 * @returns {void}
	 */
	static markArea(entity) {
		context.save();
		context.fillStyle = Renderer.colorHighlight.pass(0.1).toString(true);
		context.strokeStyle = Renderer.colorHighlight.toString(true);
		const { position: position, size } = entity;
		context.beginPath();
		context.moveTo(position.x - size.x / 2, position.y - size.y / 2);
		context.lineTo(position.x + size.x / 2, position.y - size.y / 2);
		context.lineTo(position.x + size.x / 2, position.y + size.y / 2);
		context.lineTo(position.x - size.x / 2, position.y + size.y / 2);
		context.closePath();
		context.stroke();
		context.fill();
		context.restore();
	}
	/**
	 * Clear the rendering canvas.
	 * @returns {void}
	 */
	static clear() {
		const { e: x, f: y } = context.getTransform();
		context.clearRect(-x, -y, canvas.width, canvas.height);
	}
}
//#endregion

export { Animator, Walker, Renderer };