// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  IObservable
} from './modeldb';


/**
 * A string which can be observed for changes.
 */
export
interface IObservableString extends IDisposable, IObservable {
  /**
   * The type of the Observable.
   */
  type: 'String';

  /**
   * A signal emitted when the string has changed.
   */
  readonly changed: ISignal<this, ObservableString.IChangedArgs>;

  /**
   * The value of the string.
   */
  text: string;

  /**
   * Insert a substring.
   *
   * @param index - The starting index.
   *
   * @param text - The substring to insert.
   */
  insert(index: number, text: string): void;

  /**
   * Remove a substring.
   *
   * @param start - The starting index.
   *
   * @param end - The ending index.
   */
  remove(start: number, end: number): void;

  /**
   * Set the ObservableString to an empty string.
   */
  clear(): void;

  /**
   * Dispose of the resources held by the string.
   */
  dispose(): void;
}


/**
 * A concrete implementation of [[IObservableString]]
 */
export
class ObservableString implements IObservableString {
  /**
   * Construct a new observable string.
   */
  constructor(model: any, path: string) {
    this._model = model;
    this._path = path;
    this._model.set(path, '');

    this._model.on('change', this._path, (value: string, previous: string, passed: any) => {
      if (passed.$stringInsert) {
        let start: number = passed.$stringInsert.index;
        let end: number = start + passed.$stringInsert.text.length;
        this._changed.emit({
          type: 'insert',
          start,
          end,
          value: passed.$stringInsert.text
        });
      } else if (passed.$stringRemove) {
        let start: number = passed.$stringRemove.index;
        let end: number = start + passed.$stringRemove.howMany;
        this._changed.emit({
          type: 'remove',
          start,
          end,
          value: previous.slice(start, end)
        });
      } else {
        this._changed.emit({
          type: 'set',
          start: 0,
          end: value.length,
          value
        });
      }
    });
  }

  /**
   * The type of the Observable.
   */
  get type(): 'String' {
    return 'String';
  }

  /**
   * A signal emitted when the string has changed.
   */
  get changed(): ISignal<this, ObservableString.IChangedArgs> {
    return this._changed;
  }

  /**
   * Set the value of the string.
   */
  set text( value: string ) {
    if (value.length === this.text.length && value === this.text) {
      return;
    }
    this._model.set(this._path, value);
  }

  /**
   * Get the value of the string.
   */
  get text(): string {
    return this._model.get(this._path);;
  }

  /**
   * Insert a substring.
   *
   * @param index - The starting index.
   *
   * @param text - The substring to insert.
   */
  insert(index: number, text: string): void {
    this._model.stringInsert(this._path, index, text);
  }

  /**
   * Remove a substring.
   *
   * @param start - The starting index.
   *
   * @param end - The ending index.
   */
  remove(start: number, end: number): void {
    this._model.stringRemove(this._path, start, end-start);
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
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
    this.clear();
  }

  private _isDisposed : boolean = false;
  private _changed = new Signal<this, ObservableString.IChangedArgs>(this);
  private _model: any;
  private _path: string;
}


/**
 * The namespace for `ObservableVector` class statics.
 */
export
namespace ObservableString {
  /**
   * The change types which occur on an observable string.
   */
  export
  type ChangeType =
    /**
     * Text was inserted.
     */
    'insert' |

    /**
     * Text was removed.
     */
    'remove' |

    /**
     * Text was set.
     */
    'set';

  /**
   * The changed args object which is emitted by an observable string.
   */
  export
  interface IChangedArgs {
    /**
     * The type of change undergone by the list.
     */
    type: ChangeType;

    /**
     * The starting index of the change.
     */
    start: number;

    /**
     * The end index of the change.
     */
    end: number;

    /**
     * The value of the change.
     *
     * ### Notes
     * If `ChangeType` is `set`, then
     * this is the new value of the string.
     *
     * If `ChangeType` is `insert` this is
     * the value of the inserted string.
     *
     * If `ChangeType` is remove this is the
     * value of the removed substring.
     */
    value: string;
  }
}
