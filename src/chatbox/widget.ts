// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Panel, PanelLayout
} from 'phosphor/lib/ui/panel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ChatboxContent
} from './content';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  CodeEditor, IEditorServices, IEditorMimeTypeService
} from '../codeeditor';

import {
  CodeEditorWidget
} from '../codeeditor/widget';

/**
 * The class name added to a chatboxwidget.
 */
const CHATBOX_CLASS = 'jp-Chatbox';
const CHATBOX_INPUT = 'jp-ChatboxInput';
const CHATBOX_LOG = 'jp-ChatboxLog';


/**
 * A widget for a chatbox
 */
export
class ChatboxWidget extends Widget {
  /**
   * Construct a new chatbox widget.
   */
  constructor(editorServices: IEditorServices) {
    super();
    this.addClass(CHATBOX_CLASS);

    let layout = this.layout = new PanelLayout();
    this._logPanel = new Panel();
    this._logPanel.addClass(CHATBOX_LOG);
    this._inputPanel = new Panel();
    this._inputPanel.addClass(CHATBOX_INPUT);

    const {factory, mimeTypeService} = editorServices;
    this._inputEditor = new CodeEditorWidget( (host: Widget)=> {
      let editor = factory.newInlineEditor(host.node, {
        lineNumbers: false,
        readOnly: false,
        wordWrap: true
      });
      return editor;
    });
    this._logEditor = new CodeEditorWidget( (host: Widget)=> {
      let editor = factory.newInlineEditor(host.node, {
        lineNumbers: false,
        readOnly: true,
        wordWrap: true
      });
      return editor;
    });
    layout.addWidget(this._logPanel);
    layout.addWidget(this._inputPanel);
    this._logPanel.addWidget(this._logEditor);
    this._inputPanel.addWidget(this._inputEditor);
    this._content = new ChatboxContent();
    this._content.newEntry.connect((content: ChatboxContent, entry: ChatboxContent.Entry)=>{
      let logText = this._logEditor.editor.model.value;
      let node = this._logPanel.node
      logText.text = logText.text+entry.text+'\n';
      this._logEditor.editor.setCursorPosition({
        line: this._logEditor.editor.model.lineCount,
        column: 0
      });
      this._logEditor.editor.focus();
      this._inputEditor.editor.focus();
    });
  }

  get content(): ChatboxContent {
    return this._content;
  }

  pushMessage(): void {
    let input = this._inputEditor.editor.model.value
    this.content.push(input.text, '');
    input.text = '';
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    super.dispose();
  }

  /**
   * Handle `update-request` messages for the widget.
   */
  protected onUpdateRequest(msg: Message): void {
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.focus();
  }
  private _content: ChatboxContent = null;
  private _inputEditor: CodeEditorWidget = null;
  private _logEditor: CodeEditorWidget = null;
  private _inputPanel: Panel = null;
  private _logPanel: Panel = null;
}
