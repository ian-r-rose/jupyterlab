// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONExt, JSONValue, JSONObject
} from '@phosphor/coreutils';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  ObservableMap
} from './observablemap';

import {
  IObservableJSON
} from './observablejson';


/**
 * An implementation of IObservbleJSON using Racer.
 */
export
class RacerMap implements IObservableJSON {
  /**
   * Construct a new observable map.
   */
  constructor(model: any, path: string) {
    this._model = model;
    this._path = '_page.'+path;
    this._model.set(this._path, {});

    this._model.on('change', this._path+'.*', (key: string, value: JSONValue, previous: JSONValue) => {
      let changeType: ObservableMap.ChangeType;
      if (value && previous) {
        changeType = 'change';
      } else if (value && !previous) {
        changeType = 'add';
      } else if (!value) {
        changeType = 'remove'
      }
      this._changed.emit({
        type: changeType,
        key,
        oldValue: previous,
        newValue: value
      });
    });
  }

  /**
   * The type of the Racer.
   */
  get type(): 'Map' {
    return 'Map';
  }


  /**
   * A signal emitted when the map has changed.
   */
  get changed(): ISignal<this, ObservableMap.IChangedArgs<JSONValue>> {
    return this._changed;
  }

  /**
   * Whether this map has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The number of key-value pairs in the map.
   */
  get size(): number {
    return Object.keys(this._model.get(this._path)).length;
  }

  /**
   * Set a key-value pair in the map
   *
   * @param key - The key to set.
   *
   * @param value - The value for the key.
   *
   * @returns the old value for the key, or undefined
   *   if that did not exist.
   *
   * @throws if the new value is undefined.
   *
   * #### Notes
   * This is a no-op if the value does not change.
   */
  set(key: string, value: JSONValue): JSONValue {
    let oldVal = this.get(key);
    if (value === undefined) {
      throw Error('Cannot set an undefined value, use remove');
    }
    // Bail if the value does not change.
    if (oldVal !== undefined && JSONExt.deepEqual(oldVal, value)) {
      return;
    }

    this._model.set(this._path+'.'+key, value);
    return oldVal;
  }

  /**
   * Get a value for a given key.
   *
   * @param key - the key.
   *
   * @returns the value for that key.
   */
  get(key: string): JSONValue {
    return this._model.get(this._path+'.'+key);
  }

  /**
   * Check whether the map has a key.
   *
   * @param key - the key to check.
   *
   * @returns `true` if the map has the key, `false` otherwise.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Get a list of the keys in the map.
   *
   * @returns - a list of keys.
   */
  keys(): string[] {
    return Object.keys(this._model.get(this._path));
  }


  /**
   * Get a list of the values in the map.
   *
   * @returns - a list of values.
   */
  values(): JSONValue[] {
    let valList: JSONValue[] = [];
    for (let key of this.keys()) {
      valList.push(this.get(key));
    }
    return valList;
  }

  /**
   * Remove a key from the map
   *
   * @param key - the key to remove.
   *
   * @returns the value of the given key,
   *   or undefined if that does not exist.
   */
  delete(key: string): JSONValue {
    return this._model.del(this._path+'.'+key);
  }

  /**
   * Set the RacerMap to an empty map.
   */
  clear(): void {
    // Delete one by one to emit the correct signals.
    let keyList = this.keys();
    for (let i = 0; i < keyList.length; i++) {
      this.delete(keyList[i]);
    }
  }

  /**
   * Dispose of the resources held by the map.
   */
  dispose(): void {
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): JSONObject {
    let out: JSONObject = Object.create(null);
    for (let key of this.keys()) {
      let value = this.get(key);
      if (JSONExt.isPrimitive(value)) {
        out[key] = value;
      } else {
        out[key] = JSON.parse(JSON.stringify(value));
      }
    }
    return out;
  }

  private _changed = new Signal<this, ObservableMap.IChangedArgs<JSONValue>>(this);
  private _isDisposed = false;
  private _model: any = null;
  private _path: string;
}
