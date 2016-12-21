// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IIterator, IterableOrArrayLike, each, toArray
} from 'phosphor/lib/algorithm/iteration';

import {
  indexOf
} from 'phosphor/lib/algorithm/searching';

import {
  ISequence
} from 'phosphor/lib/algorithm/sequence';

import {
  Vector
} from 'phosphor/lib/collections/vector';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';


/**
 * A vector which can be observed for changes.
 */
export
interface IObservableVector<T> extends IDisposable, ISequence<T> {
  /**
   * A signal emitted when the vector has changed.
   */
  changed: ISignal<IObservableVector<T>, ObservableVector.IChangedArgs<T>>;

  /**
   * Test whether the vector is empty.
   *
   * @returns `true` if the vector is empty, `false` otherwise.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  readonly isEmpty: boolean;

  /**
   * Get the value at the front of the vector.
   *
   * @returns The value at the front of the vector, or `undefined` if
   *   the vector is empty.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  readonly front: T;

  /**
   * Get the value at the back of the vector.
   *
   * @returns The value at the back of the vector, or `undefined` if
   *   the vector is empty.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  readonly back: T;

  /**
   * Get whether this vector can be linked to another.
   * If so, the functions `link` and `unlink` will perform
   * that. Otherwise, they are no-op functions.
   *
   * @returns `true` if the vector may be linked to another,
   *   `false` otherwise.
   */
  readonly isLinkable: boolean;

  /**
   * Set the value at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @param value - The value to set at the specified index.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral or out of range.
   */
  set(index: number, value: T): void;

  /**
   * Add a value to the back of the vector.
   *
   * @param value - The value to add to the back of the vector.
   *
   * @returns The new length of the vector.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  pushBack(value: T): number;

  /**
   * Remove and return the value at the back of the vector.
   *
   * @returns The value at the back of the vector, or `undefined` if
   *   the vector is empty.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value are invalidated.
   */
  popBack(): T;

  /**
   * Insert a value into the vector at a specific index.
   *
   * @param index - The index at which to insert the value.
   *
   * @param value - The value to set at the specified index.
   *
   * @returns The new length of the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the vector.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  insert(index: number, value: T): number;

  /**
   * Remove the first occurrence of a value from the vector.
   *
   * @param value - The value of interest.
   *
   * @returns The index of the removed value, or `-1` if the value
   *   is not contained in the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value and beyond are invalidated.
   *
   * #### Notes
   * Comparison is performed using strict `===` equality.
   */
  remove(value: T): number;

  /**
   * Remove and return the value at a specific index.
   *
   * @param index - The index of the value of interest.
   *
   * @returns The value at the specified index, or `undefined` if the
   *   index is out of range.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value and beyond are invalidated.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  removeAt(index: number): T;

  /**
   * Remove all values from the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * All current iterators are invalidated.
   */
  clear(): void;

  /**
   * Move a value from one index to another.
   *
   * @parm fromIndex - The index of the element to move.
   *
   * @param toIndex - The index to move the element to.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * Iterators pointing at the lesser of the `fromIndex` and the `toIndex`
   * and beyond are invalidated.
   *
   * #### Undefined Behavior
   * A `fromIndex` or a `toIndex` which is non-integral.
   */
  move(fromIndex: number, toIndex: number): void;

  /**
   * Push a set of values to the back of the vector.
   *
   * @param values - An iterable or array-like set of values to add.
   *
   * @returns The new length of the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   */
  pushAll(values: IterableOrArrayLike<T>): number;

  /**
   * Insert a set of items into the vector at the specified index.
   *
   * @param index - The index at which to insert the values.
   *
   * @param values - The values to insert at the specified index.
   *
   * @returns The new length of the vector.
   *
   * #### Complexity.
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the vector.
   *
   * #### Undefined Behavior.
   * An `index` which is non-integral.
   */
  insertAll(index: number, values: IterableOrArrayLike<T>): number;

  /**
   * Remove a range of items from the vector.
   *
   * @param startIndex - The start index of the range to remove (inclusive).
   *
   * @param endIndex - The end index of the range to remove (exclusive).
   *
   * @returns The new length of the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * Iterators pointing to the first removed value and beyond are invalid.
   *
   * #### Undefined Behavior
   * A `startIndex` or `endIndex` which is non-integral.
   */
  removeRange(startIndex: number, endIndex: number): number;

  /**
   * Link the vector to another vector.
   * Any changes to either are mirrored in the other.
   *
   * @param vec: the parent vector.
   */
  link(vec: IObservableVector<T>): void;

  /**
   * Unlink the vector from its parent vector.
   */
  unlink(): void;
}


/**
 * A concrete implementation of [[IObservableVector]].
 */
export
class ObservableVector<T> extends Vector<T> implements IObservableVector<T> {
  /**
   * A signal emitted when the vector has changed.
   */
  changed: ISignal<ObservableVector<T>, ObservableVector.IChangedArgs<T>>;

  /**
   * Get whether this vector can be linked to another.
   * If so, the functions `link` and `unlink` will perform
   * that. Otherwise, they are no-op functions.
   *
   * @returns `true` if the vector may be linked to another,
   *   `false` otherwise.
   */
  readonly isLinkable: boolean = true;

  /**
   * Test whether the vector has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Test whether the vector is empty.
   *
   * @returns `true` if the vector is empty, `false` otherwise.
   *
   * #### Notes
   * This is a read-only property.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  get isEmpty(): boolean {
    return this.length === 0;
  }

  /**
   * Get the length of the vector.
   *
   * @return The number of values in the vector.
   *
   * #### Notes
   * This is a read-only property.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  get length(): number {
    //TODO: How to call super.length?
    if (!this._parent) {
      return (this as any)._array.length;
    } else {
      return this._parent.length;
    }
  }


  /**
   * Create an iterator over the values in the vector.
   *
   * @returns A new iterator starting at the front of the vector.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  iter(): IIterator<T> {
    if(!this._parent) {
      return super.iter();
    } else {
      return this._parent.iter();
    }
  }

  /**
   * Get the value at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @returns The value at the specified index.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral or out of range.
   */
  at(index: number): T {
    if(!this._parent) {
      return super.at(index);
    } else {
      return this._parent.at(index);
    }
  }

  /**
   * Dispose of the resources held by the vector.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    clearSignalData(this);
    this.clear();
  }

  /**
   * Set the value at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @param value - The value to set at the specified index.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral or out of range.
   */
  set(index: number, value: T): void {
    if(!this._parent) {
      let oldValues = [this.at(index)];
      super.set(index, value);
      this.changed.emit({
        type: 'set',
        oldIndex: index,
        newIndex: index,
        oldValues,
        newValues: [value]
      });
    } else {
      this._parent.set(index, value);
    }
  }

  /**
   * Add a value to the back of the vector.
   *
   * @param value - The value to add to the back of the vector.
   *
   * @returns The new length of the vector.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  pushBack(value: T): number {
    if(!this._parent) {
      let num = super.pushBack(value);
      this.changed.emit({
        type: 'add',
        oldIndex: -1,
        newIndex: this.length - 1,
        oldValues: [],
        newValues: [value]
      });
      return num;
    } else {
      return this._parent.pushBack(value);
    }
  }

  /**
   * Remove and return the value at the back of the vector.
   *
   * @returns The value at the back of the vector, or `undefined` if
   *   the vector is empty.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value are invalidated.
   */
  popBack(): T {
    if(!this._parent) {
      let value = super.popBack();
      this.changed.emit({
        type: 'remove',
        oldIndex: this.length,
        newIndex: -1,
        oldValues: [value],
        newValues: []
      });
      return value;
    } else {
      return this._parent.popBack();
    }
  }

  /**
   * Insert a value into the vector at a specific index.
   *
   * @param index - The index at which to insert the value.
   *
   * @param value - The value to set at the specified index.
   *
   * @returns The new length of the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the vector.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  insert(index: number, value: T): number {
    if(!this._parent) {
      let num = super.insert(index, value);
      this.changed.emit({
        type: 'add',
        oldIndex: -1,
        newIndex: index,
        oldValues: [],
        newValues: [value]
      });
      return num;
    } else {
      return this._parent.insert(index, value);
    }
  }

  /**
   * Remove the first occurrence of a value from the vector.
   *
   * @param value - The value of interest.
   *
   * @returns The index of the removed value, or `-1` if the value
   *   is not contained in the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value and beyond are invalidated.
   *
   * #### Notes
   * Comparison is performed using strict `===` equality.
   */
  remove(value: T): number {
    if(!this._parent) {
      let index = indexOf(this, value);
      this.removeAt(index);
      return index;
    } else {
      return this._parent.remove(value);
    }
  }

  /**
   * Remove and return the value at a specific index.
   *
   * @param index - The index of the value of interest.
   *
   * @returns The value at the specified index, or `undefined` if the
   *   index is out of range.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value and beyond are invalidated.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  removeAt(index: number): T {
    if(!this._parent) {
      let value = super.removeAt(index);
      this.changed.emit({
        type: 'remove',
        oldIndex: index,
        newIndex: -1,
        oldValues: [value],
        newValues: []
      });
      return value;
    } else {
      return this._parent.removeAt(index);
    }
  }

  /**
   * Remove all values from the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * All current iterators are invalidated.
   */
  clear(): void {
    if(!this._parent) {
      let oldValues = toArray(this);
      super.clear();
      this.changed.emit({
        type: 'remove',
        oldIndex: 0,
        newIndex: 0,
        oldValues,
        newValues: []
      });
    } else {
      this._parent.clear();
    }
  }

  /**
   * Move a value from one index to another.
   *
   * @parm fromIndex - The index of the element to move.
   *
   * @param toIndex - The index to move the element to.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * Iterators pointing at the lesser of the `fromIndex` and the `toIndex`
   * and beyond are invalidated.
   *
   * #### Undefined Behavior
   * A `fromIndex` or a `toIndex` which is non-integral.
   */
  move(fromIndex: number, toIndex: number): void {
    if(!this._parent) {
      let value = this.at(fromIndex);
      super.removeAt(fromIndex);
      if (toIndex < fromIndex) {
        super.insert(toIndex - 1, value);
      } else {
        super.insert(toIndex, value);
      }
      let arr = [value];
      this.changed.emit({
        type: 'move',
        oldIndex: fromIndex,
        newIndex: toIndex,
        oldValues: arr,
        newValues: arr
      });
    } else {
      this._parent.move(fromIndex, toIndex);
    }
  }

  /**
   * Push a set of values to the back of the vector.
   *
   * @param values - An iterable or array-like set of values to add.
   *
   * @returns The new length of the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   */
  pushAll(values: IterableOrArrayLike<T>): number {
    if(!this._parent) {
      let newIndex = this.length;
      let newValues = toArray(values);
      each(newValues, value => { super.pushBack(value); });
      this.changed.emit({
        type: 'add',
        oldIndex: -1,
        newIndex,
        oldValues: [],
        newValues
      });
      return this.length;
    } else {
      return this._parent.pushAll(values);
    }
  }

  /**
   * Insert a set of items into the vector at the specified index.
   *
   * @param index - The index at which to insert the values.
   *
   * @param values - The values to insert at the specified index.
   *
   * @returns The new length of the vector.
   *
   * #### Complexity.
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the vector.
   *
   * #### Undefined Behavior.
   * An `index` which is non-integral.
   */
  insertAll(index: number, values: IterableOrArrayLike<T>): number {
    if(!this._parent) {
      let newIndex = index;
      let newValues = toArray(values);
      each(newValues, value => { super.insert(index++, value); });
      this.changed.emit({
        type: 'add',
        oldIndex: -1,
        newIndex,
        oldValues: [],
        newValues
      });
      return this.length;
    } else {
      return this._parent.insertAll(index, values);
    }
  }

  /**
   * Remove a range of items from the vector.
   *
   * @param startIndex - The start index of the range to remove (inclusive).
   *
   * @param endIndex - The end index of the range to remove (exclusive).
   *
   * @returns The new length of the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * Iterators pointing to the first removed value and beyond are invalid.
   *
   * #### Undefined Behavior
   * A `startIndex` or `endIndex` which is non-integral.
   */
  removeRange(startIndex: number, endIndex: number): number {
    if(!this._parent) {
      let oldValues: T[] = [];
      for (let i = startIndex; i < endIndex; i++) {
        oldValues.push(super.removeAt(startIndex));
      }
      this.changed.emit({
        type: 'remove',
        oldIndex: startIndex,
        newIndex: -1,
        oldValues,
        newValues: []
      });
      return this.length;
    } else {
      return this._parent.removeRange(startIndex, endIndex);
    }
  }

  /**
   * Link the vector to another vector.
   * Any changes to either are mirrored in the other.
   *
   * @param vec: the parent string.
   */
  link(vec: IObservableVector<T>): void {
    //First, recreate the parent vector locally to trigger the 
    //appropriate changed signals.
    let min = vec.length <= this.length ? vec.length : this.length;
    for (let i=0; i<min; i++) {
      if (vec.at(i) !== this.at(i)) {
        this.set(i, vec.at(i));
      }
    }
    if (vec.length < this.length) {
      while(this.length > min) {
        this.popBack();
      }
    } else if (this.length < vec.length) {
      for(let i = min; i < vec.length; i++) {
        this.pushBack(vec.at(i));
      }
    }
    //Now clear the local copy without triggering signals
    super.clear();

    //Set the parent vector and forward its signals
    this._parent = vec;
    this._parent.changed.connect(this._forwardSignal, this);
  }

  /**
   * Unlink the vector from its parent vector.
   */
  unlink(): void {
    if(this._parent) {
      //reconstruct the local array without sending signals
      each(this._parent, (value: T)=>{ super.pushBack(value); });
      this._parent.changed.disconnect(this._forwardSignal, this);
      this._parent = null;
    }
  }

  /**
   * Catch a signal from the parent vector and pass it on.
   */
  private _forwardSignal(s: IObservableVector<T>,
                         c: ObservableVector.IChangedArgs<T>) {
    this.changed.emit(c);
  }

  private _isDisposed = false;
  private _parent: IObservableVector<T> = null;
}


/**
 * The namespace for `ObservableVector` class statics.
 */
export
namespace ObservableVector {
  /**
   * The change types which occur on an observable vector.
   */
  export
  type ChangeType =
    /**
     * Item(s) were added to the vector.
     */
    'add' |

    /**
     * An item was moved within the vector.
     */
    'move' |

    /**
     * Item(s) were removed from the vector.
     */
    'remove' |

    /**
     * An item was set in the vector.
     */
    'set';

  /**
   * The changed args object which is emitted by an observable vector.
   */
  export
  interface IChangedArgs<T> {
    /**
     * The type of change undergone by the vector.
     */
    type: ChangeType;

    /**
     * The new index associated with the change.
     */
    newIndex: number;

    /**
     * The new values associated with the change.
     *
     * #### Notes
     * The values will be contiguous starting at the `newIndex`.
     */
    newValues: T[];

    /**
     * The old index associated with the change.
     */
    oldIndex: number;

    /**
     * The old values associated with the change.
     *
     * #### Notes
     * The values will be contiguous starting at the `oldIndex`.
     */
    oldValues: T[];
  }
}


// Define the signals for the `ObservableVector` class.
defineSignal(ObservableVector.prototype, 'changed');
