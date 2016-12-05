import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IServiceManager
} from '../services';

import {
  IEditorServices
} from '../codeeditor';

import {
  VimEditorFactory, VimMimeTypeService
} from '.';


/**
 * The editor services.
 */
export
const plugin: JupyterLabPlugin<IEditorServices> = {
  id: IEditorServices.name,
  provides: IEditorServices,
  requires: [IServiceManager],
  activate: (app: JupyterLab, services: IServiceManager): IEditorServices => {
    const factory = new VimEditorFactory(services);
    const mimeTypeService = new VimMimeTypeService();
    return { factory, mimeTypeService };
  }
};
