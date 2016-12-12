// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ChatboxContent
} from './content';

import {
  Message
} from 'phosphor/lib/core/messaging';

/**
 * The class name added to a chatboxwidget.
 */
const CHATBOX_CLASS = 'jp-Chatbox';


/**
 * A widget for a chatbox
 */
export
class ChatboxWidget extends Widget {
  /**
   * Construct a new chatbox widget.
   */
  constructor() {
    super();
    this._content = new ChatboxContent();
    this._content.newEntry.connect((content: ChatboxContent, entry: string)=>{
      this.node.innerHTML = this.node.innerHTML+' '+entry;
    });
  }

  get content(): ChatboxContent {
    return this._content;
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
}
