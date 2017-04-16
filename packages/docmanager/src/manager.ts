// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  ArrayExt, each, find, map, toArray
} from '@phosphor/algorithm';

import {
  Token
} from '@phosphor/coreutils';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  AttachedProperty
} from '@phosphor/properties';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  Widget
} from '@phosphor/widgets';

import {
  IClientSession
} from '@jupyterlab/apputils';

import {
  DocumentRegistry, Context
} from '@jupyterlab/docregistry';

import {
  ISaveHandler
} from './savehandler';

import {
  DocumentWidgetManager
} from './widgetmanager';

import {
  IDrive
} from './drive';

/* tslint:disable */
/**
 * The document registry token.
 */
export
const IDocumentManager = new Token<IDocumentManager>('jupyter.services.document-manager');
/* tslint:enable */


/**
 * The interface for a document manager.
 */
export
interface IDocumentManager extends DocumentManager {}

/**
 * The document manager.
 *
 * #### Notes
 * The document manager is used to register model and widget creators,
 * and the file browser uses the document manager to create widgets. The
 * document manager maintains a context for each path and model type that is
 * open, and a list of widgets for each context. The document manager is in
 * control of the proper closing and disposal of the widgets and contexts.
 */
export
class DocumentManager implements IDisposable {
  /**
   * Construct a new document manager.
   */
  constructor(options: DocumentManager.IOptions) {
    this._registry = options.registry;
    this._defaultDrive = options.defaultDrive;
    this._opener = options.opener;
    this._widgetManager = new DocumentWidgetManager({
      registry: this._registry
    });
    this._widgetManager.activateRequested.connect(this._onActivateRequested, this);
    this._ready = this._defaultDrive.services.ready;
  }

  /**
   * A signal emitted when one of the documents is activated.
   */
  get activateRequested(): ISignal<this, string> {
    return this._activateRequested;
  }

  /**
   * Get the registry used by the manager.
   */
  get registry(): DocumentRegistry {
    return this._registry;
  }

  /**
   * Get whether the document manager has been disposed.
   */
  get isDisposed(): boolean {
    return this._defaultDrive === null;
  }

  /**
   * Get the default drive model for the manager.
   */
  get defaultDrive(): IDrive {
    return this._defaultDrive;
  }

  /**
   * Get any additional drives for the manager.
   */
  get additionalDrives(): IDrive[] {
    let drives: IDrive[] = [];
    this._additionalDrives.forEach( drive => {
      drives.push(drive);
    });
    return drives;
  }

  /**
   * Whether the `DocumentManager` (and all of its drives)
   * is ready to be used.
   */
  get ready(): Promise<void> {
    return this._ready;
  }

  /**
   * Add a drive model to the document manager.
   */
  addDrive(drive: IDrive): void {
    if (this._additionalDrives.has(drive.name)) {
      throw Error('A drive with the name '+drive.name+' already exists');
    }
    this._additionalDrives.set(drive.name, drive);
    let promises: Promise<void>[] = [];
    promises.push(this._defaultDrive.services.ready);
    this._additionalDrives.forEach(drive => {
      promises.push(drive.services.ready);
    });
    this._ready = Promise.all(promises).then(() => { return void 0; });
  }

  /**
   * Dispose of the resources held by the document manager.
   */
  dispose(): void {
    if (this._defaultDrive === null) {
      return;
    }
    let widgetManager = this._widgetManager;
    this._defaultDrive = null;
    this._widgetManager = null;
    Signal.clearData(this);
    each(this._defaultDriveContexts, context => {
      widgetManager.closeWidgets(context);
    });
    this._additionalDriveContexts.forEach(contextList => {
      each(contextList, context => {
        widgetManager.closeWidgets(context);
      });
    });
    this._additionalDriveContexts.clear();
    this._additionalDrives.clear();
    widgetManager.dispose();
    this._defaultDriveContexts.length = 0;
  }

  /**
   * Open a file and return the widget used to view it.
   * Reveals an already existing editor.
   *
   * @param path - The file path to open.
   *
   * @param widgetName - The name of the widget factory to use. 'default' will use the default widget.
   *
   * @param kernel - An optional kernel name/id to override the default.
   *
   * @returns The created widget, or `undefined`.
   *
   * #### Notes
   * This function will return `undefined` if a valid widget factory
   * cannot be found.
   */
  openOrReveal(path: string, widgetName='default', kernel?: Kernel.IModel): Widget {
    let widget = this.findWidget(path, widgetName);
    if (!widget) {
      widget = this.open(path, widgetName, kernel);
    } else {
      this._opener.open(widget);
    }
    return widget;
  }

  /**
   * Open a file and return the widget used to view it.
   *
   * @param path - The file path to open.
   *
   * @param widgetName - The name of the widget factory to use. 'default' will use the default widget.
   *
   * @param kernel - An optional kernel name/id to override the default.
   *
   * @returns The created widget, or `undefined`.
   *
   * #### Notes
   * This function will return `undefined` if a valid widget factory
   * cannot be found.
   */
  open(path: string, widgetName='default', kernel?: Kernel.IModel): Widget {
    return this._createOrOpenDocument('open', path, widgetName, kernel);
  }

  /**
   * Create a new file and return the widget used to view it.
   *
   * @param path - The file path to create.
   *
   * @param widgetName - The name of the widget factory to use. 'default' will use the default widget.
   *
   * @param kernel - An optional kernel name/id to override the default.
   *
   * @returns The created widget, or `undefined`.
   *
   * #### Notes
   * This function will return `undefined` if a valid widget factory
   * cannot be found.
   */
  createNew(path: string, widgetName='default', kernel?: Kernel.IModel): Widget {
    return this._createOrOpenDocument('create', path, widgetName, kernel);
  }

  /**
   * See if a widget already exists for the given path and widget name.
   *
   * @param path - The file path to use.
   *
   * @param widgetName - The name of the widget factory to use. 'default' will use the default widget.
   *
   * @returns The found widget, or `undefined`.
   *
   * #### Notes
   * This can be used to use an existing widget instead of opening
   * a new widget.
   */
  findWidget(path: string, widgetName='default'): Widget {
    if (widgetName === 'default') {
      let extname = DocumentRegistry.extname(path);
      let factory = this._registry.defaultWidgetFactory(extname);
      if (!factory) {
        return;
      }
      widgetName = factory.name;
    }
    let context = this._contextForPath(path);
    if (context) {
      return this._widgetManager.findWidget(context, widgetName);
    }
  }

  /**
   * Get the document context for a widget.
   *
   * @param widget - The widget of interest.
   *
   * @returns The context associated with the widget, or `undefined`.
   */
  contextForWidget(widget: Widget): DocumentRegistry.Context {
    return this._widgetManager.contextForWidget(widget);
  }

  /**
   * Clone a widget.
   *
   * @param widget - The source widget.
   *
   * @returns A new widget or `undefined`.
   *
   * #### Notes
   *  Uses the same widget factory and context as the source, or returns
   *  `undefined` if the source widget is not managed by this manager.
   */
  cloneWidget(widget: Widget): Widget {
    return this._widgetManager.cloneWidget(widget);
  }

  /**
   * Close the widgets associated with a given path.
   *
   * @param path - The target path.
   */
  closeFile(path: string): Promise<void> {
    let context = this._contextForPath(path);
    if (context) {
      return this._widgetManager.closeWidgets(context);
    }
    return Promise.resolve(void 0);
  }

  /**
   * Close all of the open documents.
   */
  closeAll(): Promise<void> {
    return Promise.all(
      toArray(map(this._defaultDriveContexts, context => {
        return this._widgetManager.closeWidgets(context);
      }))
    ).then(() => undefined);
  }

  /**
   * Find a context for a given path and factory name.
   */
  private _findContext(path: string, factoryName: string): Private.IContext {
    let driveContexts = this._driveContextsForPath(path);
    return find(driveContexts, context => {
      return (context.factoryName === factoryName &&
              context.path === path);
    });
  }

  /**
   * Get a context for a given path.
   */
  private _contextForPath(path: string): Private.IContext {
    let driveContexts = this._driveContextsForPath(path);
    return find(driveContexts, context => {
      return context.path === path;
    });
  }

  /**
   * Create a context from a path and a model factory.
   */
  private _createContext(path: string, factory: DocumentRegistry.ModelFactory, kernelPreference: IClientSession.IKernelPreference): Private.IContext {
    let drive = this._driveForPath(path);
    let driveContexts = this._driveContextsForPath(path);
    let localPath = this._localPath(path);

    let adopter = (widget: Widget) => {
      this._widgetManager.adoptWidget(context, widget);
      this._opener.open(widget);
    };
    let context = new Context({
      opener: adopter,
      manager: drive.services,
      factory,
      path: localPath,
      kernelPreference,
      realtimeServices: drive.realtimeServices
    });
    let handler = drive.createSaveHandler(context);
    Private.saveHandlerProperty.set(context, handler);
    context.ready.then(() => {
      handler.start();
    });
    context.disposed.connect(this._onContextDisposed, this);
    driveContexts.push(context);
    return context;
  }

  /**
   * Handle a context disposal.
   */
  private _onContextDisposed(context: Private.IContext): void {
    if (ArrayExt.removeFirstOf(this._defaultDriveContexts, context) !== -1) {
      return;
    }
    this._additionalDriveContexts.forEach( contextList => {
      ArrayExt.removeFirstOf(contextList, context);
    });
  }

  /**
   * Get the model factory for a given widget name.
   */
  private _widgetFactoryFor(path: string, widgetName: string): DocumentRegistry.WidgetFactory {
    let registry = this._registry;
    if (widgetName === 'default') {
      let extname = DocumentRegistry.extname(path);
      let factory = registry.defaultWidgetFactory(extname);
      if (!factory) {
        return;
      }
      widgetName = factory.name;
    }
    return registry.getWidgetFactory(widgetName);
  }

  /**
   * Creates a new document, or loads one from disk, depending on the `which` argument.
   * If `which==='create'`, then it creates a new document. If `which==='open'`,
   * then it loads the document from disk.
   *
   * The two cases differ in how the document context is handled, but the creation
   * of the widget and launching of the kernel are identical.
   */
  private _createOrOpenDocument(which: 'open'|'create', path: string, widgetName='default', kernel?: Kernel.IModel): Widget {
    let widgetFactory = this._widgetFactoryFor(path, widgetName);
    if (!widgetFactory) {
      return;
    }
    let factory = this._registry.getModelFactory(widgetFactory.modelName);
    if (!factory) {
      return;
    }

    // Handle the kernel pereference.
    let ext = DocumentRegistry.extname(path);
    let preference = this._registry.getKernelPreference(
      ext, widgetFactory.name, kernel
    );

    let context: Private.IContext = null;

    // Handle the load-from-disk case
    if (which === 'open') {
      // Use an existing context if available.
      context = this._findContext(path, factory.name);
      if (!context) {
        context = this._createContext(path, factory, preference);
        // Populate the model, either from disk or a
        // model backend.
        context.fromStore();
      }
    } else if (which === 'create') {
      context = this._createContext(path, factory, preference);
      // Immediately save the contents to disk.
      context.save();
    }

    let widget = this._widgetManager.createWidget(widgetFactory.name, context);
    this._opener.open(widget);
    return widget;
  }

  /**
   * Handle an activateRequested signal from the widget manager.
   */
  private _onActivateRequested(sender: DocumentWidgetManager, args: string): void {
    this._activateRequested.emit(args);
  }

  /**
   * Given a path, determine the name of the drive with which
   * it is associated, or an empty string for the default drive.
   */
  private _driveName(path: string): string {
    let components = path.split(':');
    if (components.length > 2) {
      throw Error('Malformed path');
    } else if (components.length === 1) {
      return '';
    } else {
      return components[0];
    }
  }

  /**
   * Given a path, strip out the drive information, if it has any.
   */
  private _localPath(path: string): string {
    let components = path.split(':');
    if (components.length > 2) {
      throw Error('Malformed path');
    } else if (components.length === 1) {
      return path;
    } else {
      return components[1];
    }
  }

  /**
   * Given a path, determine the drive to dispatch operations to.
   */
  private _driveForPath(path: string): IDrive {
    let driveName = this._driveName(path);
    if (driveName === '') {
      // The case of no leading drive specifier.
      return this._defaultDrive;
    }
    let drive = this._additionalDrives.get(driveName);
    if (!drive) {
      throw Error('Cannot find requested drive.');
    }
    return drive;
  }

  /**
   * Given a path, get the context list for the relevant drive.
   */
  private _driveContextsForPath(path: string): Private.IContext[] {
    let driveName = this._driveName(path);
    if (driveName === '') {
      // The case of no leading drive specifier.
      return this._defaultDriveContexts;
    }
    let driveContexts = this._additionalDriveContexts.get(driveName);
    if (!driveContexts) {
      throw Error('Cannot find requested drive.');
    }
    return driveContexts;
  }

  private _widgetManager: DocumentWidgetManager = null;
  private _registry: DocumentRegistry = null;
  private _defaultDriveContexts: Private.IContext[] = [];
  private _additionalDriveContexts = new Map<string, Private.IContext[]>();
  private _opener: DocumentManager.IWidgetOpener = null;
  private _activateRequested = new Signal<this, string>(this);
  private _additionalDrives = new Map<string, IDrive>();
  private _defaultDrive: IDrive = null;
  private _ready: Promise<void> = null;
}


/**
 * A namespace for document manager statics.
 */
export
namespace DocumentManager {
  /**
   * The options used to initialize a document manager.
   */
  export
  interface IOptions {
    /**
     * A document registry instance.
     */
    registry: DocumentRegistry;

    /**
     * A default drive backend.
     */
    defaultDrive: IDrive;

    /**
     * A widget opener for sibling widgets.
     */
    opener: IWidgetOpener;
  }

  /**
   * An interface for a widget opener.
   */
  export
  interface IWidgetOpener {
    /**
     * Open the given widget.
     */
    open(widget: Widget): void;
  }
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * An attached property for a context save handler.
   */
  export
  const saveHandlerProperty = new AttachedProperty<DocumentRegistry.Context, ISaveHandler>({
    name: 'saveHandler',
    create: () => null
  });

  /**
   * A type alias for a standard context.
   */
  export
  interface IContext extends Context<DocumentRegistry.IModel> {};
}
