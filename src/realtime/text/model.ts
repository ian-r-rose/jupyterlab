// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents
} from '@jupyterlab/services';

import {
  DocumentModel, TextModelFactory
} from '../../docregistry/default';

import {
  createRealtimeDocument, loadRealtimeDocument
} from '../gapi';

declare let gapi : any;

export 
class RealtimeDocumentModel extends DocumentModel {
  constructor(languagePreference?: string) {
    super(languagePreference);
    this.createOrLoadRealtimeDocument();
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

  createOrLoadRealtimeDocument() : void {
    gapi.client.load('drive', 'v3').then( () => {
      let query : string = (window as any).location.search;
      if (query) {
        this._fileId = query.slice(1);
        console.log("Attempting to load realtime file " + this._fileId);
        loadRealtimeDocument(this._fileId).then( (doc : gapi.drive.realtime.Document) => {
          this._realtimeDoc = doc;
          this._realtimeModel = this._realtimeDoc.getModel();
          this._collaborativeString =
            this._realtimeModel.getRoot().get("collabString");
          this.registerCollaborative();
        });
      } else {
        createRealtimeDocument().then( (doc : gapi.drive.realtime.Document) => {
          this._fileId = (doc as any).__rtinternal.o //This is very fragile.
          this._realtimeDoc = doc;
          this._realtimeModel = this._realtimeDoc.getModel();
          this._collaborativeString =
            this._realtimeModel.createString("I am a collaborative string");
          this._realtimeModel.getRoot()
            .set("collabString", this._collaborativeString);
          console.log("setup realtime document "+this._fileId);
          this.registerCollaborative();
        });
      }
    });
  }

  get fileId() : string {
    return this._fileId;
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
