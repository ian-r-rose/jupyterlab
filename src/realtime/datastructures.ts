// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayIterator, IterableOrArrayLike,
  IIterator, each, toArray
} from 'phosphor/lib/algorithm/iteration';

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  createRealtimeDocument, loadRealtimeDocument
} from './gapi';

import {
  IObservableString, ObservableString
} from '../common/observablestring';

import {
  IObservableVector, ObservableVector
} from '../common/observablevector';

import {
  IObservableUndoableVector, ISerializable
} from '../notebook/common/undo';

import {
  IRealtimeModel, IRealtimeHandler
} from './realtime';

declare let gapi : any;


export
class GoogleRealtimeString implements IObservableString {
  constructor(model : any, id : string, initialValue?: string) {
    let collabStr : gapi.drive.realtime.CollaborativeString = null;
    collabStr = model.getRoot().get(id);
    if(!collabStr) {
      collabStr = model.createString(initialValue);
      model.getRoot().set(id, collabStr);
    }

    this._str = collabStr;

    //Add event listeners to the collaborativeString
    this._str.addEventListener(
      gapi.drive.realtime.EventType.TEXT_INSERTED,
      (evt : any) => {
        this.changed.emit({
          type : 'insert',
          start: evt.index,
          end: evt.index + evt.text.length,
          value: evt.text
        });
      });

    this._str.addEventListener(
      gapi.drive.realtime.EventType.TEXT_DELETED,
      (evt : any) => {
        this.changed.emit({
          type : 'remove',
          start: evt.index,
          end: evt.index + evt.text.length,
          value: evt.text
        });
    });
  }

  /**
   * A signal emitted when the string has changed.
   */
  changed: ISignal<IObservableString, ObservableString.IChangedArgs>;

  /**
   * Set the value of the string.
   */
  set text( value: string ) {
    this._str.setText(value);
    this.changed.emit({
      type: 'set',
      start: 0,
      end: value.length,
      value: value
    });
  }

  /**
   * Get the value of the string.
   */
  get text(): string {
    return this._str.getText();
  }

  /**
   * Insert a substring.
   *
   * @param index - The starting index.
   *
   * @param text - The substring to insert.
   */
  insert(index: number, text: string): void {
  }

  /**
   * Remove a substring.
   *
   * @param start - The starting index.
   *
   * @param end - The ending index.
   */
  remove(start: number, end: number): void {
  }

  /**
   * Set the ObservableString to an empty string.
   */
  clear(): void {
    this.text = '';
  }

  /**
   * Test whether the string has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the string.
   */
  dispose(): void {
    if(this._isDisposed) {
      return;
    }
    this._str.removeAllEventListeners();
    clearSignalData(this);
    this._isDisposed = true;
  }

  private _model : gapi.drive.realtime.Model = null;
  private _str : gapi.drive.realtime.CollaborativeString = null;
  private _isDisposed : boolean = false;
}

export
class GoogleRealtimeVector<T extends ISerializable> implements IObservableUndoableVector<T> {

  constructor(factory: (value: JSONObject)=>T, model : any, id : string, initialValue?: IObservableVector<T>) {
    this._factory = factory;
    let collabVec : gapi.drive.realtime.CollaborativeList<JSONObject> = null;
    collabVec = model.getRoot().get(id);
    if(!collabVec) {
      collabVec = model.createList(this._toJSONArray(toArray(initialValue)));
      model.getRoot().set(id, collabVec);
    }

    this._vec = collabVec;

    //Add event listeners to the collaborativeString
    this._vec.addEventListener(
      gapi.drive.realtime.EventType.VALUES_ADDED,
      (evt : any) => {
        this.changed.emit({
          type: 'add',
          oldIndex: -1,
          newIndex: evt.index,
          oldValues: [],
          newValues: this._fromJSONArray(evt.values)
        });
      });

    this._vec.addEventListener(
      gapi.drive.realtime.EventType.VALUES_REMOVED,
      (evt : any) => {
        this.changed.emit({
          type: 'remove',
          oldIndex: -1,
          newIndex: evt.index,
          oldValues: this._fromJSONArray(evt.values),
          newValues: []
        });
      });

    this._vec.addEventListener(
      gapi.drive.realtime.EventType.VALUES_SET,
      (evt : any) => {
        this.changed.emit({
          type: 'set',
          oldIndex: evt.index,
          newIndex: evt.index,
          oldValues: this._fromJSONArray(evt.oldValues),
          newValues: this._fromJSONArray(evt.newValues)
        });
      });
  }

  /**
   * A signal emitted when the vector has changed.
   */
  changed: ISignal<IObservableVector<T>, ObservableVector.IChangedArgs<T>>;

  /**
   * The length of the sequence.
   *
   * #### Notes
   * This is a read-only property.
   */
  get length(): number {
    return this._vec.length;
  }

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
  get isEmpty(): boolean {
    return this.length === 0;
  }

  /**
   * Whether the object can redo changes.
   */
  get canRedo(): boolean {
    return false;
  }

  /**
   * Whether the object can undo changes.
   */
  get canUndo(): boolean {
    return false;
  }

  /**
   * Begin a compound operation.
   *
   * @param isUndoAble - Whether the operation is undoable.
   *   The default is `false`.
   */
  beginCompoundOperation(isUndoAble?: boolean): void {
    //no-op
  }

  /**
   * End a compound operation.
   */
  endCompoundOperation(): void {
    //no-op
  }

  /**
   * Undo an operation.
   */
  undo(): void {
    //no-op
  }

  /**
   * Redo an operation.
   */
  redo(): void {
    //no-op
  }

  /**
   * Clear the change stack.
   */
  clearUndo(): void {
    //no-op
  }

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
  get front(): T {
    return this.at(0);
  }

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
  get back(): T {
    return this.at(this.length-1);
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
    ////////////////////
    return new ArrayIterator<T>
      (this._fromJSONArray(this._vec.asArray()), 0);
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
    return this._factory(this._vec.get(index));
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
    let oldValues = [this.at(index)];
    this._vec.set(index, value.toJSON());
    this.changed.emit({
      type: 'set',
      oldIndex: index,
      newIndex: index,
      oldValues,
      newValues: [value]
    });
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
    let len = this._vec.push(value.toJSON());
    this.changed.emit({
      type: 'add',
      oldIndex: -1,
      newIndex: this.length - 1,
      oldValues: [],
      newValues: [value]
    });
    return len;
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
    let value = this.at(this.length-1);
    this._vec.remove(this.length-1);
    this.changed.emit({
      type: 'remove',
      oldIndex: this.length,
      newIndex: -1,
      oldValues: [value],
      newValues: []
    });
    return value;
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
    this._vec.insert(index, value.toJSON());
    this.changed.emit({
      type: 'add',
      oldIndex: -1,
      newIndex: index,
      oldValues: [],
      newValues: [value]
    });
    return this.length;
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
    let index = this._vec.indexOf(value.toJSON());
    if(index !==-1) this.removeAt(index);
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
  removeAt(index: number): T {
    let value = this.at(index);
    this._vec.remove(index);
    this.changed.emit({
      type: 'remove',
      oldIndex: index,
      newIndex: -1,
      oldValues: [value],
      newValues: []
    });
    return value;
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
    let oldValues = this._fromJSONArray(this._vec.asArray());
    this._vec.clear();
    this.changed.emit({
      type: 'remove',
      oldIndex: 0,
      newIndex: 0,
      oldValues,
      newValues: []
    });
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
    let value = this.at(fromIndex);
    this.removeAt(fromIndex);
    if (toIndex < fromIndex) {
      this.insert(toIndex - 1, value);
    } else {
      this.insert(toIndex, value);
    }
    let arr = [value];
    this.changed.emit({
      type: 'move',
      oldIndex: fromIndex,
      newIndex: toIndex,
      oldValues: arr,
      newValues: arr
    });
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
    let newIndex = this.length;
    let newValues = toArray(values);
    each(newValues, value => { this.pushBack(value); });
    this.changed.emit({
      type: 'add',
      oldIndex: -1,
      newIndex,
      oldValues: [],
      newValues
    });
    return this.length;
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
    let newIndex = index;
    let newValues = toArray(values);
    each(newValues, value => { this.insert(index++, value); });
    this.changed.emit({
      type: 'add',
      oldIndex: -1,
      newIndex,
      oldValues: [],
      newValues
    });
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
    let oldValues: T[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      oldValues.push(this.removeAt(startIndex));
    }
    this.changed.emit({
      type: 'remove',
      oldIndex: startIndex,
      newIndex: -1,
      oldValues,
      newValues: []
    });
    return this.length;
  }

  /**
   * Test whether the string has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the string.
   */
  dispose(): void {
    if(this._isDisposed) {
      return;
    }
    this._vec.removeAllEventListeners();
    clearSignalData(this);
    this._isDisposed = true;
  }

  private _toJSONArray( array: T[] ): JSONObject[] {
    let ret: JSONObject[] = [];
    array.forEach( val => {
      ret.push(val.toJSON());
    });
    return ret;
  }
  private _fromJSONArray( array: JSONObject[] ): T[] {
    let ret: T[] = [];
    array.forEach( val => {
      ret.push(this._factory(val));
    });
    return ret;
  }


  private _factory: (value: JSONObject) => T = null;
  private _model : gapi.drive.realtime.Model = null;
  private _vec : gapi.drive.realtime.CollaborativeList<JSONObject> = null;
  private _isDisposed : boolean = false;
}

// Define the signals for the Google realtime classes.
defineSignal(GoogleRealtimeString.prototype, 'changed');
defineSignal(GoogleRealtimeVector.prototype, 'changed');
