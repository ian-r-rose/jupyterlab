// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IRealtime, IRealtimeHandler, IRealtimeModel
} from './realtime';

import {
  authorize, createPermissions
} from './gapi';

import {
  GoogleRealtimeHandler
} from './handler';

import {
  showDialog
} from '../dialog';


export
class GoogleRealtime implements IRealtime {

  get ready(): Promise<void> {
    return this._authorized;
  }

  shareDocument(model: IRealtimeModel): void { 
    if( !this._authorized ) {
      this._authorize();
    }
    this._authorized.then( () => {
      let input = document.createElement('input');
      showDialog({
        title: 'Email address...',
        body: input,
        okText: 'SHARE'
      }).then(result => {
        if (result.text === 'SHARE') {
          this._shareRealtimeDocument(model, input.value);
        }
      });
    });
  }

  openSharedDocument(model: IRealtimeModel): void {
    if( !this._authorized ) {
      this._authorize();
    }
    this._authorized.then( () => {
      let input = document.createElement('input');
      showDialog({
        title: 'File ID...',
        body: input,
        okText: 'OPEN'
      }).then(result => {
        if (result.text === 'OPEN') {
          this._openRealtimeDocument(model, input.value);
        }
      });
    });
  }

  protected _shareRealtimeDocument( model: IRealtimeModel, emailAddress : string) : void {
      let handler = new GoogleRealtimeHandler();
      model.registerCollaborative(handler);
      handler.ready.then( () => {
      createPermissions(handler.fileId, emailAddress);
    });
  }

  protected _openRealtimeDocument( model: IRealtimeModel, fileId: string) : void {
    let handler = new GoogleRealtimeHandler(fileId);
    model.registerCollaborative(handler);
  }

  protected _authorize(): void {
    this._authorized = authorize();
  }

  private _authorized: Promise<void> = null;
}
