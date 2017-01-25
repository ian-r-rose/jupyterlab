// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import 'codemirror/mode/meta';

import {
  Contents
} from '@jupyterlab/services';

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';

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
  DocumentRegistry
} from './index';

import {
  IRealtimeHandler, IRealtimeModel
} from '../realtime';

import {
  ObservableString, IObservableString
} from '../common/observablestring';


/**
 * The default implementation of a document model.
 */
export
class DocumentModel extends CodeEditor.Model implements DocumentRegistry.ICodeModel, IRealtimeModel  {
  /**
   * Construct a new document model.
   */
  constructor(languagePreference?: string) {
    super();
    this._defaultLang = languagePreference || '';
    this.value.changed.connect(this._onValueChanged, this);
  }

  /**
   * A signal emitted when the document content changes.
   */
  contentChanged: ISignal<this, void>;

  /**
   * A signal emitted when the document state changes.
   */
  stateChanged: ISignal<this, IChangedArgs<any>>;

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
   * Serialize the model to a string.
   */
  toString(): string {
    return this.value.text;
  }

  /**
   * Deserialize the model from a string.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromString(value: string): void {
    this.value.text = value;
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): any {
    return JSON.stringify(this.value.text);
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
   * Handle a change to the observable value.
   */
  private _onValueChanged(sender: IObservableString, args: ObservableString.IChangedArgs): void {
    this.contentChanged.emit(void 0);
    this.dirty = true;
  }

  /**
   * Describe the model to an existing RealtimeHandler.
   * Meant to be subclassed by other DocumentModels.
   */
  registerCollaborative( realtimeHandler : IRealtimeHandler ) : Promise<void> {
    return new Promise<void>((resolve,reject)=>{
      this._realtime = realtimeHandler;

      //create a new realtime string
      this._realtime.createString(this._text.text).then((str: IObservableString)=>{
        let oldStr = this._text;
        this._text = str;
        //connect the realtime string to the correct signals
        this._text.changed.connect(()=>{
          this.contentChanged.emit(void 0);
          this.dirty = true;
        });
        //get rid of the old string.
        oldStr.dispose();
        resolve();
      }).catch(()=>{
        console.log("Unable to register document as collaborative");
      });
    });
  }

  private _text: IObservableString = new ObservableString('');
  private _defaultLang = '';
  private _dirty = false;
  private _readOnly = false;
  private _isDisposed = false;
  private _realtime : IRealtimeHandler = null;
}


// Define the signals for the `DocumentModel` class.
defineSignal(DocumentModel.prototype, 'contentChanged');
defineSignal(DocumentModel.prototype, 'stateChanged');


/**
 * An implementation of a model factory for text files.
 */
export
class TextModelFactory implements DocumentRegistry.CodeModelFactory {
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
  get contentType(): Contents.ContentType {
    return 'file';
  }

  /**
   * The format of the file.
   *
   * This is a read-only property.
   */
  get fileFormat(): Contents.FileFormat {
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
  createNew(languagePreference?: string): DocumentRegistry.ICodeModel {
    return new DocumentModel(languagePreference);
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
  get contentType(): Contents.ContentType {
    return 'file';
  }

  /**
   * The format of the file.
   *
   * This is a read-only property.
   */
  get fileFormat(): Contents.FileFormat {
    return 'base64';
  }
}


/**
 * The default implemetation of a widget factory.
 */
export
abstract class ABCWidgetFactory<T extends Widget, U extends DocumentRegistry.IModel> implements DocumentRegistry.IWidgetFactory<T, U> {
  /**
   * Construct a new `ABCWidgetFactory`.
   */
  constructor(options: DocumentRegistry.IWidgetFactoryOptions) {
    this._name = options.name;
    this._defaultFor = options.defaultFor ? options.defaultFor.slice() : [];
    this._fileExtensions = options.fileExtensions.slice();
    this._modelName = options.modelName || 'text';
    this._preferKernel = !!options.preferKernel;
    this._canStartKernel = !!options.canStartKernel;
  }

  /**
   * A signal emitted when a widget is created.
   */
  widgetCreated: ISignal<DocumentRegistry.IWidgetFactory<T, U>, T>;

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
   * The name of the widget to display in dialogs.
   */
  get name(): string {
    return this._name;
  }

  /**
   * The file extensions the widget can view.
   */
  get fileExtensions(): string[] {
    return this._fileExtensions.slice();
  }

  /**
   * The registered name of the model type used to create the widgets.
   */
  get modelName(): string {
    return this._modelName;
  }

  /**
   * The file extensions for which the factory should be the default.
   */
  get defaultFor(): string[] {
    return this._defaultFor.slice();
  }

  /**
   * Whether the widgets prefer having a kernel started.
   */
  get preferKernel(): boolean {
    return this._preferKernel;
  }

  /**
   * Whether the widgets can start a kernel when opened.
   */
  get canStartKernel(): boolean {
    return this._canStartKernel;
  }

  /**
   * Create a new widget given a document model and a context.
   *
   * #### Notes
   * It should emit the [widgetCreated] signal with the new widget.
   */
  createNew(context: DocumentRegistry.IContext<U>): T {
    let widget = this.createNewWidget(context);
    this.widgetCreated.emit(widget);
    return widget;
  }

  /**
   * Create a widget for a context.
   */
  protected abstract createNewWidget(context: DocumentRegistry.IContext<U>): T;

  private _isDisposed = false;
  private _name: string;
  private _canStartKernel: boolean;
  private _preferKernel: boolean;
  private _modelName: string;
  private _fileExtensions: string[];
  private _defaultFor: string[];
}


// Define the signals for the `ABCWidgetFactory` class.
defineSignal(ABCWidgetFactory.prototype, 'widgetCreated');
