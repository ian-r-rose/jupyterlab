// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, nbformat
} from '@jupyterlab/services';

import {
  each
} from 'phosphor/lib/algorithm/iteration';

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  ISequence
} from 'phosphor/lib/algorithm/sequence';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  MimeData
} from 'phosphor/lib/core/mimedata';

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Drag
} from 'phosphor/lib/dom/dragdrop';

import {
  PanelLayout
} from 'phosphor/lib/ui/panel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ObservableVector
} from '../common/observablevector';

import {
  RenderMime
} from '../rendermime';

import {
  IOutputAreaModel, OutputAreaModel
} from './model';


/**
 * The threshold in pixels to start a drag event.
 */
const DRAG_THRESHOLD = 5;

/**
 * The factory MIME type supported by phosphor dock panels.
 */
const FACTORY_MIME = 'application/vnd.phosphor.widget-factory';

/**
 * The class name added to an output area widget.
 */
const OUTPUT_AREA_CLASS = 'jp-OutputArea';

/**
 * The class name added to a "mirrored" output area widget created by a drag.
 */
const MIRRORED_OUTPUT_AREA_CLASS = 'jp-MirroredOutputArea';

/**
 * The class name added to an output widget.
 */
const OUTPUT_CLASS = 'jp-Output';

/**
 * The class name added to an execute result.
 */
const EXECUTE_CLASS = 'jp-Output-executeResult';

/**
 * The class name added to display data.
 */
const DISPLAY_CLASS = 'jp-Output-displayData';

/**
 * The class name added to stdout data.
 */
const STDOUT_CLASS = 'jp-Output-stdout';

/**
 * The class name added to stderr data.
 */
const STDERR_CLASS = 'jp-Output-stderr';

/**
 * The class name added to error data.
 */
const ERROR_CLASS = 'jp-Output-error';

/**
 * The class name added to stdin data.
 */
const STDIN_CLASS = 'jp-Output-stdin';

/**
 * The class name added to stdin data prompt nodes.
 */
const STDIN_PROMPT_CLASS = 'jp-Output-stdinPrompt';

/**
 * The class name added to stdin data input nodes.
 */
const STDIN_INPUT_CLASS = 'jp-Output-stdinInput';

/**
 * The class name added to stdin rendered text nodes.
 */
const STDIN_RENDERED_CLASS = 'jp-Output-stdinRendered';

/**
 * The class name added to fixed height output areas.
 */
const FIXED_HEIGHT_CLASS = 'jp-mod-fixedHeight';

/**
 * The class name added to collaped output areas.
 */
const COLLAPSED_CLASS = 'jp-mod-collapsed';

/**
 * The class name added to output area prompts.
 */
const PROMPT_CLASS = 'jp-Output-prompt';

/**
 * The class name added to output area results.
 */
const RESULT_CLASS = 'jp-Output-result';


/**
 * An output area widget.
 *
 * #### Notes
 * The widget model must be set separately and can be changed
 * at any time.  Consumers of the widget must account for a
 * `null` model, and may want to listen to the `modelChanged`
 * signal.
 */
export
class OutputAreaWidget extends Widget {
  /**
   * Construct an output area widget.
   */
  constructor(options: OutputAreaWidget.IOptions) {
    super();
    this.addClass(OUTPUT_AREA_CLASS);
    this.rendermime = options.rendermime;
    this.contentFactory = (
      options.contentFactory || OutputAreaWidget.defaultContentFactory
    );
    this.layout = new PanelLayout();
  }

  /**
   * Create a mirrored output widget.
   */
  mirror(): OutputAreaWidget {
    let rendermime = this.rendermime;
    let contentFactory = this.contentFactory;
    let widget = new OutputAreaWidget({ rendermime, contentFactory });
    widget.model = this._model;
    widget.trusted = this._trusted;
    widget.title.label = 'Mirrored Output';
    widget.title.closable = true;
    widget.addClass(MIRRORED_OUTPUT_AREA_CLASS);
    return widget;
  }

  /**
   * A signal emitted when the widget's model changes.
   */
  readonly modelChanged: ISignal<this, void>;

  /**
   * A signal emitted when the widget's model is disposed.
   */
  readonly modelDisposed: ISignal<this, void>;

  /**
   * Te rendermime instance used by the widget.
   */
  readonly rendermime: RenderMime;

  /**
   * The content factory used by the widget.
   */
  readonly contentFactory: OutputAreaWidget.IContentFactory;

  /**
   * A read-only sequence of the widgets in the output area.
   */
  get widgets(): ISequence<OutputWidget> {
    return (this.layout as PanelLayout).widgets as ISequence<OutputWidget>;
  }

  /**
   * The model for the widget.
   */
  get model(): IOutputAreaModel {
    return this._model;
  }
  set model(newValue: IOutputAreaModel) {
    if (!newValue && !this._model || newValue === this._model) {
      return;
    }
    let oldValue = this._model;
    this._model = newValue;
    // Trigger private, protected, and public updates.
    this._onModelChanged(oldValue, newValue);
    this.onModelChanged(oldValue, newValue);
    this.modelChanged.emit(void 0);
  }

  /**
   * The trusted state of the widget.
   */
  get trusted(): boolean {
    return this._trusted;
  }
  set trusted(value: boolean) {
    if (this._trusted === value) {
      return;
    }
    this._trusted = value;
    // Trigger a update of the child widgets.
    let layout = this.layout as PanelLayout;
    for (let i = 0; i < layout.widgets.length; i++) {
      this.updateChild(i);
    }
  }

  /**
   * The collapsed state of the widget.
   */
  get collapsed(): boolean {
    return this._collapsed;
  }
  set collapsed(value: boolean) {
    if (this._collapsed === value) {
      return;
    }
    this._collapsed = value;
    this.update();
  }

  /**
   * The fixed height state of the widget.
   */
  get fixedHeight(): boolean {
    return this._fixedHeight;
  }
  set fixedHeight(value: boolean) {
    if (this._fixedHeight === value) {
      return;
    }
    this._fixedHeight = value;
    this.update();
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    this._model = null;
    super.dispose();
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this.collapsed) {
      this.addClass(COLLAPSED_CLASS);
    } else {
      this.removeClass(COLLAPSED_CLASS);
    }
    if (this.fixedHeight) {
      this.addClass(FIXED_HEIGHT_CLASS);
    } else {
      this.removeClass(FIXED_HEIGHT_CLASS);
    }
  }

  /**
   * Add a child to the layout.
   */
  protected addChild(): void {
    let rendermime = this.rendermime;
    let widget = this.contentFactory.createOutput({ rendermime });
    let layout = this.layout as PanelLayout;
    layout.addWidget(widget);
    this.updateChild(layout.widgets.length - 1);
  }

  /**
   * Remove a child from the layout.
   */
  protected removeChild(index: number): void {
    let layout = this.layout as PanelLayout;
    layout.widgets.at(index).dispose();
  }

  /**
   * Update a child in the layout.
   */
  protected updateChild(index: number): void {
    let layout = this.layout as PanelLayout;
    let widget = layout.widgets.at(index) as OutputWidget;
    let output = this._model.at(index);
    let injector: (mimetype: string, value: string | JSONObject) => void;
    if (output.output_type === 'display_data' ||
        output.output_type === 'execute_result') {
      injector = (mimetype: string, value: string | JSONObject) => {
        this._injecting = true;
        this._model.addMimeData(
          output as nbformat.IDisplayData, mimetype, value
        );
        this._injecting = false;
      };
    }
    let trusted = this._trusted;
    widget.render({ output, trusted, injector });
  }

  /**
   * Follow changes on the model state.
   */
  protected onModelStateChanged(sender: IOutputAreaModel, args: ObservableVector.IChangedArgs<nbformat.IOutput>) {
    switch (args.type) {
    case 'add':
      // Children are always added at the end.
      this.addChild();
      break;
    case 'remove':
      // Only "clear" is supported by the model.
      // When an output area is cleared and then quickly replaced with new
      // content (as happens with @interact in widgets, for example), the
      // quickly changing height can make the page jitter.
      // We introduce a small delay in the minimum height
      // to prevent this jitter.
      let rect = this.node.getBoundingClientRect();
      this.node.style.minHeight = `${rect.height}px`;
      if (this._minHeightTimeout) {
        clearTimeout(this._minHeightTimeout);
      }
      this._minHeightTimeout = setTimeout(() => {
        if (this.isDisposed) {
          return;
        }
        this.node.style.minHeight = '';
      }, 50);
      each(args.oldValues, value => {
        this.removeChild(args.oldIndex);
      });
      break;
    case 'set':
      if (!this._injecting) {
        this.updateChild(args.newIndex);
      }
      break;
    default:
      break;
    }
    this.update();
  }

  /**
   * Handle a new model.
   *
   * #### Notes
   * This method is called after the model change has been handled
   * internally and before the `modelChanged` signal is emitted.
   * The default implementation is a no-op.
   */
  protected onModelChanged(oldValue: IOutputAreaModel, newValue: IOutputAreaModel): void {
    // no-op
  }

  /**
   * Handle a change to the model.
   */
  private _onModelChanged(oldValue: IOutputAreaModel, newValue: IOutputAreaModel): void {
    let layout = this.layout as PanelLayout;
    if (oldValue) {
      oldValue.changed.disconnect(this.onModelStateChanged, this);
      oldValue.disposed.disconnect(this._onModelDisposed, this);
    }

    let start = newValue ? newValue.length : 0;
    // Clear unnecessary child widgets.
    while (layout.widgets.length > start) {
      this.removeChild(start);
    }
    if (!newValue) {
      return;
    }

    newValue.changed.connect(this.onModelStateChanged, this);
    newValue.disposed.connect(this._onModelDisposed, this);

    // Reuse existing child widgets.
    for (let i = 0; i < layout.widgets.length; i++) {
      this.updateChild(i);
    }
    // Add new widgets as necessary.
    for (let i = layout.widgets.length; i < newValue.length; i++) {
      this.addChild();
    }
  }

  /**
   * Handle a model disposal.
   */
  protected onModelDisposed(oldValue: IOutputAreaModel, newValue: IOutputAreaModel): void {
    // no-op
  }

  private _onModelDisposed(): void {
    this.modelDisposed.emit(void 0);
    this.dispose();
  }

  private _trusted = false;
  private _fixedHeight = false;
  private _collapsed = false;
  private _minHeightTimeout: number = null;
  private _model: IOutputAreaModel = null;
  private _injecting = false;
}


/**
 * A namespace for OutputAreaWidget statics.
 */
export
namespace OutputAreaWidget {
  /**
   * The options to pass to an `OutputAreaWidget`.
   */
  export
  interface IOptions {
    /**
     * The rendermime instance used by the widget.
     */
    rendermime: RenderMime;

    /**
     * The output widget content factory.
     *
     * Defaults to a shared `IContentFactory` instance.
     */
     contentFactory?: IContentFactory;
  }

  /**
   * An output widget content factory.
   */
  export
  interface IContentFactory {
    /**
     * Create an output widget.
     *
     *
     * @returns A new widget for an output.
     */
    createOutput(options: OutputWidget.IOptions): Widget;
  }

  /**
   * The default implementation of `IContentFactory`.
   */
  export
  class ContentFactory implements IContentFactory {
    /**
     * Create an output widget.
     *
     *
     * @returns A new widget for an output.
     */
    createOutput(options: OutputWidget.IOptions): OutputWidget {
      return new OutputWidget(options);
    }
  }

  /**
   * The default `ContentFactory` instance.
   */
  export
  const defaultContentFactory = new ContentFactory();
}


/**
 * The gutter on the left side of the OutputWidget
 */
export
class OutputGutter extends Widget {
  /**
   * Handle the DOM events for the output gutter widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the panel's DOM node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'mousedown':
      this._evtMousedown(event as MouseEvent);
      break;
    case 'mouseup':
      this._evtMouseup(event as MouseEvent);
      break;
    case 'mousemove':
      this._evtMousemove(event as MouseEvent);
      break;
    default:
      break;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('mousedown', this);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    let node = this.node;
    node.removeEventListener('mousedown', this);
  }

  /**
   * Handle the `'mousedown'` event for the widget.
   */
  private _evtMousedown(event: MouseEvent): void {
    // Left mouse press for drag start.
    if (event.button === 0) {
      this._dragData = { pressX: event.clientX, pressY: event.clientY };
      document.addEventListener('mouseup', this, true);
      document.addEventListener('mousemove', this, true);
    }
  }

  /**
   * Handle the `'mouseup'` event for the widget.
   */
  private _evtMouseup(event: MouseEvent): void {
    if (event.button !== 0 || !this._drag) {
      document.removeEventListener('mousemove', this, true);
      document.removeEventListener('mouseup', this, true);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle the `'mousemove'` event for the widget.
   */
  private _evtMousemove(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Bail if we are the one dragging.
    if (this._drag) {
      return;
    }

    // Check for a drag initialization.
    let data = this._dragData;
    let dx = Math.abs(event.clientX - data.pressX);
    let dy = Math.abs(event.clientY - data.pressY);
    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
      return;
    }

    this._startDrag(event.clientX, event.clientY);
  }

  /**
   * Start a drag event.
   */
  private _startDrag(clientX: number, clientY: number): void {
    // Set up the drag event.
    this._drag = new Drag({
      mimeData: new MimeData(),
      supportedActions: 'copy',
      proposedAction: 'copy'
    });

    this._drag.mimeData.setData(FACTORY_MIME, () => {
      let outputArea = this.parent.parent as OutputAreaWidget;
      return outputArea.mirror();
    });

    // Remove mousemove and mouseup listeners and start the drag.
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
    this._drag.start(clientX, clientY).then(action => {
      this._drag = null;
    });
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    this._dragData = null;
    this._drag = null;
    super.dispose();
  }

  private _drag: Drag = null;
  private _dragData: { pressX: number, pressY: number } = null;
}


/**
 * An output widget.
 */
export
class OutputWidget extends Widget {
  /**
   * Construct a new output widget.
   */
  constructor(options: OutputWidget.IOptions) {
    super();
    let layout = new PanelLayout();
    this.layout = layout;
    let prompt = new OutputGutter();
    this._placeholder = new Widget();
    this.addClass(OUTPUT_CLASS);
    prompt.addClass(PROMPT_CLASS);
    this._placeholder.addClass(RESULT_CLASS);
    layout.addWidget(prompt);
    layout.addWidget(this._placeholder);
    this._rendermime = options.rendermime;
  }

  /**
   * The prompt widget used by the output widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get prompt(): Widget {
    let layout = this.layout as PanelLayout;
    return layout.widgets.at(0);
  }

  /**
   * The rendered output used by the output widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get output(): Widget {
    let layout = this.layout as PanelLayout;
    return layout.widgets.at(1);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._rendermime = null;
    this._placeholder = null;
    super.dispose();
  }

  /**
   * Clear the widget contents.
   */
  clear(): void {
    this.setOutput(this._placeholder);
    this.prompt.node.textContent = '';
  }

  /**
   * Render an output.
   *
   * @param options - The options used to render the output.
   */
  render(options: OutputWidget.IRenderOptions): void {
    let { output, trusted, injector } = options;

    // Handle an input request.
    if (output.output_type === 'input_request') {
      let child = new InputWidget(output as OutputAreaModel.IInputRequest);
      this.setOutput(child);
      return;
    }
    // Extract the data from the output and sanitize if necessary.
    let rendermime = this._rendermime;
    let bundle = OutputAreaModel.getBundle(output as nbformat.IOutput);
    let data = OutputAreaModel.convertBundle(bundle);
    // Clear the content.
    this.clear();

    // Bail if no data to display.
    if (!data) {
      console.warn('Did not find renderer for output mimebundle.');
      return;
    }

    // Create the output result area.
    let child = rendermime.render({ bundle: data, trusted, injector });
    if (!child) {
      return;
    }
    this.setOutput(child);

    // Add classes and output prompt as necessary.
    switch (output.output_type) {
    case 'execute_result':
      child.addClass(EXECUTE_CLASS);
      let count = (output as nbformat.IExecuteResult).execution_count;
      this.prompt.node.textContent = `Out[${count === null ? ' ' : count}]:`;
      break;
    case 'display_data':
      child.addClass(DISPLAY_CLASS);
      break;
    case 'stream':
      if ((output as nbformat.IStream).name === 'stdout') {
        child.addClass(STDOUT_CLASS);
      } else {
        child.addClass(STDERR_CLASS);
      }
      break;
    case 'error':
      child.addClass(ERROR_CLASS);
      break;
    default:
      break;
    }
  }

  /**
   * Set the widget output.
   */
  protected setOutput(value: Widget): void {
    let layout = this.layout as PanelLayout;
    let old = this.output;
    value = value || null;
    if (old === value) {
      return;
    }
    if (old) {
      if (old !== this._placeholder) {
        old.dispose();
      } else {
        old.parent = null;
      }
    }
    if (value) {
      layout.addWidget(value);
      value.addClass(RESULT_CLASS);
    } else {
      layout.addWidget(this._placeholder);
    }
  }

  private _rendermime: RenderMime = null;
  private _placeholder: Widget = null;
}


/**
 * The namespace for `OutputWidget` statics.
 */
export
namespace OutputWidget {
  /**
   * The options for rendering the output.
   */
   export
   interface IRenderOptions {
    /**
     * The kernel output message payload.
     */
    output: OutputAreaModel.Output;

    /**
     * Whether the output is trusted.
     */
    trusted: boolean;

    /**
     * A callback that can be used to add a mimetype to the original bundle.
     */
    injector?: (mimetype: string, value: string) => void;
   }

}

/**
 * A widget that handles stdin requests from the kernel.
 */
 class InputWidget extends Widget {
  /**
   * Construct a new input widget.
   */
  constructor(request: OutputAreaModel.IInputRequest) {
    super({ node: Private.createInputWidgetNode() });
    this.addClass(STDIN_CLASS);
    let text = this.node.firstChild as HTMLElement;
    text.textContent = request.prompt;
    this._input = this.node.lastChild as HTMLInputElement;
    if (request.password) {
      this._input.type = 'password';
    }
    this._kernel = request.kernel;
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the dock panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    let input = this._input;
    if (event.type === 'keydown') {
      if ((event as KeyboardEvent).keyCode === 13) {  // Enter
        this._kernel.sendInputReply({
          value: input.value
        });
        let rendered = document.createElement('span');
        rendered.className = STDIN_RENDERED_CLASS;
        if (input.type === 'password') {
          rendered.textContent = Array(input.value.length + 1).join('·');
        } else {
          rendered.textContent = input.value;
        }
        this.node.replaceChild(rendered, input);
      }
      // Suppress keydown events from leaving the input.
      event.stopPropagation();
    }
  }

  /**
   * Handle `after-attach` messages sent to the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this._input.addEventListener('keydown', this);
    this.update();
  }

  /**
   * Handle `update-request` messages sent to the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    this._input.focus();
  }

  /**
   * Handle `before-detach` messages sent to the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this._input.removeEventListener('keydown', this);
  }

  private _kernel: Kernel.IKernel = null;
  private _input: HTMLInputElement = null;
}


/**
 * A namespace for OutputArea statics.
 */
export
namespace OutputWidget {
  /**
   * The options to pass to an `OutputWidget`.
   */
  export
  interface IOptions {
    /**
     * The rendermime instance used by the widget.
     */
    rendermime: RenderMime;
  }
}

// Define the signals for the `OutputAreaWidget` class.
defineSignal(OutputAreaWidget.prototype, 'modelChanged');
defineSignal(OutputAreaWidget.prototype, 'modelDisposed');


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Create the node for an InputWidget.
   */
  export
  function createInputWidgetNode(): HTMLElement {
    let node = document.createElement('div');
    let prompt = document.createElement('span');
    prompt.className = STDIN_PROMPT_CLASS;
    let input = document.createElement('input');
    input.className = STDIN_INPUT_CLASS;
    node.appendChild(prompt);
    node.appendChild(input);
    return node;
  }
}
