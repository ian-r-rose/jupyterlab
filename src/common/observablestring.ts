// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';


/**
 * A string which can be observed for changes.
 */
export
interface IObservableString extends IDisposable {
  /**
   * A signal emitted when the vector has changed.
   */
  changed: ISignal<IObservableString, void>;

  setText( value: string ) : void;

  getText() : string;

  clear() : void;

  dispose() : void;
}

/**
 * A concrete implementation of [[IObservableString]] 
 */
export
class ObservableString implements IObservableString {

  constructor(initialText: string = '') {
    this._text = initialText;
    this.changed.emit(void 0);
  }

  /**
   * A signal emitted when the string has changed.
   */
  changed: ISignal<IObservableString, void>;

  isDisposed : boolean = false;

  setText( value: string ): void {
    this._text = value;
    this.changed.emit(void 0);
  }

  getText(): string {
    return this._text;
  }

  clear(): void {
    this._text = '';
    this.changed.emit(void 0);
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this.clear();
    clearSignalData(this);
  }

  private _text = '';
}

// Define the signals for the `ObservableVector` class.
defineSignal(ObservableString.prototype, 'changed');
