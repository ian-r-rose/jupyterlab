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

import {
  realtimeDoc, realtimeModel, collaborativeString
} from './auth';

declare let gapi : any;

export 
class RealtimeDocumentModel extends DocumentModel {
  constructor(languagePreference?: string) {
    super(languagePreference);
  }

  registerCollaborative(): void {
    this._collaborativeString = collaborativeString;
    this.fromString(this._collaborativeString.getText());
    this._collaborativeString.addEventListener(gapi.drive.realtime.EventType.TEXT_INSERTED,
                                               (evt : any) => {
                                                 this.fromString(this._collaborativeString.getText());
                                               });
    this._collaborativeString.addEventListener(gapi.drive.realtime.EventType.TEXT_DELETED,
                                               (evt : any) => {
                                                 this.fromString(this._collaborativeString.getText());
                                               });

  }

  fromString(value: string): void {
    super.fromString(value);
    this._collaborativeString.setText(value);
  }


  private _collaborativeString : gapi.drive.realtime.CollaborativeString = null;
}


export
class RealtimeTextModelFactory extends TextModelFactory {
  constructor() {
    super();
    this._doc = realtimeDoc;
    this._model = realtimeModel;
    this._collaborativeString = collaborativeString;
  }
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
    doc.registerCollaborative();
    return doc;
  }

  private _doc : gapi.drive.realtime.Document = null;
  private _model : gapi.drive.realtime.Model = null;
  private _collaborativeString : gapi.drive.realtime.CollaborativeString = null;
}

// Define the signals for the `DocumentModel` class.
defineSignal(RealtimeDocumentModel.prototype, 'contentChanged');
defineSignal(RealtimeDocumentModel.prototype, 'stateChanged');
