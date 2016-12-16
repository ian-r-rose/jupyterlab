// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  IObservableUndoableVector, ObservableUndoableVector
} from '../notebook/common/undo';

import {
  IObservableString, ObservableString
} from '../common/observablestring';

import {
  ObservableVector
} from '../common/observablevector';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  IRealtimeHandler, IRealtimeModel, ISynchronizable
} from '../realtime';


export
class ChatboxContent implements IRealtimeModel{
  constructor() {

    let factory = (obj: JSONObject)=>{ return new ChatboxContent.Entry(obj) };
    this._entries = new ObservableUndoableVector<ChatboxContent.Entry>(factory);
    this._entries.changed.connect((vec: IObservableUndoableVector<ChatboxContent.Entry>, arg: ObservableVector.IChangedArgs<ChatboxContent.Entry>)=>{
      if( arg.type==='add' &&
          arg.newIndex === vec.length-1 &&
          arg.newValues.length === 1 ) {
        this.newEntry.emit(arg.newValues[0])
      } else {
        console.log("Chatbox: unexpected change to log.");
      }
    });
  }

  newEntry: ISignal<this, ChatboxContent.Entry>;

  get entries(): IObservableUndoableVector<ChatboxContent.Entry> {
    return this._entries;
  }

  push(str: string, user: string): void {
    this._entries.pushBack(new ChatboxContent.Entry({
      text: str,
      user: user
    }));
  }

  clear(): void {
    this._entries.clear();
  }

  registerCollaborative(handler: IRealtimeHandler): Promise<void> {
    return new Promise<void>((resolve,reject)=>{
      let factory = (obj: JSONObject)=>{ return new ChatboxContent.Entry(obj) };
      this._realtime = handler;
      this._realtime.createVector<ChatboxContent.Entry>(factory, this._entries)
      .then((vec: IObservableUndoableVector<ChatboxContent.Entry>)=>{
        let oldVec = this._entries;
        this._entries = vec;
        this._entries.changed.connect((vec: IObservableUndoableVector<ChatboxContent.Entry>, arg: ObservableVector.IChangedArgs<ChatboxContent.Entry>)=>{
          if( arg.type==='add' &&
              arg.newIndex === vec.length-1 &&
              arg.newValues.length === 1 ) {
            this.newEntry.emit(arg.newValues[0])
          } else {
            console.log("Chatbox: unexpected change to log.");
          }
        });
        oldVec.dispose();
        resolve();
      }).catch(()=>{
        console.log("Unable to register document as collaborative");
      });
    });
  }

  private _entries: IObservableUndoableVector<ChatboxContent.Entry> = null;
  private _realtime: IRealtimeHandler = null;

}

export
namespace ChatboxContent {
  /**
   * A class for a chat entry.
   */
  export
  class Entry implements ISynchronizable<Entry> {
    constructor( value: JSONObject ) {
      this.text = (value as any).text;
      this.user = (value as any).user;
    }

    synchronizeRequest: ISignal<Entry, void>;

    /**
     * The text of the entry.
     */
    readonly text: string;

    /**
     * The username of the entry's author.
     */
    readonly user: string;

    /*
     * Convert the entry to a serializable format.
     */
    toJSON() : JSONObject {
      return { text: this.text, user: this.user };
    }
  }
}

defineSignal(ChatboxContent.prototype, 'newEntry');
