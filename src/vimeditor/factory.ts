// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  utils
} from '@jupyterlab/services';

import {
  CodeEditor, IEditorFactory
} from '../codeeditor';

import {
  VimEditor
} from './editor';

import {
  IServiceManager
} from '../services';


/**
 * vim editor factory.
 */
export
class VimEditorFactory implements IEditorFactory {

  constructor( services: IServiceManager ) {
    this._services = services;
  }

  /**
   * Create a new editor for inline code.
   */
  newInlineEditor(host: HTMLElement, options: CodeEditor.IOptions): CodeEditor.IEditor {
    return this.newEditor(host, {}, options);
  }

  /**
   * Create a new editor for a full document.
   */
  newDocumentEditor(host: HTMLElement, options: CodeEditor.IOptions): CodeEditor.IEditor {
    return this.newEditor(host, {
      lineNumbers: true,
      lineWrapping: true
    }, options);
  }

  /**
   * Creates an editor and applies extra options.
   */
  protected newEditor(host: HTMLElement, editorOptions: any, options: CodeEditor.IOptions) {
    if (options.readOnly !== undefined) {
      editorOptions.readOnly = options.readOnly;
    }
    if (options.lineNumbers !== undefined) {
      editorOptions.lineNumbers = options.lineNumbers;
    }
    if (options.wordWrap !== undefined) {
      editorOptions.lineWrapping = options.wordWrap;
    }
    const editor = new VimEditor(host, editorOptions, this._services);
    return editor;
  }

  private _services : IServiceManager;

}
