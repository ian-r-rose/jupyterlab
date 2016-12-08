// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
  IRealtimeModel, IRealtimeHandler
} from './realtime';

declare let gapi : any;


export
class GoogleRealtimeString implements IObservableString {
  constructor(model : any, id : string, initialValue : string) {
    let strName = 'collabString';
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

// Define the signals for the `ObservableString` class.
defineSignal(GoogleRealtimeString.prototype, 'changed');
