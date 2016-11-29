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
  ObservableVector
} from '../common/observablevector';

declare let gapi : any;

/**
 * Interface for an object which has the ability to be shared via
 * the realtime interface. These objects are required to implement
 * method `registerCollaborative( handler : IRealtimeHandler)`
 * which describes to the handler the members which are realtime-enabled.
 */
export
interface IRealtimeModel {
  /**
   * Register this object as collaborrative.
   */
  registerCollaborative (handler: IRealtimeHandler): void;
}


/**
 * Interface for an object that coordinates realtime collaboration between
 * objects. These objects are expected to subscribe to the handler using
 * IRealtimeModel.registerCollaborative( handler : IRealtimeHandller)`.
 * There should be one realtime handler per realtime model.
 */
export
interface IRealtimeHandler {
  /**
   * Include a string in the realtime model.
   */
  createString(initialValue?: string) : Promise<IObservableString>;
}

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
    this._isDisposed = true;
  }

  private _model : gapi.drive.realtime.Model = null;
  private _str : gapi.drive.realtime.CollaborativeString = null;
  private _isDisposed : boolean = false;
}


export
class GoogleRealtimeHandler implements IRealtimeHandler {
  constructor( fileId : string = '' ) {
    this._objects = 
      new ObservableVector<gapi.drive.realtime.CollaborativeObject>();
    this.ready = new Promise<void>( (resolve, reject) => {
      if (fileId) {
        this._fileId = fileId;
        this._creator = false;
        loadRealtimeDocument(this._fileId).then( (doc : gapi.drive.realtime.Document) => {
          this._doc = doc;
          this._model = this._doc.getModel();
          resolve();
        }).catch( () => {
          console.log("gapi: unable to load realtime document")
          reject();
        });
      } else {
        this._creator = true;
        createRealtimeDocument().then( (fileId: string) => {
          this._fileId = fileId;
          loadRealtimeDocument(fileId).then( (doc : gapi.drive.realtime.Document) => {
            this._doc = doc;
            this._model = this._doc.getModel();
            resolve();
          });
        }).catch( () => {
          console.log("gapi: unable to create realtime document")
          reject();
        });
      }
    });
  }

  createString (initialValue?: string) : Promise<GoogleRealtimeString> {
    return new Promise<GoogleRealtimeString>( (resolve,reject) => {
      this.ready.then( () => {
        //Create the collaborativeString
        resolve(new GoogleRealtimeString(
          this._model, 'collabStr', initialValue||''));
      });
    });
  }

  get fileId() : string {
    return this._fileId;
  }


  private _objects : ObservableVector<gapi.drive.realtime.CollaborativeObject> = null;

  private _creator : boolean;
  private _fileId : string = '';
  private _doc : gapi.drive.realtime.Document = null;
  private _model : gapi.drive.realtime.Model = null;
  ready : Promise<void> = null;
}

// Define the signals for the `ObservableString` class.
defineSignal(GoogleRealtimeString.prototype, 'changed');
