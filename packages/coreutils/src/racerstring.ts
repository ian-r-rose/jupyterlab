// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  IObservableString, ObservableString
} from './observablestring';


/**
 * A concrete implementation of [[IRacerString]]
 */
export
class RacerString implements IObservableString {
  /**
   * Construct a new observable string.
   */
  constructor(model: any, path: string) {
    this._model = model;
    this._path = '_page.'+path;
    this._model.set(this._path, '');

    this._listener = this._model.on('change', this._path,
    (value: string, previous: string, passed: any) => {
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
   * Set the RacerString to an empty string.
   */
  clear(): void {
    this.text = '';
  }

  /**
   * Test whether the string has been disposed.
   */
  get isDisposed(): boolean {
    return this._listener === null;
  }

  /**
   * Dispose of the resources held by the string.
   */
  dispose(): void {
    if (this._listener === null) {
      return;
    }
    let listener = this._listener;
    this._listener = null;

    Signal.clearData(this);
    this._model.removeListener(listener);

    this.clear();
    this._model = null;
  }

  private _changed = new Signal<this, ObservableString.IChangedArgs>(this);
  private _model: any;
  private _path: string;
  private _listener: any = null;
}
