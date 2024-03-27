"use strict";

import { Point2D } from "../Modules/Measures.js";
import { progenitor, engine, CONSTANT_TWO_2D } from "./Node.js";
import { Entity } from "./Entity.js";

const { min, max } = Math;

//#region Collision event
/**
 * @typedef VirtualCollisionEvent
 * @property {Corporeal} other
 * 
 * @typedef {EventInit & VirtualCollisionEvent} CollisionEventInit
 */

/**
 * Represents a collision event class.
 */
class CollisionEvent extends Event {
	/**
	 * Creates a new instance of the CollisionEvent class.
	 * @param {string} type The type of the event.
	 * @param {CollisionEventInit} dict The initialization dictionary.
	 */
	constructor(type, dict) {
		super(type, dict);
		this.#other = dict.other;
	}
	/** @type {Corporeal?} */
	#other = null;
	/** 
	 * Gets the other corporeal entity involved in the collision.
	 * @readonly
	 * @throws {ReferenceError} If the property is missing.
	 * @returns {Corporeal}
	 */
	get other() {
		return this.#other ?? (() => {
			throw new ReferenceError(`Other property is missing`);
		})();
	}
}
//#endregion
//#region Corporeal
/**
 * @typedef VirtualCorporealEventMap
 * @property {CollisionEvent} areacollisionbegin
 * @property {CollisionEvent} areacollision
 * @property {CollisionEvent} areacollisionend
 * 
 * @typedef {import("./Entity.js").EntityEventMap & VirtualCorporealEventMap} CorporealEventMap
 */

/**
 * Represents a corporeal entity with collision and physics capabilities.
 */
class Corporeal extends Entity {
	/** @type {Corporeal[]} */
	static #instances = [];
	static {
		progenitor.addEventListener(`update`, (event) => {
			for (let index = 0; index < Corporeal.#instances.length; index++) {
				const target = Corporeal.#instances[index];
				for (let index2 = index + 1; index2 < Corporeal.#instances.length; index2++) {
					const other = Corporeal.#instances[index2];

					const isAreaCollisionBefore = target.#collisions.has(other);
					const isAreaCollisionNow = Corporeal.isAreaCollide(target, other);

					if (isAreaCollisionNow) {
						if (!isAreaCollisionBefore) {
							target.#collisions.add(other);
							target.dispatchEvent(new CollisionEvent(`areacollisionbegin`, { other: other }));
							other.dispatchEvent(new CollisionEvent(`areacollisionbegin`, { other: target }));
						}
						target.dispatchEvent(new CollisionEvent(`areacollision`, { other: other }));
						other.dispatchEvent(new CollisionEvent(`areacollision`, { other: target }));
					} else if (isAreaCollisionBefore) {
						target.#collisions.delete(other);
						target.dispatchEvent(new CollisionEvent(`areacollisionend`, { other: other }));
						other.dispatchEvent(new CollisionEvent(`areacollisionend`, { other: target }));
					}
				}
			}
		});
	}
	/**
	 * @param {Corporeal} corporeal 
	 * @returns {[Point2D, Point2D]}
	 */
	static #getArea(corporeal) {
		return [
			corporeal.globalPosition["-"](corporeal.size["/"](CONSTANT_TWO_2D)),
			corporeal.globalPosition["+"](corporeal.size["/"](CONSTANT_TWO_2D)),
		];
	}
	/**
	 * Checks if two corporeal entities' areas collide.
	 * @param {Corporeal} first The first corporeal entity.
	 * @param {Corporeal} second The second corporeal entity.
	 * @returns {boolean} Whether the areas collide.
	 */
	static isAreaCollide(first, second) {
		const [begin1, end1] = Corporeal.#getArea(first);
		const [begin2, end2] = Corporeal.#getArea(second);
		return (begin1.x <= end2.x && begin2.x <= end1.x && begin1.y <= end2.y && begin2.y <= end1.y);
	}
	/**
	 * Gets the collision points between two corporeal entities.
	 * @param {Corporeal} first The first corporeal entity.
	 * @param {Corporeal} second The second corporeal entity.
	 * @returns {Point2D[]} The collision points.
	 */
	static getCollision(first, second) {
		const [begin1, end1] = Corporeal.#getArea(first);
		const [begin2, end2] = Corporeal.#getArea(second);
		const begin = new Point2D(max(begin1.x, begin2.x), max(begin1.y, begin2.y));
		const end = new Point2D(min(end1.x, end2.x), min(end1.y, end2.y));
		/** @type {Point2D[]} */
		const points = [];
		for (let y = begin.y; y <= end.y; y++) {
			for (let x = begin.x; x <= end.x; x++) {
				const point = new Point2D(x, y);
				if (first.isMesh(point["-"](first.globalPosition)) && second.isMesh(point["-"](second.globalPosition))) {
					points.push(point);
				}
			}
		}
		return points;
	}
	/**
	 * Creates a new instance of the Corporeal class.
	 * @param {string} name The name of the corporeal entity.
	 */
	constructor(name = `Corporeal`) {
		super(name);

		this.addEventListener(`connect`, (event) => {
			Corporeal.#instances.push(this);
		});
		this.addEventListener(`disconnect`, (event) => {
			const index = Corporeal.#instances.indexOf(this);
			if (index < 0) return;
			Corporeal.#instances.splice(index, 1);
		});

		this.addEventListener(`update`, (event) => {
			this.velocity = this.velocity["+"](this.acceleration);
			this.position = this.position["+"](this.#velocity["*"](Point2D.repeat(engine.delta)));
		});
	}
	/**
	 * @template {keyof CorporealEventMap} K
	 * @param {K} type 
	 * @param {(this: Corporeal, ev: CorporealEventMap[K]) => any} listener 
	 * @param {boolean | AddEventListenerOptions} options
	 * @returns {void}
	 */
	addEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/**
	 * @template {keyof CorporealEventMap} K
	 * @param {K} type 
	 * @param {(this: Corporeal, ev: CorporealEventMap[K]) => any} listener 
	 * @param {boolean | EventListenerOptions} options
	 * @returns {void}
	 */
	removeEventListener(type, listener, options = false) {
		// @ts-ignore
		return super.addEventListener(type, listener, options);
	}
	/** @type {Set<Corporeal>} */
	#collisions = new Set();
	/** @type {Set<Point2D>} */
	#forces = new Set();
	/** 
	 * Gets the set of forces applied to the corporeal entity.
	 * @readonly
	 */
	get forces() {
		return this.#forces;
	}
	/** @type {number} */
	#mass = 1;
	/**
	 * Gets the mass of the corporeal entity.
	 */
	get mass() {
		return this.#mass;
	}
	/**
	 * Sets the mass of the corporeal entity.
	 */
	set mass(value) {
		if (value > 0) {
			this.#mass = value;
		} else throw new RangeError(`Mass ${value} is out of range (0 - +∞)`);
	}
	/** 
	 * Gets the acceleration of the corporeal entity.
	 * @readonly
	 */
	get acceleration() {
		let equivalent = Point2D.ZERO;
		for (const force of this.forces) {
			equivalent = equivalent["+"](force);
		}
		return equivalent["/"](Point2D.repeat(this.mass));
	}
	/** @type {Point2D} */
	#velocity = Point2D.ZERO;
	/**
	 * Gets the velocity of the corporeal entity.
	 */
	get velocity() {
		return this.#velocity;
	}
	/**
	 * Sets the velocity of the corporeal entity.
	 */
	set velocity(value) {
		this.#velocity = value;
	}
}
//#endregion

export { CollisionEvent, Corporeal };