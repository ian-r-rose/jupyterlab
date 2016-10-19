// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  JupyterLab, JupyterLabPlugin
} from '../../application';

import {
  IClipboard
} from '../../clipboard';

import {
  ICommandPalette
} from '../../commandpalette';

import {
  IMainMenu
} from '../../mainmenu';

import {
  IDocumentRegistry, DocumentRegistry,
  restartKernel, selectKernelForContext
} from '../../docregistry';

import {
  IInspector
} from '../../inspector';

import {
  IRenderMime
} from '../../rendermime';

import {
  IServiceManager
} from '../../services';

import {
  INotebookTracker, NotebookPanel,
  NotebookTracker,
  NotebookWidgetFactory, NotebookActions
} from '../../notebook/index';

import {
  RealtimeNotebookModelFactory
} from './model';

import {
  authorize, createPermissions
} from '../gapi';


/**
 * The class name for all main area portrait tab icons.
 */
const PORTRAIT_ICON_CLASS = 'jp-MainAreaPortraitIcon';

/**
 * The class name for the notebook icon from the default theme.
 */
const NOTEBOOK_ICON_CLASS = 'jp-ImageNotebook';

/**
 * The notebook instance tracker.
 */
const tracker = new NotebookTracker();

/**
 * The notebook widget tracker provider.
 */
export
const realtimeNotebookExtension: JupyterLabPlugin<INotebookTracker> = {
  id: 'jupyter.extensions.realtimenotebook',
  provides: INotebookTracker,
  requires: [
    IDocumentRegistry,
    IServiceManager,
    IRenderMime,
    IClipboard,
    IMainMenu,
    ICommandPalette,
    IInspector,
    NotebookPanel.IRenderer
  ],
  activate: activateRealtimeNotebook,
  autoStart: true
};


/**
 * Activate the notebook handler extension.
 */
function activateRealtimeNotebook(app: JupyterLab, registry: IDocumentRegistry, services: IServiceManager, rendermime: IRenderMime, clipboard: IClipboard, mainMenu: IMainMenu, palette: ICommandPalette, inspector: IInspector, renderer: NotebookPanel.IRenderer): INotebookTracker {
  let widgetFactory = new NotebookWidgetFactory(rendermime, clipboard, renderer);
  let options: DocumentRegistry.IWidgetFactoryOptions = {
    fileExtensions: ['.ripynb'],
    displayName: 'Realtime notebook',
    modelName: 'realtime notebook',
    defaultFor: ['.ripynb'],
    preferKernel: true,
    canStartKernel: true
  };

  // Sync tracker and set the source of the code inspector.
  app.shell.currentChanged.connect((sender, args) => {
    let widget = tracker.sync(args.newValue);
    if (widget) {
      inspector.source = widget.content.inspectionHandler;
    }
  });

  registry.addModelFactory(new RealtimeNotebookModelFactory());
  registry.addWidgetFactory(widgetFactory, options);

  registry.addFileType({
    name: 'realtime notebook',
    extension: '.ripynb',
    contentType: 'notebook',
    fileFormat: 'json'
  });
  registry.addCreator({
    name: 'Realtime Notebook',
    fileType: 'realtime notebook'
    //widgetName: 'Notebook'
  });


  let id = 0; // The ID counter for notebook panels.

  widgetFactory.widgetCreated.connect((sender, widget) => {
    // If the notebook panel does not have an ID, assign it one.
    widget.id = widget.id || `notebook-${++id}`;
    widget.title.icon = `${PORTRAIT_ICON_CLASS} ${NOTEBOOK_ICON_CLASS}`;
    // Immediately set the inspector source to the current notebook.
    inspector.source = widget.content.inspectionHandler;
    // Add the notebook panel to the tracker.
    tracker.add(widget);
  });

  authorize();

  return tracker;
}
