// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Contents
} from 'jupyter-js-services';

import {
  DocumentModel, TextModelFactory
} from '../docregistry/default';

declare let gapi : any;

const RT_MIMETYPE = 'application/vnd.google-apps.drive-sdk';

export 
class RealtimeDocumentModel extends DocumentModel {
  constructor(languagePreference?: string) {
    super(languagePreference);
    this.createOrLoadRealtimeFile();
  }

  registerCollaborative(): void {
    this.fromString(this._collaborativeString.getText());
    this._collaborativeString.addEventListener(
      gapi.drive.realtime.EventType.TEXT_INSERTED,
      (evt : any) => {
        this.fromString(this._collaborativeString.getText());
      });

    this._collaborativeString.addEventListener(
          gapi.drive.realtime.EventType.TEXT_DELETED,
          (evt : any) => {
            this.fromString(this._collaborativeString.getText());
          });
  }

  fromString(value: string): void {
    super.fromString(value);
    this._collaborativeString.setText(value);
  }

  loadRealtimeFile( fileId : string) : void {
    let _this = this;
    console.log("Attempting to load realtime file " + fileId);
    gapi.drive.realtime.load( fileId, (doc : any ):any => {
      _this._realtimeDoc = doc;
      _this._realtimeModel = _this._realtimeDoc.getModel();
      _this._collaborativeString = 
        _this._realtimeModel.getRoot().get("collabstring");
      _this.registerCollaborative();
    });
  }

  createRealtimeFile() : void {
    let _this = this;
    gapi.client.drive.files.create({
      'resource': {
        mimeType: RT_MIMETYPE,
        name: 'jupyterlab_realtime_file'
        }
    }).then( (response : any) : any => {
         _this._fileId = JSON.parse(response.body).id;
         gapi.drive.realtime.load( _this._fileId, (doc : any ):any => {
           _this._realtimeDoc = doc;
           _this._realtimeModel = _this._realtimeDoc.getModel();
           _this._collaborativeString = 
             _this._realtimeModel.createString("I am a collaborative string");
           _this._realtimeModel.getRoot()
             .set("collabstring", _this._collaborativeString);
           console.log("setup realtime document "+_this._fileId);
           _this.registerCollaborative();
         });
       });
  }

  createOrLoadRealtimeFile() : void {
    let _this = this;
    gapi.client.load('drive', 'v3').then( function() {
      let query : string = (window as any).location.search;
      if (query) {
        _this._fileId = query.slice(1);
        _this.loadRealtimeFile(_this._fileId);
      }
      else {
        _this.createRealtimeFile();
      }
    });
  }

  private _fileId : string = '';
  private _realtimeDoc : gapi.drive.realtime.Document = null;
  private _realtimeModel : gapi.drive.realtime.Model = null;
  private _collaborativeString : gapi.drive.realtime.CollaborativeString = null;
}


export
class RealtimeTextModelFactory extends TextModelFactory {

  /**
   * The name of the model type.
   *
   * #### Notes
   * This is a read-only property.
   */
  get name(): string {
    return 'realtime text';
  }

  createNew(languagePreference?: string) : RealtimeDocumentModel {
    let doc = new RealtimeDocumentModel(languagePreference);
    return doc;
  }

}
