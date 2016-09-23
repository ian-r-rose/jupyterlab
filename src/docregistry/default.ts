// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import 'codemirror/mode/meta';

import {
  IContents, IKernel
} from 'jupyter-js-services';

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  IChangedArgs
} from '../common/interfaces';

import {
  IDocumentModel, IDocumentContext, IModelFactory,
  IWidgetFactory
} from './index';

import {
  authorize
} from '../google/gapiauth';



/**
 * The default implementation of a document model.
 */
export
class DocumentModel implements IDocumentModel {
  /**
   * Construct a new document model.
   */
  constructor(languagePreference?: string) {
    this._defaultLang = languagePreference || '';
  }

  /**
   * A signal emitted when the document content changes.
   */
  contentChanged: ISignal<IDocumentModel, void>;

  /**
   * A signal emitted when the document state changes.
   */
  stateChanged: ISignal<IDocumentModel, IChangedArgs<any>>;

  /**
   * Get whether the model factory has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The dirty state of the document.
   */
  get dirty(): boolean {
    return this._dirty;
  }
  set dirty(newValue: boolean) {
    if (newValue === this._dirty) {
      return;
    }
    let oldValue = this._dirty;
    this._dirty = newValue;
    this.stateChanged.emit({ name: 'dirty', oldValue, newValue });
  }

  /**
   * The read only state of the document.
   */
  get readOnly(): boolean {
    return this._readOnly;
  }
  set readOnly(newValue: boolean) {
    if (newValue === this._readOnly) {
      return;
    }
    let oldValue = this._readOnly;
    this._readOnly = newValue;
    this.stateChanged.emit({ name: 'readOnly', oldValue, newValue });
  }

  /**
   * The default kernel name of the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  get defaultKernelName(): string {
    return '';
  }

  /**
   * The default kernel language of the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  get defaultKernelLanguage(): string {
    return this._defaultLang;
  }

  /**
   * Dispose of the resources held by the document manager.
   */
  dispose(): void {
    this._isDisposed = true;
  }

  /**
   * Serialize the model to a string.
   */
  toString(): string {
    return this._text;
  }

  /**
   * Deserialize the model from a string.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromString(value: string): void {
    if (this._text === value) {
      return;
    }
    this._text = value;
    this._collaborativeString.setText(value);
    this.contentChanged.emit(void 0);
    this.dirty = true;
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): any {
    return JSON.stringify(this._text);
  }

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromJSON(value: any): void {
    this.fromString(JSON.parse(value));
  }

  /**
   * Register for collaborative string usage.
   */
  registerCollaborative( collaborativeString: gapi.drive.realtime.CollaborativeString): void {
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

  private _text = '';
  private _defaultLang = '';
  private _dirty = false;
  private _readOnly = false;
  private _isDisposed = false;
  private _collaborativeString : gapi.drive.realtime.CollaborativeString = null;
}

// Define the signals for the `DocumentModel` class.
defineSignal(DocumentModel.prototype, 'contentChanged');
defineSignal(DocumentModel.prototype, 'stateChanged');


/**
 * An implementation of a model factory for text files.
 */
export
class TextModelFactory implements IModelFactory<IDocumentModel> {
  /**
   * Constructor for TextModelFactory.
   * This currently just sets up a collaborative model.
   */
  constructor() {
    authorize();
    this._doc = gapi.drive.realtime.newInMemoryDocument();
    this._model = this._doc.getModel();
    this._collaborativeString = this._model.createString();
  }

  /**
   * The name of the model type.
   *
   * #### Notes
   * This is a read-only property.
   */
  get name(): string {
    return 'text';
  }

  /**
   * The type of the file.
   *
   * #### Notes
   * This is a read-only property.
   */
  get fileType(): IContents.FileType {
    return 'file';
  }

  /**
   * The format of the file.
   *
   * This is a read-only property.
   */
  get fileFormat(): IContents.FileFormat {
    return 'text';
  }

  /**
   * Get whether the model factory has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the model factory.
   */
  dispose(): void {
    this._isDisposed = true;
  }

  /**
   * Create a new model.
   *
   * @param languagePreference - An optional kernel language preference.
   *
   * @returns A new document model.
   */
  createNew(languagePreference?: string): IDocumentModel {
    let docModel = new DocumentModel(languagePreference);
    docModel.registerCollaborative(this._collaborativeString);
    return docModel;
  }

  /**
   * Get the preferred kernel language given an extension.
   */
  preferredLanguage(ext: string): string {
    let mode = CodeMirror.findModeByExtension(ext.slice(1));
    if (mode) {
      return mode.mode;
    }
  }

  private _isDisposed = false;
  private _doc: gapi.drive.realtime.Document = null;
  private _model : gapi.drive.realtime.Model = null;
  private _collaborativeString : gapi.drive.realtime.CollaborativeString = null;
}


/**
 * An implementation of a model factory for base64 files.
 */
export
class Base64ModelFactory extends TextModelFactory {
  /**
   * The name of the model type.
   *
   * #### Notes
   * This is a read-only property.
   */
  get name(): string {
    return 'base64';
  }

  /**
   * The type of the file.
   *
   * #### Notes
   * This is a read-only property.
   */
  get fileType(): IContents.FileType {
    return 'file';
  }

  /**
   * The format of the file.
   *
   * This is a read-only property.
   */
  get fileFormat(): IContents.FileFormat {
    return 'base64';
  }
}


/**
 * The default implemetation of a widget factory.
 */
export
abstract class ABCWidgetFactory<T extends Widget, U extends IDocumentModel> implements IWidgetFactory<T, U> {
  /**
   * A signal emitted when a widget is created.
   */
  widgetCreated: ISignal<IWidgetFactory<T, U>, T>;

  /**
   * Get whether the model factory has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the document manager.
   */
  dispose(): void {
    this._isDisposed = true;
  }

  /**
   * Create a new widget given a document model and a context.
   *
   * #### Notes
   * It should emit the [widgetCreated] signal with the new widget.
   */
  abstract createNew(context: IDocumentContext<U>, kernel?: IKernel.IModel): T;

  private _isDisposed = false;
}


// Define the signals for the `ABCWidgetFactory` class.
defineSignal(ABCWidgetFactory.prototype, 'widgetCreated');
