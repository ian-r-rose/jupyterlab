// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IServiceManager
} from '@jupyterlab/services';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  IRealtime
} from '@jupyterlab/coreutils';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  ISaveHandler, SaveHandler
} from './savehandler';


/**
 * An interface for a drive backend. The `DocumentManager`
 * can have multiple `IDrive` instances "mounted".
 */
export
interface IDrive extends IDisposable {
  /**
   * The name of the drive, used at the start of file paths
   * to disambiguate drives.
   */
  readonly name: string;

  /**
   * The service manager for this drive.
   */
  readonly services: IServiceManager;

  /**
   * A factory method for save handlers for
   * a document context.
   */
  createSaveHandler(context: DocumentRegistry.Context): ISaveHandler;

  /**
   * An optional realtime service for this drive.
   */
  realtimeServices?: IRealtime;
}


/**
 * The default implementation of `IDrive`, which uses
 * the standard Jupyter services API and save handler.
 */
export
class Drive implements IDrive {
  /**
   * Constructor for the drive.
   */
  constructor(options: Drive.IOptions) {
    this.name = options.name;
    this._services = options.services;
  }

  /**
   * The name of the drive, used at the start of file paths
   * to disambiguate drives.
   */
  readonly name: string;

  /**
   * The service manager for this drive.
   */
  get services(): IServiceManager {
    return this._services;
  }

  /**
   * Whether the drive has been disposed.
   */
  get isDisposed(): boolean {
    return this._services === null;
  }

  /**
   * Dispose of the resources held by the drive.
   */
  dispose(): void {
    if (this._services === null) {
      return;
    }
    let services = this._services;
    this._services = null;
    services.dispose();
  }

  /**
   * A factory method for save handlers for
   * a document context.
   */
  createSaveHandler(context: DocumentRegistry.Context): ISaveHandler {
    return new SaveHandler({
      context,
      manager: this._services
    });
  }

  private _services: IServiceManager;
}




export
namespace Drive {
  /**
   * Options used to create a `Drive` object.
   */
  export
  class IOptions {
    /**
     * A service manager.
     */
    services: IServiceManager;

    /**
     * The name of the drive.
     */
    name: string;
  }
}
