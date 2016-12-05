// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISignal, clearSignalData, defineSignal
} from 'phosphor/lib/core/signaling';

import {
  CodeEditor
} from '../codeeditor/editor';

import {
  IChangedArgs
} from '../common/interfaces';


/**
 * An implementation of the code editor model using code mirror.
 */
export
  class VimModel implements CodeEditor.IModel {

  /**
   * A signal emitted when a content of the model changed.
   */
  readonly valueChanged: ISignal<this, IChangedArgs<string>>;

  /**
   * A signal emitted when a mimetype changes.
   */
  readonly mimeTypeChanged: ISignal<this, IChangedArgs<string>>;

  /**
   * Get the selections for the model.
   */
  readonly selections: CodeEditor.ISelections = new CodeEditor.Selections();

  /**
   * Construct a new codemirror model.
   */
  constructor() {
  }

  /**
   * Whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dipose of the resources used by the model.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    clearSignalData(this);
  }

  /**
   * A mime type of the model.
   */
  get mimeType(): string {
    return this._mimetype;
  }
  set mimeType(newValue: string) {
    const oldValue = this._mimetype;
    if (oldValue === newValue) {
      return;
    }
    this._mimetype = newValue;
    this.mimeTypeChanged.emit({
      name: 'mimeType',
      oldValue,
      newValue
    });
  }

  /**
   * The text stored in the model.
   */
  get value(): string {
    return '';
  }
  set value(value: string) {
  }

  /**
   * Get the number of lines in the model.
   */
  get lineCount(): number {
    return 0;
  }

  /**
   * Returns the content for the given line number.
   */
  getLine(line: number): string {
    return '';
  }

  /**
   * Find an offset for the given position.
   */
  getOffsetAt(position: CodeEditor.IPosition): number {
    return 0;
  }

  /**
   * Find a position fot the given offset.
   */
  getPositionAt(offset: number): CodeEditor.IPosition {
    return void 0;
  }

  /**
   * Undo one edit (if any undo events are stored).
   */
  undo(): void {
  }

  /**
   * Redo one undone edit.
   */
  redo(): void {
  }

  /**
   * Clear the undo history.
   */
  clearHistory(): void {
  }

  private _mimetype = '';
  private _value: string;
  private _isDisposed = false;
}


defineSignal(VimModel.prototype, 'valueChanged');
defineSignal(VimModel.prototype, 'mimeTypeChanged');
