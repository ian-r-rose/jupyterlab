// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  createRealtimeDocument, loadRealtimeDocument
} from './gapi';

import {
  ObservableString
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
   * Register this object as collaborative.
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
  registerString( str : ObservableString ) : void;
}

export
class GoogleRealtimeHandler implements IRealtimeHandler {

  constructor( fileId : string = '' ) {
    this._objects = 
      new ObservableVector<gapi.drive.realtime.CollaborativeObject>();
    this._ready = new Promise<void>( (resolve, reject) => {
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
        createRealtimeDocument().then( (doc : gapi.drive.realtime.Document) => {
          this._fileId = (doc as any).__rtinternal.o //This is very fragile.
          this._doc = doc;
          this._model = this._doc.getModel();
          resolve();
        }).catch( () => {
          console.log("gapi: unable to create realtime document")
          reject();
        });
      }
    });
  }

  registerString ( str: ObservableString ) : void {
    this._ready.then( () => {
      //Initialize the collaborativeString
      let collabStr : gapi.drive.realtime.CollaborativeString = null;
      if (this._creator) {
        collabStr = this._model.createString(str.getText());
        this._objects.pushBack( collabStr );
        this._model.getRoot().set("collabString", collabStr );
        console.log(collabStr.getText());
      } else {
        collabStr = this._model.getRoot().get("collabString");
        this._objects.pushBack( collabStr );
        str.setText( collabStr.getText());
      }
      //Add event listeners to the collaborativeString
      collabStr.addEventListener(
        gapi.drive.realtime.EventType.TEXT_INSERTED,
        (evt : any) => {
          if (!evt.isLocal) {
            str.setText(collabStr.getText());
          }
        }
      );

      collabStr.addEventListener(
        gapi.drive.realtime.EventType.TEXT_DELETED,
        (evt : any) => {
          if (!evt.isLocal) {
            str.setText(collabStr.getText());
          }
        }
      );

      str.changed.connect( (s) => {
        collabStr.setText(s.getText());
        console.log(s.getText());
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
  private _ready : Promise<void> = null;
}
