// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IObservableVector, ObservableVector
} from '../common/observablevector';

import {
  IObservableString, ObservableString
} from '../common/observablestring';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';


export
class ChatboxContent {
  constructor() {
    this._entries = new ObservableVector<string>();
  }

  newEntry: ISignal<this, string>;

  get entries(): IObservableVector<string> {
    return this._entries;
  }

  push(str: string): void {
    this._entries.pushBack(str);
    this.newEntry.emit(str);
  }
  clear(): void {
    this._entries.clear();
  }

  private _entries: IObservableVector<string> = null;
}

defineSignal(ChatboxContent.prototype, 'newEntry');
