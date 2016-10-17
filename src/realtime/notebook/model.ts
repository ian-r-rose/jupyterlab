// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents
} from '@jupyterlab/services';

import {
  IObservableVector, ObservableVector
} from '../../common/observablevector';

import {
  NotebookModel
} from '../../notebook/notebook/model';

import {
  NotebookModelFactory
} from '../../notebook/notebook/modelfactory';

import {
  ICellModel, ICodeCellModel, IRawCellModel, IMarkdownCellModel,
  CodeCellModel, RawCellModel, MarkdownCellModel
} from '../../notebook/cells/model';

import {
  nbformat
} from '../../notebook/notebook/nbformat';

import {
  createRealtimeDocument, loadRealtimeDocument
} from '../gapi';

declare let gapi : any;

export 
class RealtimeNotebookModel extends NotebookModel {
  constructor(options : NotebookModel.IOptions = {}) {
    super(options);
    this.createOrLoadRealtimeDocument();
  }

  registerCollaborative(): void {
    this._collaborativeList.addEventListener(
      gapi.drive.realtime.EventType.VALUES_ADDED,
      (evt : any) => {
        console.log(evt.isLocal);
        if( ! evt.isLocal ) {
          switch (evt.values[0].cell_type) {
          case 'code':
            this.cells.pushBack(new CodeCellModel(evt.values[0]));
            break;
          case 'markdown':
            this.cells.pushBack(new MarkdownCellModel(evt.values[0]));
            break;
          case 'raw':
            this.cells.pushBack(new RawCellModel(evt.values[0]));
            break;
          }
        }
      });
    this.cells.changed.connect(this._updateCollaborativeList, this);
  }

  private _updateCollaborativeList (list: IObservableVector<any>, change: ObservableVector.IChangedArgs<any>): void {
    if( change.type === 'add') {
      this._collaborativeList.push((change.newValues as any)[0].toJSON());
      console.log("Added a value!");
    }
  }

  createOrLoadRealtimeDocument() : void {
    let query : string = (window as any).location.search;
    if (query) {
      this._fileId = query.slice(1);
      loadRealtimeDocument(this._fileId).then( (doc : gapi.drive.realtime.Document) => {
        this._realtimeDoc = doc;
        this._realtimeModel = this._realtimeDoc.getModel();
        this._collaborativeList = 
          this._realtimeModel.getRoot().get("collabList");
        this.registerCollaborative();
      });
    } else {
      createRealtimeDocument().then( (doc : gapi.drive.realtime.Document) => {
        this._fileId = (doc as any).__rtinternal.o //This is very fragile.
        this._realtimeDoc = doc;
        this._realtimeModel = this._realtimeDoc.getModel();
        this._collaborativeList = this._realtimeModel.createList<nbformat.ICell>()
        if (this.cells.length) {
          for ( let i = 0; i < this.cells.length; i++ ) {
            let cell = this.cells.at(i);
            this._collaborativeList.push( cell.toJSON() );
          }
        }
        this._realtimeModel.getRoot()
          .set("collabList", this._collaborativeList);
        console.log("setup realtime document "+this._fileId);
        this.registerCollaborative();
      });
    }
  }

  get fileId() : string {
    return this._fileId;
  }

  private _fileId : string = '';
  private _realtimeDoc : gapi.drive.realtime.Document = null;
  private _realtimeModel : gapi.drive.realtime.Model = null;
  private _collaborativeList : gapi.drive.realtime.CollaborativeList<nbformat.ICell> = null;
}


export
class RealtimeNotebookModelFactory extends NotebookModelFactory {

  /**
   * The name of the model type.
   *
   * #### Notes
   * This is a read-only property.
   */
  get name(): string {
    return 'realtime notebook';
  }

  createNew(languagePreference?: string) : RealtimeNotebookModel {
    let doc = new RealtimeNotebookModel({ languagePreference });
    return doc;
  }
}
