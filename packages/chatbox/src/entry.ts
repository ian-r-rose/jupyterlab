// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget, PanelLayout
} from '@phosphor/widgets';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  ICollaborator
} from '@jupyterlab/coreutils';

import {
  MarkdownCellWidget
} from '@jupyterlab/cells';

/**
 * The class name added to the chatbox entries.
 */
export
const CHAT_ENTRY_CLASS = 'jp-ChatEntry';

/**
 * The class name added to chatbox badges.
 */
const CHAT_BADGE_CLASS = 'jp-ChatEntry-badge';


/**
 * A chat entry widget, which hosts a user badge and a markdown cell.
 */
export
class ChatEntry extends Widget {
  /**
   * Construct a chat entry widget.
   */
  constructor(options: ChatEntry.IOptions) {
    super();
    this.addClass(CHAT_ENTRY_CLASS);
    this.model = options.model;

    this.layout = new PanelLayout();

    let color = this.model.author.color;
    let r = parseInt(color.slice(1,3), 16);
    let g = parseInt(color.slice(3,5), 16);
    let b = parseInt(color.slice(5,7), 16);

    this._badge = new Widget();
    this._badge.addClass(CHAT_BADGE_CLASS);
    this._badge.node.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.1)`;
    this._badge.node.textContent = this.model.author.shortName;

    this.cell = options.cell;
    this.cell.node.style.backgroundColor =
      `rgba(${r}, ${g}, ${b}, 0.1)`;

    let layout = this.layout as PanelLayout;
    layout.addWidget(this._badge);
    layout.addWidget(this.cell);
  }

  /**
   * Get the underlying model for the entry.
   */
  readonly model: ChatEntry.IModel;

  /**
   * The underlying cell widget for the entry.
   */
  readonly cell: MarkdownCellWidget;

  private _badge: Widget = null;
}


/**
 * The namespace for `InputAreaWidget` statics.
 */
export
namespace ChatEntry {
  /**
   * Options for creating a chat entry widget.
   */
  export
  interface IOptions {
    /**
     * A chat entry model for the widget.
     */
    model: IModel;

    /**
     * A markdown widget for rendering the entry.
     */
    cell: MarkdownCellWidget;
  }

  /**
   * An interface for an entry in the chat log.
   */
  export
  interface IModel extends JSONObject {
    /**
     * The text of the chat entry.
     */
    text: string;

    /**
     * The collaborator who logged the entry.
     */
    author: ICollaborator;
  }
}
