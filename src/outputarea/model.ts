// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, KernelMessage, nbformat
} from '@jupyterlab/services';

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  indexOf
} from 'phosphor/lib/algorithm/searching';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  IObservableVector, ObservableVector
} from '../common/observablevector';

import {
  RenderMime
} from '../rendermime';


/**
 * A model that maintains a list of output data.
 */
export
interface IOutputAreaModel extends IObservableVector<OutputAreaModel.Output> {
  /**
   * A signal emitted when the model changes.
   */
  readonly changed: ISignal<IOutputAreaModel, ObservableVector.IChangedArgs<OutputAreaModel.Output>>;

  /**
   * A signal emitted when the model is disposed.
   */
  readonly disposed: ISignal<IOutputAreaModel, void>;

  /**
   * Add an output, which may be combined with previous output.
   *
   * #### Notes
   * The output bundle is copied.
   * Contiguous stream outputs of the same `name` are combined.
   */
  add(output: OutputAreaModel.Output): number;

  /**
   * Clear all of the output.
   *
   * @param wait Delay clearing the output until the next message is added.
   */
  clear(wait?: boolean): void;

  /**
   * Add a mime type to an output data bundle.
   *
   * @param output - The output to augment.
   *
   * @param mimetype - The mimetype to add.
   *
   * @param value - The value to add.
   *
   * #### Notes
   * The output must be contained in the model, or an error will be thrown.
   * Only non-existent types can be added.
   * Types are validated before being added.
   */
  addMimeData(output: nbformat.IDisplayData | nbformat.IExecuteResult, mimetype: string, value: string | JSONObject): void;

  /**
   * Execute code on a kernel and send outputs to the model.
   */
  execute(code: string, kernel: Kernel.IKernel): Promise<KernelMessage.IExecuteReplyMsg>;

  /**
   * Serialize the outputs to JSON
   */
  toJSON(): nbformat.IOutput[];

  /**
   * Deserialize from JSON
   */
  fromJSON(outputs: nbformat.IOutput[]): void;
}


/**
 * An model that maintains a list of output data.
 */
export
class OutputAreaModel extends ObservableVector<OutputAreaModel.Output> implements IOutputAreaModel {
  /**
   * A signal emitted when the model changes.
   */
  readonly changed: ISignal<this, ObservableVector.IChangedArgs<OutputAreaModel.Output>>;

  /**
   * A signal emitted when the model is disposed.
   */
  readonly disposed: ISignal<this, void>;

  /**
   * Dispose of the resources used by the model.
   */
  dispose(): void {
    clearSignalData(this);
    super.dispose();
    this.disposed.emit(void 0);
  }

  /**
   * Add an output, which may be combined with previous output.
   *
   * #### Notes
   * The output bundle is copied.
   * Contiguous stream outputs of the same `name` are combined.
   */
  add(output: OutputAreaModel.Output): number {
    // If we received a delayed clear message, then clear now.
    if (this.clearNext) {
      this.clear();
      this.clearNext = false;
    }
    if (output.output_type === 'input_request') {
      this.pushBack(output);
    }

    // Make a copy of the output bundle.
    let value = JSON.parse(JSON.stringify(output)) as nbformat.IOutput;

    // Join multiline text outputs.
    if (value.output_type === 'stream') {
      if (Array.isArray(value.text)) {
        value.text = (value.text as string[]).join('\n');
      }
    }

    // Consolidate outputs if they are stream outputs of the same kind.
    let index = this.length - 1;
    let lastOutput = this.at(index);
    if (value.output_type === 'stream'
        && lastOutput && lastOutput.output_type === 'stream'
        && value.name === lastOutput.name) {
      // In order to get a list change event, we add the previous
      // text to the current item and replace the previous item.
      // This also replaces the metadata of the last item.
      let text = value.text as string;
      value.text = lastOutput.text as string + text;
      this.set(index, value);
      return index;
    } else {
      switch (value.output_type) {
      case 'stream':
      case 'execute_result':
      case 'display_data':
      case 'error':
        return this.pushBack(value);
      default:
        break;
      }
    }
    return -1;
  }

  /**
   * Clear all of the output.
   *
   * @param wait Delay clearing the output until the next message is added.
   */
  clear(wait: boolean = false): void {
    if (wait) {
      this.clearNext = true;
      return;
    }
    super.clear();
  }

  /**
   * Add a mime type to an output data bundle.
   *
   * @param output - The output to augment.
   *
   * @param mimetype - The mimetype to add.
   *
   * @param value - The value to add.
   *
   * #### Notes
   * The output must be contained in the model, or an error will be thrown.
   * Only non-existent types can be added.
   * Types are validated before being added.
   */
  addMimeData(output: nbformat.IDisplayData | nbformat.IExecuteResult, mimetype: string, value: string | JSONObject): void {
    let index = indexOf(this, output);
    if (index === -1) {
      throw new Error(`Cannot add data to non-tracked bundle`);
    }
    if (mimetype in output.data) {
      console.warn(`Cannot add existing key '${mimetype}' to bundle`);
      return;
    }
    if (nbformat.validateMimeValue(mimetype, value)) {
      output.data[mimetype] = value;
    } else {
      console.warn(`Refusing to add invalid mime value of type ${mimetype} to output`);
    }
  }

  /**
   * Execute code on a kernel and send outputs to the model.
   */
  execute(code: string, kernel: Kernel.IKernel): Promise<KernelMessage.IExecuteReplyMsg> {
    // Override the default for `stop_on_error`.
    let content: KernelMessage.IExecuteRequest = {
      code,
      stop_on_error: true
    };
    this.clear();
    return new Promise<KernelMessage.IExecuteReplyMsg>((resolve, reject) => {
      let future = kernel.requestExecute(content);
      // Handle published messages.
      future.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
        let msgType = msg.header.msg_type;
        switch (msgType) {
        case 'execute_result':
        case 'display_data':
        case 'stream':
        case 'error':
          let model = msg.content as nbformat.IOutput;
          model.output_type = msgType as nbformat.OutputType;
          this.add(model);
          break;
        case 'clear_output':
          this.clear((msg as KernelMessage.IClearOutputMsg).content.wait);
          break;
        default:
          break;
        }
      };
      // Handle the execute reply.
      future.onReply = (msg: KernelMessage.IExecuteReplyMsg) => {
        resolve(msg);
        // API responses that contain a pager are special cased and their type
        // is overriden from 'execute_reply' to 'display_data' in order to
        // render output.
        let content = msg.content as KernelMessage.IExecuteOkReply;
        let payload = content && content.payload;
        if (!payload || !payload.length) {
          return;
        }
        let pages = payload.filter(i => (i as any).source === 'page');
        if (!pages.length) {
          return;
        }
        let page = JSON.parse(JSON.stringify(pages[0]));
        let model: nbformat.IOutput = {
          output_type: 'display_data',
          data: (page as any).data as nbformat.IMimeBundle,
          metadata: {}
        };
        this.add(model);
      };
      // Handle stdin.
      future.onStdin = (msg: KernelMessage.IStdinMessage) => {
        if (KernelMessage.isInputRequestMsg(msg)) {
          this.add({
            output_type: 'input_request',
            prompt: msg.content.prompt,
            password: msg.content.password,
            kernel
          });
        }
      };
    });
  }

  /**
   * Serialize the outputs to JSON
   */
  toJSON(): nbformat.IOutput[] {
    let outputs: nbformat.IOutput[] = [];
    for(let i=0; i<this.length; i++) {
      let output = this.at(i);
      if(output.output_type !== 'input_request') {
        outputs.push(output as nbformat.IOutput);
      }
    }
    return outputs;
  }

  /**
   * Deserialize from JSON
   */
  fromJSON(outputs: nbformat.IOutput[]) {
    this.clear();
    for (let output of outputs) {
      this.add(output);
    }
  }


  protected clearNext = false;
}


/**
 * A namespace for OutputAreaModel statics.
 */
export
namespace OutputAreaModel {
  /**
   * Output for an input request from the kernel.
   */
  export
  interface IInputRequest {
    /**
     * Type of cell output.
     */
    output_type: 'input_request';

    /**
     * The text to show at the prompt.
     */
    prompt: string;

    /**
     * Whether the request is for a password.
     * If so, the frontend shouldn't echo input.
     */
    password: boolean;

    /**
     * The kernel that made the request, used to send an input response.
     */
    kernel: Kernel.IKernel;
  }

  /**
   * A valid output area item.
   */
  export
  type Output = nbformat.IOutput | IInputRequest;

  /**
   * Get the mime bundle for an output.
   *
   * @params output - A kernel output message payload.
   *
   * @returns - A mime bundle for the payload.
   */
  export
  function getBundle(output: nbformat.IOutput): nbformat.IMimeBundle {
    let bundle: nbformat.IMimeBundle;
    switch (output.output_type) {
    case 'execute_result':
      bundle = (output as nbformat.IExecuteResult).data;
      break;
    case 'display_data':
      bundle = (output as nbformat.IDisplayData).data;
      break;
    case 'stream':
      let text = (output as nbformat.IStream).text;
      bundle = {
        'application/vnd.jupyter.console-text': text
      };
      break;
    case 'error':
      let out: nbformat.IError = output as nbformat.IError;
      let traceback = out.traceback.join('\n');
      bundle = {
        'application/vnd.jupyter.console-text': traceback ||
          `${out.ename}: ${out.evalue}`
      };
      break;
    default:
      break;
    }
    return bundle || {};
  }

  /**
   * Convert a mime bundle to a mime map.
   */
  export
  function convertBundle(bundle: nbformat.IMimeBundle): RenderMime.MimeMap<string> {
    let map: RenderMime.MimeMap<string> = Object.create(null);
    for (let mimeType in bundle) {
      let value = bundle[mimeType];
      if (Array.isArray(value)) {
        map[mimeType] = (value as string[]).join('\n');
      } else {
        map[mimeType] = value as string;
      }
    }
    return map;
  }
}


// Define the signals for the `OutputAreaModel` class.
defineSignal(OutputAreaModel.prototype, 'changed');
defineSignal(OutputAreaModel.prototype, 'disposed');
