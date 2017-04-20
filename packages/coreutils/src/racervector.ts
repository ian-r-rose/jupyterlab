// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt, IIterator, ArrayIterator, IterableOrArrayLike, toArray, each
} from '@phosphor/algorithm';

import {
  JSONValue, JSONExt
} from '@phosphor/coreutils';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  IObservableVector, ObservableVector
} from './observablevector';

import {
  IObservableUndoableVector
} from './undoablevector';


/**
 * A concrete implementation of [[IObservableVector]].
 */
export
class RacerVector implements IObservableUndoableVector<JSONValue> {
  /**
   * Construct a new observable map.
   */
  constructor(model: any, path: string) {
    this._model = model;
    this._path = '_page.'+path;
    this._model.set(this._path, []);
    this._length = 0;

    // Hook up listeners for changes to the model.
    this._listeners.push(this._model.on('change', this._path+'.**',
    (pattern: string, value: JSONValue, previous: JSONValue) => {
      let index = Number(pattern);
      this._changed.emit({
        type: 'set',
        oldIndex: index,
        newIndex: index,
        oldValues: [previous],
        newValues: [value]
      });
    }));
    this._listeners.push(this._model.on('insert', this._path+'.**',
    (pattern: string, index: number, values: JSONValue[]) => {
      this._length += values.length;
      this._changed.emit({
        type: 'add',
        oldIndex: -1,
        newIndex: index,
        oldValues: [],
        newValues: values
      });
    }));
    this._listeners.push(this._model.on('remove', this._path+'.**',
    (pattern: string, index: number, removed: JSONValue[]) => {
      this._length -= removed.length;
      this._changed.emit({
        type: 'remove',
        oldIndex: index,
        newIndex: -1,
        oldValues: removed,
        newValues: []
      });
    }));
    this._listeners.push(this._model.on('move', this._path+'.**',
    (pattern: string, from: number, to: number, howMany: number) => {
      if (howMany !== 1) {
        throw Error('RacerVector: multimove not currently supported');
      }
      let value = this._model.get(this._path+'.'+String(to));
      this._changed.emit({
        type: 'move',
        oldIndex: from,
        newIndex: to,
        oldValues: [value],
        newValues: [value]
      });
    }));

    // Hook up onVectorChanged signal to handle the undo stack.
    this.changed.connect(this._onVectorChanged, this);
  }

  /**
   * The type of the Observable.
   */
  get type(): 'Vector' {
    return 'Vector';
  }

  /**
   * A signal emitted when the vector has changed.
   */
  get changed(): ISignal<this, ObservableVector.IChangedArgs<JSONValue>> {
    return this._changed;
  }

  /**
   * Test whether the vector has been disposed.
   */
  get isDisposed(): boolean {
    return this._listeners === null;
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
    return this._length === 0;
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
    return this._length;
  }

  /**
   * Get the value at the front of the vector.
   *
   * @returns The value at the front of the vector, or `undefined` if
   *   the vector is empty.
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
  get front(): JSONValue {
    return this._length === 0 ? undefined : this.at(0);
  }

  /**
   * Get the value at the back of the vector.
   *
   * @returns The value at the back of the vector, or `undefined` if
   *   the vector is empty.
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
  get back(): JSONValue {
    return this._length === 0 ? undefined : this.at(this._length);
  }

  /**
   * Whether the object can redo changes.
   */
  get canRedo(): boolean {
    return this._index < this._stack.length - 1;
  }

  /**
   * Whether the object can undo changes.
   */
  get canUndo(): boolean {
    return this._index >= 0;
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
  iter(): IIterator<JSONValue> {
    return new ArrayIterator<JSONValue>(this._model.get(this._path));
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
  at(index: number): JSONValue {
    return this._model.get(this._path+'.'+String(index));
  }

  /**
   * Dispose of the resources held by the vector.
   */
  dispose(): void {
    if (this._listeners === null) {
      return;
    }
    let listeners = this._listeners;
    this._listeners = null;

    Signal.clearData(this);
    for (let listener of listeners) {
      this._model.removeListener(listener);
    }

    this.clear();
    this._model = null;
    this._stack = null;
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
  set(index: number, value: JSONValue): void {
    let oldValue = this.at(index);
    if (value === undefined) {
      value = null;
    }
    // Bail if the value does not change.
    if (JSONExt.deepEqual(oldValue, value)) {
      return;
    }
    this._model.set(this._path+'.'+String(index), value);
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
  pushBack(value: JSONValue): number {
    return this._model.push(this._path, value);
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
  popBack(): JSONValue {
    return this._model.pop(this._path);
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
  insert(index: number, value: JSONValue): number {
    return this._model.insert(this._path, index, [value]);
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
   */
  remove(value: JSONValue): number {
    let index = ArrayExt.findFirstIndex(this._model.get(this._path), JSONExt.deepEqual);
    this.removeAt(index);
    return index;
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
  removeAt(index: number): JSONValue {
    let removed = this._model.remove(this._path, index);
    return removed[0];
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
    this._model.remove(this._path, 0, this._length);
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
    if (this.length <= 1 || fromIndex === toIndex) {
      return;
    }
    this._model.move(this._path, fromIndex, toIndex, 1);
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
  pushAll(values: IterableOrArrayLike<JSONValue>): number {
    return this._model.insert(this._path, this._length, toArray(values));
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
  insertAll(index: number, values: IterableOrArrayLike<JSONValue>): number {
    return this.length;
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
    this._model.remove(this._path, startIndex, endIndex-startIndex);
    return this._length;
  }

  /**
   * Begin a compound operation.
   *
   * @param isUndoAble - Whether the operation is undoable.
   *   The default is `true`.
   */
  beginCompoundOperation(isUndoAble?: boolean): void {
    this._inCompound = true;
    this._isUndoable = (isUndoAble !== false);
    this._madeCompoundChange = false;
  }

  /**
   * End a compound operation.
   */
  endCompoundOperation(): void {
    this._inCompound = false;
    this._isUndoable = true;
    if (this._madeCompoundChange) {
      this._index++;
    }
  }

  /**
   * Undo an operation.
   */
  undo(): void {
    if (!this.canUndo) {
      return;
    }
    let changes = this._stack[this._index];
    this._isUndoable = false;
    for (let change of changes.reverse()) {
      this._undoChange(change);
    }
    this._isUndoable = true;
    this._index--;
  }

  /**
   * Redo an operation.
   */
  redo(): void {
    if (!this.canRedo) {
      return;
    }
    this._index++;
    let changes = this._stack[this._index];
    this._isUndoable = false;
    for (let change of changes) {
      this._redoChange(change);
    }
    this._isUndoable = true;
  }

  /**
   * Clear the change stack.
   */
  clearUndo(): void {
    this._index = -1;
    this._stack = [];
  }

  /**
   * Handle a change in the vector.
   */
  private _onVectorChanged(list: IObservableVector<JSONValue>, change: ObservableVector.IChangedArgs<JSONValue>): void {
    if (this.isDisposed || !this._isUndoable) {
      return;
    }
    // Clear everything after this position if necessary.
    if (!this._inCompound || !this._madeCompoundChange) {
      this._stack = this._stack.slice(0, this._index + 1);
    }
    // Copy the change.
    let evt = this._copyChange(change);
    // Put the change in the stack.
    if (this._stack[this._index + 1]) {
      this._stack[this._index + 1].push(evt);
    } else {
      this._stack.push([evt]);
    }
    // If not in a compound operation, increase index.
    if (!this._inCompound) {
      this._index++;
    } else {
      this._madeCompoundChange = true;
    }
  }

  /**
   * Undo a change event.
   */
  private _undoChange(change: ObservableVector.IChangedArgs<JSONValue>): void {
    let index = 0;
    switch (change.type) {
    case 'add':
      each(change.newValues, () => {
        this.removeAt(change.newIndex);
      });
      break;
    case 'set':
      index = change.oldIndex;
      each(change.oldValues, value => {
        this.set(index++, value);
      });
      break;
    case 'remove':
      index = change.oldIndex;
      each(change.oldValues, value => {
        this.insert(index++, value);
      });
      break;
    case 'move':
      this.move(change.newIndex, change.oldIndex);
      break;
    default:
      return;
    }
  }

  /**
   * Redo a change event.
   */
  private _redoChange(change: ObservableVector.IChangedArgs<JSONValue>): void {
    let index = 0;
    switch (change.type) {
    case 'add':
      index = change.newIndex;
      each(change.newValues, value => {
        this.insert(index++, value);
      });
      break;
    case 'set':
      index = change.newIndex;
      each(change.newValues, value => {
        this.set(change.newIndex++, value);
      });
      break;
    case 'remove':
      each(change.oldValues, () => {
        this.removeAt(change.oldIndex);
      });
      break;
    case 'move':
      this.move(change.oldIndex, change.newIndex);
      break;
    default:
      return;
    }
  }

  /**
   * Copy a change as JSON.
   */
  private _copyChange(change: ObservableVector.IChangedArgs<JSONValue>): ObservableVector.IChangedArgs<JSONValue> {
    let oldValues: JSONValue[] = [];
    each(change.oldValues, value => {
      oldValues.push(value);
    });
    let newValues: JSONValue[] = [];
    each(change.newValues, value => {
      newValues.push(value);
    });
    return {
      type: change.type,
      oldIndex: change.oldIndex,
      newIndex: change.newIndex,
      oldValues,
      newValues
    };
  }

  private _changed = new Signal<this, ObservableVector.IChangedArgs<JSONValue>>(this);
  private _model: any;
  private _path: string;
  private _length: number;
  private _inCompound = false;
  private _isUndoable = true;
  private _madeCompoundChange = false;
  private _index = -1;
  private _stack: ObservableVector.IChangedArgs<JSONValue>[][] = [];
  private _listeners: any[] = [];
}
