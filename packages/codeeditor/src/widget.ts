// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  PathExt
} from '@jupyterlab/coreutils';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  IDragEvent
} from '@phosphor/dragdrop';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  CodeEditor
} from './';

/**
 * The mime type for a contents drag object.
 */
const CONTENTS_MIME = 'application/x-jupyter-icontents';

/**
 * The class name added to an editor widget that has a primary selection.
 */
const HAS_SELECTION_CLASS = 'jp-mod-has-primary-selection';


/**
 * A widget which hosts a code editor.
 */
export
class CodeEditorWrapper extends Widget {
  /**
   * Construct a new code editor widget.
   */
  constructor(options: CodeEditorWrapper.IOptions) {
    super();
    const editor = this.editor = options.factory({
      host: this.node,
      model: options.model,
      uuid: options.uuid,
      config: options.config,
      selectionStyle: options.selectionStyle
    });
    editor.model.selections.changed.connect(this._onSelectionsChanged, this);
    this._resolver = options.resolver;
  }

  /**
   * Get the editor wrapped by the widget.
   */
  readonly editor: CodeEditor.IEditor;

  /**
   * Get the model used by the widget.
   */
  get model(): CodeEditor.IModel {
    return this.editor.model;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    super.dispose();
    this.editor.dispose();
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the notebook panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'p-dragenter':
        this._evtDragEnter(event as IDragEvent);
        break;
      case 'p-dragover':
        this._evtDragOver(event as IDragEvent);
        break;
      case 'p-dragleave':
        this._evtDragLeave(event as IDragEvent);
        break;
      case 'p-drop':
        this._evtDrop(event as IDragEvent);
        break;
      default:
        break;
    }
  }


  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.editor.focus();
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    if (this.isVisible) {
      this.update();
    }
    this.node.addEventListener('p-drop', this);
    this.node.addEventListener('p-dragenter', this);
    this.node.addEventListener('p-dragover', this);
    this.node.addEventListener('p-dragleave', this);
  }


  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('p-drop', this);
    this.node.removeEventListener('p-dragenter', this);
    this.node.removeEventListener('p-dragover', this);
    this.node.removeEventListener('p-dragleave', this);
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    this.update();
  }

  /**
   * A message handler invoked on a `'resize'` message.
   */
  protected onResize(msg: Widget.ResizeMessage): void {
    if (msg.width >= 0 && msg.height >= 0) {
      this.editor.setSize(msg);
    } else if (this.isVisible) {
      this.editor.resizeToFit();
    }
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    this.editor.refresh();
  }

  /**
   * Handle a change in model selections.
   */
  private _onSelectionsChanged(): void {
    const { start, end } = this.editor.getSelection();

    if (start.column !== end.column || start.line !== end.line) {
      this.addClass(HAS_SELECTION_CLASS);
    } else {
      this.removeClass(HAS_SELECTION_CLASS);
    }
  }

  /**
   * Handle the `'p-dragenter'` event for the dock panel.
   */
  private _evtDragEnter(event: IDragEvent): void {
    // If the factory mime type is present, mark the event as
    // handled in order to get the rest of the drag events.
    if (event.mimeData.hasData(CONTENTS_MIME)) {
      event.preventDefault();
      event.stopPropagation();
    }
    console.log('Enter');
  }

  /**
   * Handle the `'p-dragleave'` event for the dock panel.
   */
  private _evtDragLeave(event: IDragEvent): void {
    // Mark the event as handled.
    event.preventDefault();
    event.stopPropagation();
    console.log('Leave');
  }

  /**
   * Handle the `'p-dragover'` event for the dock panel.
   */
  private _evtDragOver(event: IDragEvent): void {
    // Mark the event as handled.
    event.preventDefault();
    event.stopPropagation();
    console.log('Over');
  }

  private _evtDrop(event: IDragEvent): void {
    console.log('Drop');
    // If the editor is not markdown, do nothing.
    if (!Private.isMarkdown(this.editor.model.mimeType) ||
      !this._resolver ||
       event.proposedAction === 'none' ||
      !event.mimeData.hasData(CONTENTS_MIME)
    ) {
      return;
    }
    const paths = event.mimeData.getData(CONTENTS_MIME) as string[];
    const imagePaths = paths.filter(Private.isImage);
    if (!imagePaths.length) {
      return;
    }

    const position = this.editor.getPositionForCoordinate({
      top: event.clientY,
      left: event.clientX,
      bottom: event.clientY,
      right: event.clientX,
      width: 0,
      height: 0,
    });
    this._insertImageLinks(position, imagePaths);
    event.preventDefault();
    event.stopPropagation();
  }

  private _insertImageLinks(position: CodeEditor.IPosition, paths: string[]): Promise<void> {
    return this._resolver.resolveUrl('').then(filePath => {
      let offset = this.editor.getOffsetAt(position);
      this.editor.setCursorPosition(position);
      paths.forEach(path => {
        const relPath = PathExt.relative(filePath, path);
        const link = `![](${relPath})\n`;
        this.editor.model.value.insert(offset, `![](${relPath})\n`);
        offset += link.length;
      });
      this.editor.focus();
      return void 0;
    });
  }

  private _resolver: IRenderMime.IResolver | undefined;
}


/**
 * The namespace for the `CodeEditorWrapper` statics.
 */
export
namespace CodeEditorWrapper {
  /**
   * The options used to initialize a code editor widget.
   */
  export
  interface IOptions {
    /**
     * A code editor factory.
     *
     * #### Notes
     * The widget needs a factory and a model instead of a `CodeEditor.IEditor`
     * object because it needs to provide its own node as the host.
     */
    factory: CodeEditor.Factory;

    /**
     * The model used to initialize the code editor.
     */
    model: CodeEditor.IModel;

    /**
     * The desired uuid for the editor.
     */
    uuid?: string;

    /**
     * The configuration options for the editor.
     */
    config?: Partial<CodeEditor.IConfig>;

   /**
    * The default selection style for the editor.
    */
    selectionStyle?: CodeEditor.ISelectionStyle;

    /**
     * A link resolver for the editor.
     */
    resolver?: IRenderMime.IResolver;
  }
}

/**
 * A private namespace for code editor statics.
 */
export
namespace Private {
  /**
   * Whether a mimetype is markdown.
   */
  export
  function isMarkdown(mime: string): boolean {
    return (
      mime === 'text/x-ipythongfm' ||
      mime === 'text/x-markdown' ||
      mime === 'text/x-gfm' ||
      mime === 'text/markdown'
    );
  }

  /**
   * Whether a path matches an image type.
   */
  export
  function isImage(path: string): boolean {
    const imageExtensions = [
      '.png',
      '.jpg',
      '.jpeg',
      '.tif',
      '.tiff',
      '.gif',
      '.bmp'
    ];
    const ext = PathExt.extname(path).toLowerCase();
    return imageExtensions.indexOf(ext) !== -1;
  }

}
