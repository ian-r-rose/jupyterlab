// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  IObservableString
} from './observablestring';


/**
 * A concrete implementation of an [[IObservableString]]
 * that supports collaborative editing through ShareDB.
 */
export
class ShareString implements IObservableString {
  /**
   * Construct a new observable string.
   */
  constructor(shareDoc: any, path: string) {
    this._shareDoc = shareDoc;
    this._shareDoc.on('op', this._onOp.bind(this));
    this._path = path;
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
  get changed(): ISignal<this, IObservableString.IChangedArgs> {
    return this._changed;
  }

  /**
   * Set the value of the string.
   */
  set text( value: string ) {
    if (value.length === this.text.length && value === this.text) {
      return;
    }
    if (this._shareDoc.connection.state === 'connecting') {
      return;
    }
    this._shareDoc.submitOp({p: [this._path], oi: value});
  }

  /**
   * Get the value of the string.
   */
  get text(): string {
    if (this._shareDoc.data) {
      return this._shareDoc.data['value'];
    } else {
      return '';
    }
  }

  /**
   * Insert a substring.
   *
   * @param index - The starting index.
   *
   * @param text - The substring to insert.
   */
  insert(index: number, text: string): void {
    if (this._shareDoc.connection.state === 'connecting') {
      return;
    }
    this._shareDoc.submitOp({p: [this._path, index], si: text});
  }

  /**
   * Remove a substring.
   *
   * @param start - The starting index.
   *
   * @param end - The ending index.
   */
  remove(start: number, end: number): void {
    if (this._shareDoc.connection.state === 'connecting') {
      return;
    }
    console.log(this.text.slice(start,end));
    this._shareDoc.submitOp({p: [this._path, start], sd: this.text.slice(start,end)});
  }

  /**
   * Set the ShareString to an empty string.
   */
  clear(): void {
    this.text = '';
  }

  /**
   * Test whether the string has been disposed.
   */
  get isDisposed(): boolean {
    return false;
  }

  /**
   * Dispose of the resources held by the string.
   */
  dispose(): void {
  }

  private _onOp(ops: any, isLocal: boolean) {
    for (let op of ops) {
      if (op['oi']) { // Set case
        this._changed.emit({
          type: 'set',
          start: 0,
          end: op['oi'].length,
          value: op['oi']
        });
      } else if (op['si']) {
        this._changed.emit({
          type: 'insert',
          start: op['p'][1],
          end: op['si'].length,
          value: op['si']
        });
      } else if (op['sd']) {
        this._changed.emit({
          type: 'remove',
          start: op['p'][1],
          end: op['sd'].length,
          value: op['sd']
        });
      }
    } 
  }

  private _changed = new Signal<this, IObservableString.IChangedArgs>(this);
  private _shareDoc: any;
  private _path: string;
}
