// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat, utils
} from '@jupyterlab/services';

import {
  deepEqual, JSONValue
} from 'phosphor/lib/algorithm/json';

import {
  IIterator, iter
} from 'phosphor/lib/algorithm/iteration';

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  CodeEditor
} from '../codeeditor';

import {
  IChangedArgs
} from '../common/interfaces';

import {
  IObservableString, ObservableString
} from '../common/observablestring';

import {
  IMetadataCursor, MetadataCursor
} from '../common/metadata';

import {
  IOutputAreaModel, OutputAreaModel
} from '../outputarea';

import {
  ISynchronizable
} from '../../realtime';

import {
  ObservableString, IObservableString
} from '../../common/observablestring';


/**
 * The definition of a model object for a cell.
 */
export
interface ICellModel extends CodeEditor.IModel, ISynchronizable<ICellModel> {
  /**
   * The type of the cell.
   */
  readonly type: nbformat.CellType;

  /**
   * A signal emitted when the content of the model changes.
   */
  contentChanged: ISignal<ICellModel, void>;

  /**
   * A signal emitted when a metadata field changes.
   */
  metadataChanged: ISignal<ICellModel, IChangedArgs<JSONValue>>;

  /**
   * A signal emitted when a model state changes.
   */
  stateChanged: ISignal<ICellModel, IChangedArgs<any>>;

  /**
<<<<<<< HEAD
=======
   * A signal emitted to synchronize with a realtime handler.
   */
  synchronizeRequest: ISignal<ICellModel, void>;

  /**
   * The input content of the cell.
   */
  source: string;

  /**
>>>>>>> Selective merge of implementation-agnostic parts for a realtime
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICell;

  /**
   * Get a metadata cursor for the cell.
   *
   * #### Notes
   * Metadata associated with the nbformat spec are set directly
   * on the model.  This method is used to interact with a namespaced
   * set of metadata on the cell.
   */
  getMetadata(name: string): IMetadataCursor;

  /**
   * List the metadata namespace keys for the notebook.
   *
   * #### Notes
   * Metadata associated with the nbformat are not included.
   */
  listMetadata(): IIterator<string>;
}


/**
 * The definition of a code cell.
 */
export
interface ICodeCellModel extends ICellModel {
  /**
   * The type of the cell.
   *
   * #### Notes
   * This is a read-only property.
   */
  type: 'code';

  /**
   * The code cell's prompt number. Will be null if the cell has not been run.
   */
  executionCount: nbformat.ExecutionCount;

  /**
   * The cell outputs.
   */
  outputs: IOutputAreaModel;
}


/**
 * The definition of a markdown cell.
 */
export
interface IMarkdownCellModel extends ICellModel {
  /**
   * The type of the cell.
   */
  type: 'markdown';
 }


/**
 * The definition of a raw cell.
 */
export
interface IRawCellModel extends ICellModel {
  /**
   * The type of the cell.
   */
  type: 'raw';
}


/**
 * An implementation of the cell model.
 */
export
class CellModel extends CodeEditor.Model implements ICellModel {
  /**
   * Construct a cell model from optional cell content.
   */
  constructor(options: CellModel.IOptions) {
    super();
    this.value.changed.connect(this._onValueChanged, this);
    let cell = options.cell;
    if (!cell) {
      return;
    }
    if (Array.isArray(cell.source)) {
      this.value.text = (cell.source as string[]).join('\n');
    } else {
      this.value.text = cell.source as string;
    }
    let metadata = utils.copy(cell.metadata);
    if (this.type !== 'raw') {
      delete metadata['format'];
    }
    if (this.type !== 'code') {
      delete metadata['collapsed'];
      delete metadata['scrolled'];
    }
    this._metadata = metadata;

    this.stateChanged.connect( ()=> {
      this.synchronizeRequest.emit(void 0);
    });
  }

  /**
   * A signal emitted when the state of the model changes.
   */
  contentChanged: ISignal<this, void>;

  /**
   * A signal emitted when a metadata field changes.
   */
  metadataChanged: ISignal<this, IChangedArgs<any>>;

  /**
   * A signal emitted when a model state changes.
   */
  stateChanged: ISignal<this, IChangedArgs<any>>;

  /**
   * A signal emitted to synchronize with a realtime handler.
   */
  synchronizeRequest: ISignal<ICellModel, void>;

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    for (let key in this._cursors) {
      this._cursors[key].dispose();
    }
    this._cursors = null;
    this._metadata = null;
    super.dispose();
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICell {
    return {
      cell_type: this.type,
      source: this.value.text,
      metadata: utils.copy(this._metadata) as nbformat.IBaseCellMetadata
    } as nbformat.ICell;
  }

  /**
   * Get a metadata cursor for the cell.
   *
   * #### Notes
   * Metadata associated with the nbformat spec are set directly
   * on the model.  This method is used to interact with a namespaced
   * set of metadata on the cell.
   */
  getMetadata(name: string): IMetadataCursor {
    if (this.isDisposed) {
      return null;
    }
    if (name in this._cursors) {
      return this._cursors[name];
    }
    let cursor = new MetadataCursor(
      name,
      () => {
        return this._metadata[name];
      },
      (value: string) => {
        this.setCursorData(name, value);
      }
    );
    this._cursors[name] = cursor;
    return cursor;
  }

  /**
   * List the metadata namespace keys for the notebook.
   *
   * #### Notes
   * Metadata associated with the nbformat are not included.
   */
  listMetadata(): IIterator<string> {
    return iter(Object.keys(this._metadata));
  }

  /**
   * Set the cursor data for a given field.
   */
  protected setCursorData(name: string, newValue: any): void {
    let oldValue = this._metadata[name];
    if (deepEqual(oldValue, newValue)) {
      return;
    }
    this._metadata[name] = newValue;
    this.contentChanged.emit(void 0);
    this.metadataChanged.emit({ name, oldValue, newValue });
  }

  /**
   * The type of cell.
   */
  type: nbformat.CellType;

  /**
   * Handle a change to the observable value.
   */
  private _onValueChanged(sender: IObservableString, args: ObservableString.IChangedArgs): void {
    this.contentChanged.emit(void 0);
  }

  private _metadata: { [key: string]: any } = Object.create(null);
  private _cursors: { [key: string]: MetadataCursor } = Object.create(null);
}


/**
 * The namespace for `CellModel` statics.
 */
export
namespace CellModel {
  /**
   * The options used to initialize a `CellModel`.
   */
  export interface IOptions {
    /**
     * The source cell data.
     */
    cell?: nbformat.IBaseCell;
  }
}


// Define the signals for the `CellModel` class.
defineSignal(CellModel.prototype, 'contentChanged');
defineSignal(CellModel.prototype, 'metadataChanged');
defineSignal(CellModel.prototype, 'stateChanged');
defineSignal(CellModel.prototype, 'synchronizeRequest');


/**
 * An implementation of a raw cell model.
 */
export
class RawCellModel extends CellModel {
  /**
   * The type of the cell.
   */
  get type(): 'raw' {
    return 'raw';
  }
}


/**
 * An implementation of a markdown cell model.
 */
export
class MarkdownCellModel extends CellModel {
  /**
   * The type of the cell.
   */
  get type(): 'markdown' {
    return 'markdown';
  }
}


/**
 * An implementation of a code cell Model.
 */
export
class CodeCellModel extends CellModel implements ICodeCellModel {
  /**
   * Construct a new code cell with optional original cell content.
   */
  constructor(options: CodeCellModel.IOptions) {
    super(options);
    let factory = (options.contentFactory ||
      CodeCellModel.defaultContentFactory
    );
    this._outputs = factory.createOutputArea();
    let cell = options.cell as nbformat.ICodeCell;
    if (cell && cell.cell_type === 'code') {
      this.executionCount = cell.execution_count;
      for (let output of cell.outputs) {
        this._outputs.add(output);
      }
    }
    this._outputs.changed.connect(this._onOutputsChanged, this);
  }

  /**
   * The type of the cell.
   */
  get type(): 'code' {
    return 'code';
  }

  /**
   * The execution count of the cell.
   */
  get executionCount(): nbformat.ExecutionCount {
    return this._executionCount || null;
  }
  set executionCount(newValue: nbformat.ExecutionCount) {
    if (newValue === this._executionCount) {
      return;
    }
    let oldValue = this.executionCount;
    this._executionCount = newValue || null;
    this.contentChanged.emit(void 0);
    this.stateChanged.emit({ name: 'executionCount', oldValue, newValue });
  }

  /**
   * The cell outputs.
   */
  get outputs(): IOutputAreaModel {
    return this._outputs;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._outputs.dispose();
    this._outputs = null;
    super.dispose();
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICodeCell {
    let cell = super.toJSON() as nbformat.ICodeCell;
    cell.execution_count = this.executionCount || null;
    let outputs = this.outputs;
    cell.outputs = [];
    for (let i = 0; i < outputs.length; i++) {
      let output = outputs.get(i);
      if (output.output_type !== 'input_request') {
        cell.outputs.push(output as nbformat.IOutput);
      }
    }
    return cell;
  }

  /**
   * Handle the outputs changing.
   */
  private _onOutputsChanged(): void {
    this.contentChanged.emit(void 0);
  }

  private _outputs: IOutputAreaModel = null;
  private _executionCount: nbformat.ExecutionCount = null;
}


/**
 * The namespace for `CodeCellModel` statics.
 */
export
namespace CodeCellModel {
  /**
   * The options used to initialize a `CodeCellModel`.
   */
  export interface IOptions {
    /**
     * The source cell data.
     */
    cell?: nbformat.IBaseCell;

    /**
     * The factory for output area model creation.
     */
    contentFactory?: IContentFactory;
  }

  /**
   * A factory for creating code cell model content.
   */
  export
  interface IContentFactory {
    /**
     * Create an output area.
     */
    createOutputArea(): IOutputAreaModel;
  }

  /**
   * The default implementation of an `IContentFactory`.
   */
  export
  class ContentFactory {
    /**
     * Create an output area.
     */
    createOutputArea(): IOutputAreaModel {
      return new OutputAreaModel();
    }
  }

  /**
   * The shared `ConetntFactory` instance.
   */
  export
  const defaultContentFactory = new ContentFactory();
}
