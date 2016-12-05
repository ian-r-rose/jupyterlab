// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  TerminalSession
} from '@jupyterlab/services';

import {
  IServiceManager
} from '../services';

import {
  IChangedArgs
} from '../common/interfaces';

import {
  CodeEditor
} from '../codeeditor';

import {
  VimModel
} from './model';

import {
  TerminalWidget
} from '../terminal';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  sendMessage, Message
} from 'phosphor/lib/core/messaging';

/**
 * vim editor.
 */
export
class VimEditor implements CodeEditor.IEditor {

  /**
   * The uuid of this editor;
   */
  readonly uuid: string;

  /**
   * The selection style of this editor.
   */
  readonly selectionStyle?: CodeEditor.ISelectionStyle;

  /**
   * Handle keydown events for the editor.
   */
  onKeyDown: CodeEditor.KeydownHandler | null = null;

  /**
   * Construct a Vim editor.
   */
  constructor(host: HTMLElement, options: VimEditor.IOptions, services: IServiceManager) {
    this.uuid = this.uuid;
    this._model = new VimModel();
    let promise: Promise<TerminalSession.ISession>;
    this._ready = services.terminals.startNew().then( session => {
      return session.ready.then( () => {
        this._term = new TerminalWidget({background: 'black', color: 'white', fontSize: 13});
        this._term.session = session;
        this._term.session.send({
          type: 'stdin',
          content: ['vim\n:set lines=50 columns=100\n']
        });
        this._host = host;
      });
    });

  }

  /**
   * Tests whether the editor is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
  }

  /**
   * Control the rendering of line numbers.
   */
  get lineNumbers(): boolean {
    return false;
  }
  set lineNumbers(value: boolean) {
  }

  /**
   * Set to false for horizontal scrolling. Defaults to true.
   */
  get wordWrap(): boolean {
    return false;
  }
  set wordWrap(value: boolean) {
  }

  /**
   * Should the editor be read only.
   */
  get readOnly(): boolean {
    return false;
  }
  set readOnly(readOnly: boolean) {
  }

  /**
   * Returns a model for this editor.
   */
  get model(): CodeEditor.IModel {
    return this._model;
  }

  /**
   * The height of a line in the editor in pixels.
   */
  get lineHeight(): number {
    return 1;
  }

  /**
   * The widget of a character in the editor in pixels.
   */
  get charWidth(): number {
    return 1;
  }

  /**
   * Brings browser focus to this editor text.
   */
  focus(): void {
    //(this._term as any)._term.focus();
  }

  /**
   * Test whether the editor has keyboard focus.
   */
  hasFocus(): boolean {
    return false;
  }

  /**
   * Repaint editor.
   */
  refresh(): void {
  }

  /**
   * Set the size of the editor in pixels.
   */
  setSize(dimension: CodeEditor.IDimension | null): void {
    this._ready.then( () => {
      this._host.appendChild(this._term.node);
      sendMessage( this._term, new Message('fit-request'));
    });
    console.log(dimension);
  }

  /**
   * Reveal the given position in the editor.
   */
  revealPosition(position: CodeEditor.IPosition): void {
  }

  /**
   * Reveal the given selection in the editor.
   */
  revealSelection(selection: CodeEditor.IRange): void {
  }

  /**
   * Get the window coordinates given a cursor position.
   */
  getCoordinate(position: CodeEditor.IPosition): CodeEditor.ICoordinate {
    return void 0;
  }

  /**
   * Returns the primary position of the cursor, never `null`.
   */
  getCursorPosition(): CodeEditor.IPosition {
    return void 0;
  }

  /**
   * Set the primary position of the cursor. This will remove any secondary cursors.
   */
  setCursorPosition(position: CodeEditor.IPosition): void {
  }

  /**
   * Returns the primary selection, never `null`.
   */
  getSelection(): CodeEditor.ITextSelection {
    return void 0;
  }

  /**
   * Set the primary selection. This will remove any secondary cursors.
   */
  setSelection(selection: CodeEditor.IRange): void {
  }

  /**
   * Gets the selections for all the cursors, never `null` or empty.
   */
  getSelections(): CodeEditor.ITextSelection[] {
    return void 0;
  }

  /**
   * Sets the selections for all the cursors, should not be empty.
   * Cursors will be removed or added, as necessary.
   * Passing an empty array resets a cursor position to the start of a document.
   */
  setSelections(selections: CodeEditor.IRange[]): void {
  }

  private _model: VimModel;
  private _term: TerminalWidget;
  private _isDisposed = false;
  private _host: HTMLElement;
  private _ready: Promise<void>

}

/**
 * A namespace for `VimEditor`.
 */
export
namespace VimEditor {
  export
  interface IOptions {
  }
}
