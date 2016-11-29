// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ContentsManager, Contents, Kernel, ServiceManager, Session, utils
} from '@jupyterlab/services';

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  findIndex
} from 'phosphor/lib/algorithm/searching';

import {
  IDisposable, DisposableDelegate
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  findKernel
} from '../docregistry';

import {
  showDialog, okButton
} from '../dialog';

import {
  DocumentRegistry
} from '../docregistry';


/**
 * An implementation of a document context.
 *
 * This class is typically instantiated by the document manger.
 */
export
class Context<T extends DocumentRegistry.IModel> implements DocumentRegistry.IContext<T> {
  /**
   * Construct a new document context.
   */
  constructor(options: Context.IOptions<T>) {
    let manager = this._manager = options.manager;
    this._factory = options.factory;
    this._opener = options.opener;
    this._path = options.path;
    let ext = ContentsManager.extname(this._path);
    let lang = this._factory.preferredLanguage(ext);
    this._model = this._factory.createNew(lang);
    manager.sessions.runningChanged.connect(this._onSessionsChanged, this);
    manager.contents.fileChanged.connect(this._onFileChanged, this);
    this._readyPromise = manager.ready.then(() => {
      return this._populatedPromise.promise;
    });
  }

  /**
   * A signal emitted when the kernel changes.
   */
  kernelChanged: ISignal<this, Kernel.IKernel>;

  /**
   * A signal emitted when the path changes.
   */
  pathChanged: ISignal<this, string>;

  /**
   * A signal emitted when the model is saved or reverted.
   */
  fileChanged: ISignal<this, Contents.IModel>;

  /**
   * A signal emitted when the context is disposed.
   */
  disposed: ISignal<this, void>;

  /**
   * Get the model associated with the document.
   */
  get model(): T {
    return this._model;
  }

  /**
   * Get the model associated with the document.
   */
  set model(model: T) {
    this._model = model;
  }

  /**
   * The current kernel associated with the document.
   */
  get kernel(): Kernel.IKernel {
    return this._session ? this._session.kernel : null;
  }

  /**
   * The current path associated with the document.
   */
  get path(): string {
    return this._path;
  }

  /**
   * The current contents model associated with the document
   *
   * #### Notes
   * The model will have an  empty `contents` field.
   */
  get contentsModel(): Contents.IModel {
    return this._contentsModel;
  }

  /**
   * Get the model factory name.
   *
   * #### Notes
   * This is not part of the `IContext` API.
   */
  get factoryName(): string {
    return this.isDisposed ? '' : this._factory.name;
  }

  /**
   * Test whether the context has been disposed (read-only).
   */
  get isDisposed(): boolean {
    return this._manager === null;
  }

  /**
   * Dispose of the resources held by the context.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.disposed.emit(void 0);
    clearSignalData(this);
    this._model.dispose();
    this._manager = null;
    this._factory = null;
    if (this._session) {
      this._session.shutdown().then(() => {
        this._session.dispose();
        this._session = null;
      });
    }
  }

  /**
   * The kernel spec models
   */
  get specs(): Kernel.ISpecModels {
    return this._manager.specs;
  }

  /**
   * Whether the context is ready.
   */
  get isReady(): boolean {
    return this._isReady;
  }

 /**
  * A promise that is fulfilled when the context is ready.
  */
  get ready(): Promise<void> {
    return this._readyPromise;
  }

  /**
   * Start the default kernel for the context.
   *
   * @returns A promise that resolves with the new kernel.
   */
  startDefaultKernel(): Promise<Kernel.IKernel> {
    return this.ready.then(() => {
      let model = this.model;
      let name = findKernel(
        model.defaultKernelName,
        model.defaultKernelLanguage,
        this._manager.specs
      );
      return this.changeKernel({ name });
    });
  }

  /**
   * Change the current kernel associated with the document.
   */
  changeKernel(options: Kernel.IModel): Promise<Kernel.IKernel> {
    let session = this._session;
    if (options) {
      if (session) {
        return session.changeKernel(options);
      } else {
        let path = this._path;
        let sOptions: Session.IOptions = {
          path,
          kernelName: options.name,
          kernelId: options.id
        };
        return this._startSession(sOptions);
      }
    } else {
      if (session) {
        this._session = null;
        return session.shutdown().then(() => {
          session.dispose();
          this.kernelChanged.emit(null);
          return void 0;
        });
      } else {
        return Promise.resolve(void 0);
      }
    }
  }

  /**
   * Save the document contents to disk.
   */
  save(): Promise<void> {
    let model = this._model;
    let path = this._path;
    if (model.readOnly) {
      return Promise.reject(new Error('Read only'));
    }
    let content: JSONObject | string;
    if (this._factory.fileFormat === 'json') {
      content = model.toJSON();
    } else {
      content = model.toString();
    }

    let options = {
      type: this._factory.contentType,
      format: this._factory.fileFormat,
      content
    };

    let promise = this._manager.contents.save(path, options);
    return promise.then(value => {
      model.dirty = false;
      this._updateContentsModel(value);

      if (!this._isPopulated) {
        return this._populate();
      }
    }).catch(err => {
      showDialog({
        title: 'File Save Error',
        body: err.xhr.responseText,
        buttons: [okButton]
      });
    });
  }

  /**
   * Save the document to a different path chosen by the user.
   */
  saveAs(): Promise<void> {
    return Private.getSavePath(this._path).then(newPath => {
      if (!newPath) {
        return;
      }
      this._path = newPath;
      let session = this._session;
      if (session) {
        let options: Session.IOptions = {
          path: newPath,
          kernelId: session.kernel.id,
          kernelName: session.kernel.name
        };
        return this._startSession(options).then(() => {
          return this.save();
        });
      }
      return this.save();
    });
  }

  /**
   * Revert the document contents to disk contents.
   */
  revert(): Promise<void> {
    let opts: Contents.IFetchOptions = {
      format: this._factory.fileFormat,
      type: this._factory.contentType,
      content: true
    };
    let path = this._path;
    let model = this._model;
    return this._manager.contents.get(path, opts).then(contents => {
      if (contents.format === 'json') {
        model.fromJSON(contents.content);
      } else {
        model.fromString(contents.content);
      }
      this._updateContentsModel(contents);
      model.dirty = false;
      if (!this._isPopulated) {
        return this._populate();
      }
    }).catch(err => {
      showDialog({
        title: 'File Load Error',
        body: err.xhr.responseText,
        buttons: [okButton]
      });
    });
  }

  /**
   * Create a checkpoint for the file.
   */
  createCheckpoint(): Promise<Contents.ICheckpointModel> {
    return this._manager.contents.createCheckpoint(this._path);
  }

  /**
   * Delete a checkpoint for the file.
   */
  deleteCheckpoint(checkpointId: string): Promise<void> {
    return this._manager.contents.deleteCheckpoint(this._path, checkpointId);
  }

  /**
   * Restore the file to a known checkpoint state.
   */
  restoreCheckpoint(checkpointId?: string): Promise<void> {
    let contents = this._manager.contents;
    let path = this._path;
    if (checkpointId) {
      return contents.restoreCheckpoint(path, checkpointId);
    }
    return this.listCheckpoints().then(checkpoints => {
      if (!checkpoints.length) {
        return;
      }
      checkpointId = checkpoints[checkpoints.length - 1].id;
      return contents.restoreCheckpoint(path, checkpointId);
    });
  }

  /**
   * List available checkpoints for a file.
   */
  listCheckpoints(): Promise<Contents.ICheckpointModel[]> {
    return this._manager.contents.listCheckpoints(this._path);
  }

  /**
   * Resolve a relative url to a correct server path.
   */
  resolveUrl(url: string): string {
    // Ignore urls that have a protocol.
    if (utils.urlParse(url).protocol || url.indexOf('//') === 0) {
      return url;
    }
    let cwd = ContentsManager.dirname(this._path);
    let path = ContentsManager.getAbsolutePath(url, cwd);
    return this._manager.contents.getDownloadUrl(path);
  }

  /**
   * Add a sibling widget to the document manager.
   */
  addSibling(widget: Widget): IDisposable {
    let opener = this._opener;
    if (opener) {
      opener(widget);
    }
    return new DisposableDelegate(() => {
      widget.close();
    });
  }

  /**
   * Handle a change on the contents manager.
   */
  private _onFileChanged(sender: Contents.IManager, change: Contents.IChangedArgs): void {
    if (change.type !== 'rename') {
      return;
    }
    if (change.oldValue.path === this._path) {
      let path = this._path = change.newValue.path;
      if (this._session) {
        this._session.rename(path);
      }
      this.pathChanged.emit(path);
    }
  }

  /**
   * Start a session and set up its signals.
   */
  private _startSession(options: Session.IOptions): Promise<Kernel.IKernel> {
    return this._manager.sessions.startNew(options).then(session => {
      if (this._session) {
        this._session.dispose();
      }
      this._session = session;
      this.kernelChanged.emit(session.kernel);
      session.pathChanged.connect((s, path) => {
        if (path !== this._path) {
          this._path = path;
          this.pathChanged.emit(path);
        }
      });
      session.kernelChanged.connect((s, kernel) => {
        this.kernelChanged.emit(kernel);
      });
      return session.kernel;
    }).catch(err => {
      let response = JSON.parse(err.xhr.response);
      let body = document.createElement('pre');
      body.textContent = response['traceback'];
      showDialog({
        title: 'Error Starting Kernel',
        body,
        buttons: [okButton]
      });
      return Promise.reject(err);
    });
  }

  /**
   * Update our contents model, without the content.
   */
  private _updateContentsModel(model: Contents.IModel): void {
    let newModel: Contents.IModel = {
      path: model.path,
      name: model.name,
      type: model.type,
      writable: model.writable,
      created: model.created,
      last_modified: model.last_modified,
      mimetype: model.mimetype,
      format: model.format
    };
    let mod = this._contentsModel ? this._contentsModel.last_modified : null;
    this._contentsModel = newModel;
    if (!mod || newModel.last_modified !== mod) {
      this.fileChanged.emit(newModel);
    }
  }

  /**
   * Handle a change to the running sessions.
   */
  private _onSessionsChanged(sender: Session.IManager, models: Session.IModel[]): void {
    let session = this._session;
    if (!session) {
      return;
    }
    let index = findIndex(models, model => model.id === session.id);
    if (index === -1) {
      session.dispose();
      this._session = null;
      this.kernelChanged.emit(null);
    }
  }

  /**
   * Handle an initial population.
   */
  private _populate(): Promise<void> {
    this._isPopulated = true;
    // Add a checkpoint if none exists.
    return this.listCheckpoints().then(checkpoints => {
      if (!checkpoints) {
        return this.createCheckpoint();
      }
    }).then(() => {
      this._isReady = true;
      this._populatedPromise.resolve(void 0);
    });
  }

  private _manager: ServiceManager.IManager = null;
  private _opener: (widget: Widget) => void = null;
  private _model: T = null;
  private _path = '';
  private _session: Session.ISession = null;
  private _factory: DocumentRegistry.IModelFactory<T> = null;
  private _contentsModel: Contents.IModel = null;
  private _readyPromise: Promise<void>;
  private _populatedPromise = new utils.PromiseDelegate<void>();
  private _isPopulated = false;
  private _isReady = false;
}


// Define the signals for the `Context` class.
defineSignal(Context.prototype, 'kernelChanged');
defineSignal(Context.prototype, 'pathChanged');
defineSignal(Context.prototype, 'fileChanged');
defineSignal(Context.prototype, 'disposed');


/**
 * A namespace for `Context` statics.
 */
export namespace Context {
  /**
   * The options used to initialize a context.
   */
  export
  interface IOptions<T extends DocumentRegistry.IModel> {
    /**
     * A service manager instance.
     */
    manager: ServiceManager.IManager;

    /**
     * The model factory used to create the model.
     */
    factory: DocumentRegistry.IModelFactory<T>;

    /**
     * The initial path of the file.
     */
    path: string;

    /**
     * An optional callback for opening sibling widgets.
     */
    opener?: (widget: Widget) => void;
  }
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Get a new file path from the user.
   */
  export
  function getSavePath(path: string): Promise<string> {
    let input = document.createElement('input');
    input.value = path;
    return showDialog({
      title: 'Save File As..',
      body: input,
      okText: 'SAVE'
    }).then(result => {
      if (result.text === 'SAVE') {
        return input.value;
      }
    });
  }
}
