/** @typedef {import("./Node.js").NodeEventMap} NodeEventMap */

"use strict";

import { Group, Node, PointerEvent, progenitor } from "./Node.js";
import { Point2D } from "../Modules/Measures.js";

const { atan2, hypot, PI } = Math;

//#region Data pair
/**
 * Represents a key-value pair.
 * @template K
 * @template V
 */
class DataPair {
	/**
	 * @param {NonNullable<K>} key The key of the pair.
	 * @param {V} value The value of the pair.
	 */
	constructor(key, value) {
		this.#key = key;
		this.#value = value;
	}
	/** @type {NonNullable<K>} */
	#key;
	/**
	 * Gets the key of the data pair.
	 * @readonly
	 * @returns {NonNullable<K>} The key of the pair.
	 */
	get key() {
		return this.#key;
	}
	/** @type {V} */
	#value;
	/**
	 * Gets the value of the data pair.
	 * @returns {V} The value of the pair.
	 */
	get value() {
		return this.#value;
	}
	/**
	 * Sets the value of the data pair.
	 * @param {V} value The new value to set.
	 * @returns {void}
	 */
	set value(value) {
		this.#value = value;
	}
}
//#endregion
//#region Ordered set
/**
 * Represents a set with ordered items based on their importance.
 * @template T
 */
class OrderedSet {
	/**
	 * @param  {T[]} items The items to add to the set.
	 */
	constructor(...items) {
		for (const item of items) {
			this.add(item);
		}
	}
	/** @type {DataPair<number, T>[]} */
	#pairs = [];
	/**
	 * Gets the size of the ordered set.
	 * @readonly
	 * @returns {number} The size of the set.
	 */
	get size() {
		return this.#pairs.length;
	}
	/**
	 * Adds an item to the ordered set with the specified importance.
	 * @param {T} item The item to add.
	 * @param {number} importance The importance of the item.
	 * @returns {void}
	 */
	add(item, importance = 0) {
		let place = 0;
		for (let index = this.size; index > 0; index--) {
			if (
				(this.#pairs[index - 1].key > importance) &&
				(index < this.size ? importance >= this.#pairs[index].key : true)
			) {
				place = index;
				break;
			}
		}
		this.#pairs.splice(place, 0, new DataPair(importance, item));
	}
	/**
	 * Checks if the ordered set contains the specified item.
	 * @param {T} item The item to check.
	 * @returns {boolean} True if the set contains the item, otherwise false.
	 */
	has(item) {
		return this.#pairs.find((pair) => pair.value === item) !== undefined;
	}
	/**
	 * Deletes the specified item from the ordered set.
	 * @param {T} item The item to delete.
	 * @returns {void}
	 */
	delete(item) {
		const index = this.#pairs.findIndex((pair) => pair.value === item);
		if (index < 0) return;
		this.#pairs.splice(index, 1);
	}
	/**
	 * Clears all items from the ordered set.
	 * @returns {void}
	 */
	clear() {
		this.#pairs.splice(0, this.size);
	}
	/**
	 * Returns a generator that iterates through the items in the ordered set.
	 * @returns {Generator<T, void>} A generator for the items in the set.
	 */
	*[Symbol.iterator]() {
		for (const pair of this.#pairs) {
			yield pair.value;
		}
	}
}
//#endregion
//#region Tape
/**
 * Represents a tape used for iterating over a generator.
 * @template T
 */
class Tape {
	/**
	 * @param {Generator<T>} generator The generator to use.
	 */
	constructor(generator) {
		this.#generator = generator;
		this.next();
	}
	/** @type {Generator<T>} */
	#generator;
	/** @type {T?} */
	#value;
	/**
	 * Gets the current value from the tape.
	 * @readonly
	 * @returns {T?} The current value.
	 */
	get value() {
		return this.#value;
	}
	/**
	 * Moves to the next value in the tape.
	 * @returns {void}
	 */
	next() {
		const { done, value } = this.#generator.next();
		this.#value = (done ? null : value);
	}
	/**
	 * Returns a generator that iterates through the values in the tape.
	 * @returns {Generator<T, void>} A generator for the values in the tape.
	 */
	*[Symbol.iterator]() {
		for (const iterator of this.#generator) {
			yield iterator;
		}
	}
}
//#endregion
//#region Entity
/**
 * @typedef VirtualEntityEventMap
 * @property {PointerEvent} click
 * @property {PointerEvent} hold
 * @property {PointerEvent} dragbegin
 * @property {PointerEvent} drag
 * @property {PointerEvent} dragend
 * 
 * @typedef {NodeEventMap & VirtualEntityEventMap} EntityEventMap
 */

/**
 * Represents an entity in the virtual tree structure.
 */
class Entity extends Node {
	/** @type {OrderedSet<Entity>} */
	static #instances = new OrderedSet();
	/**
	 * @param {Readonly<Point2D>} point 
	 * @returns {Generator<Entity, void>}
	 */
	static *getTargets(point) {
		for (const entity of Entity.#instances) {
			if (entity.isMesh(point)) yield entity;
		}
		return;
	}
	/** @type {number} */
	static #timeHolding = 300;
	/**
	 * Gets the holding time for the ray cast.
	 * @returns {number} The holding time in milliseconds.
	 */
	static get timeHolding() {
		return this.#timeHolding;
	}
	/**
	 * Sets the holding time for the ray cast.
	 * @param {number} value The new holding time in milliseconds.
	 * @throws {RangeError} If the value is out of range.
	 */
	static set timeHolding(value) {
		if (Number.isFinite(value) && value > 0) {
			this.#timeHolding = value;
		} else throw new RangeError(`Hold ${value} interval is out of range (0 - +∞)`);
	}
	/**
	 * @param {Readonly<Point2D>} position 
	 * @returns {void}
	 */
	static #rayCast(position) {
		let pointCurrentPosition = position;
		/**
		 * @returns {boolean}
		 */
		function isGoneAway() {
			return (hypot(...pointCurrentPosition["-"](position)) > 4);
		}

		let isMoved = false;
		const tape = new Tape(Entity.getTargets(position));
		const entity = tape.value;
		if (entity === null) return;

		const controller = new AbortController();
		const idTimeout = setTimeout(() => {
			entity.dispatchEvent(new PointerEvent(`hold`, { position: pointCurrentPosition }));
			controller.abort();
		}, Entity.#timeHolding);
		controller.signal.addEventListener(`abort`, (event) => {
			clearTimeout(idTimeout);
		});
		progenitor.addEventListener(`pointerup`, (event) => {
			if (isMoved) {
				entity.dispatchEvent(new PointerEvent(`dragend`, { position: pointCurrentPosition }));
			} else if (entity.isMesh(pointCurrentPosition)) {
				entity.dispatchEvent(new PointerEvent(`click`, { position: pointCurrentPosition }));
			}
			controller.abort();
		}, { signal: controller.signal });
		progenitor.addEventListener(`pointermove`, (event) => {
			pointCurrentPosition = event.position;
			if (!isMoved && isGoneAway()) {
				clearTimeout(idTimeout);
				entity.dispatchEvent(new PointerEvent(`dragbegin`, { position: pointCurrentPosition }));
				isMoved = true;
			}
			if (isMoved) {
				entity.dispatchEvent(new PointerEvent(`drag`, { position: pointCurrentPosition }));
			}
		}, { signal: controller.signal });
	}
	static {
		progenitor.addEventListener(`pointerdown`, (event) => {
			Entity.#rayCast(event.position);
		});
	}
	/**
	 * @param {string} name The name of the entity.
	 */
	constructor(name = `Entity`) {
		super(name);

		this.addEventListener(`connect`, (event) => {
			Entity.#instances.add(this, Node.getDepth(this));
		});
		this.addEventListener(`disconnect`, (event) => {
			Entity.#instances.delete(this);
		});

		this.addEventListener(`tryadoptchild`, (event) => {
			if (!(event.node instanceof Entity)) {
				event.preventDefault();
				throw new TypeError(`Entity's children also must be inherited from Entity`);
			}
		});
	}
	/**
	 * @template {keyof EntityEventMap} K
	 * @param {K} type 
	 * @param {(this: Entity, ev: EntityEventMap[K]) => any} listener 
	 * @param {boolean | AddEventListenerOptions} options
	 * @returns {void}
	 */
	addEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/**
	 * @template {keyof EntityEventMap} K
	 * @param {K} type 
	 * @param {(this: Entity, ev: EntityEventMap[K]) => any} listener 
	 * @param {boolean | EventListenerOptions} options
	 * @returns {void}
	 */
	removeEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/** @type {Group<Entity>} */
	#children = new Group(this);
	/**
	 * Gets the children of the entity.
	 * @readonly
	 * @returns {Group<Entity>} The children group.
	 */
	get children() {
		return this.#children;
	}
	/** @type {Point2D} */
	#location = Point2D.ZERO;
	/**
	 * Gets the local location of the entity.
	 * @returns {Readonly<Point2D>} The location.
	 */
	get location() {
		return Object.freeze(this.#location);
	}
	/**
	 * Sets the local location of the entity.
	 * @param {Readonly<Point2D>} value The new location.
	 * @returns {void}
	 */
	set location(value) {
		this.#location = value.clone();
	}
	/**
	 * Gets the global position of the entity.
	 * @returns {Readonly<Point2D>} The position.
	 */
	get position() {
		let result = this.#location;
		try {
			if (this.parent instanceof Entity) {
				result = result["+"](this.parent.position);
			}
		} catch { }
		return Object.freeze(result);
	}
	/**
	 * Sets the global position of the entity.
	 * @param {Readonly<Point2D>} value The new position.
	 * @returns {void}
	 */
	set position(value) {
		let result = value.clone();
		try {
			if (this.parent instanceof Entity) {
				value = result["-"](this.parent.position);
			}
		} catch { }
		this.#location = result;
	}
	/**
	 * Checks if the point is within the mesh of the entity.
	 * @virtual
	 * @param {Readonly<Point2D>} point The point to check.
	 * @returns {boolean} Whether the point is within the mesh.
	 */
	isMesh(point) {
		const position = this.position;
		const size = this.size;
		return (
			position.x - size.x / 2 <= point.x &&
			point.x < position.x + size.x / 2 &&
			position.y - size.y / 2 <= point.y &&
			point.y < position.y + size.y / 2
		);
	}
	/** @type {Point2D} */
	#size = Point2D.ZERO;
	/**
	 * Gets the size of the entity.
	 * @returns {Readonly<Point2D>} The size.
	 */
	get size() {
		return Object.freeze(this.#size);
	}
	/**
	 * Sets the size of the entity.
	 * @param {Readonly<Point2D>} value The new size.
	 * @returns {void}
	 */
	set size(value) {
		this.#size = value.clone();
	}
	/**
	 * Gets the distance from another entity.
	 * @param {Entity} other The other entity.
	 * @returns {number} The distance between the entities.
	 */
	getDistanceFrom(other) {
		const positionThis = this.position;
		const positionOther = other.position;
		return hypot(positionThis.x - positionOther.x, positionThis.y - positionOther.y);
	}
	/**
	 * Gets the angle from another entity.
	 * @param {Entity} other The other entity.
	 * @returns {number} The angle from the other entity.
	 */
	getAngleFrom(other) {
		const { size, position: pointThisPosition } = this;
		const pointOtherPosition = other.position;
		const alpha = atan2(size.x / 2, size.y / 2);
		let angle = atan2(pointOtherPosition.x - pointThisPosition.x, pointOtherPosition.y - pointThisPosition.y);
		angle += alpha;
		if (angle < 0) angle += 2 * PI;
		return angle;
	}
}
//#endregion

export { Entity };