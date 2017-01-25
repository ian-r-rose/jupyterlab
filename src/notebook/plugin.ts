// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IClipboard
} from '../clipboard';

import {
  IEditorServices
} from '../codeeditor';

import {
  ICommandPalette
} from '../commandpalette';

import {
  IMainMenu
} from '../mainmenu';

import {
  IDocumentRegistry,
  restartKernel, selectKernelForContext
} from '../docregistry';

import {
  cmdIds as filebrowserCmdIds
} from '../filebrowser';

import {
  IInspector
} from '../inspector';

import {
  IInstanceRestorer
} from '../instancerestorer';

import {
  IRenderMime
} from '../rendermime';

import {
  IServiceManager
} from '../services';

import {
  INotebookTracker, NotebookModelFactory, NotebookPanel,
  NotebookTracker, NotebookWidgetFactory, NotebookActions,
  cmdIds, Notebook, NotebookModel, trustNotebook
} from './';

import {
  addRealtimeTracker
} from '../realtime';


/**
 * The class name for all main area portrait tab icons.
 */
const PORTRAIT_ICON_CLASS = 'jp-MainAreaPortraitIcon';

/**
 * The class name for the notebook icon from the default theme.
 */
const NOTEBOOK_ICON_CLASS = 'jp-ImageNotebook';

/**
 * The name of the factory that creates notebooks.
 */
const FACTORY = 'Notebook';


/**
 * The notebook widget tracker provider.
 */
export
const trackerPlugin: JupyterLabPlugin<INotebookTracker> = {
  id: 'jupyter.services.notebook-tracker',
  provides: INotebookTracker,
  requires: [
    IDocumentRegistry,
    IServiceManager,
    IRenderMime,
    IClipboard,
    IMainMenu,
    ICommandPalette,
    IInspector,
    NotebookPanel.IContentFactory,
    IEditorServices,
    IInstanceRestorer
  ],
  activate: activateNotebookHandler,
  autoStart: true
};


/**
 * The notebook cell factory provider.
 */
export
const contentFactoryPlugin: JupyterLabPlugin<NotebookPanel.IContentFactory> = {
  id: 'jupyter.services.notebook-renderer',
  provides: NotebookPanel.IContentFactory,
  requires: [IEditorServices],
  autoStart: true,
  activate: (app: JupyterLab, editorServices: IEditorServices) => {
    let editorFactory = editorServices.factoryService.newInlineEditor;
    return new NotebookPanel.ContentFactory({ editorFactory });
  }
};


/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [contentFactoryPlugin, trackerPlugin];
export default plugins;


/**
 * Activate the notebook handler extension.
 */
function activateNotebookHandler(app: JupyterLab, registry: IDocumentRegistry, services: IServiceManager, rendermime: IRenderMime, clipboard: IClipboard, mainMenu: IMainMenu, palette: ICommandPalette, inspector: IInspector, contentFactory: NotebookPanel.IContentFactory, editorServices: IEditorServices, restorer: IInstanceRestorer): INotebookTracker {

  const factory = new NotebookWidgetFactory({
    name: FACTORY,
    fileExtensions: ['.ipynb'],
    modelName: 'notebook',
    defaultFor: ['.ipynb'],
    preferKernel: true,
    canStartKernel: true,
    rendermime,
    clipboard,
    contentFactory,
    mimeTypeService: editorServices.mimeTypeService
  });

  const tracker = new NotebookTracker({ namespace: 'notebook' });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: filebrowserCmdIds.open,
    args: panel => ({ path: panel.context.path, factory: FACTORY }),
    name: panel => panel.context.path,
    when: services.ready
  });

  // Set the source of the code inspector.
  tracker.currentChanged.connect((sender, widget) => {
    if (widget) {
      inspector.source = widget.inspectionHandler;
    }
  });

  registry.addModelFactory(new NotebookModelFactory({}));
  registry.addWidgetFactory(factory);
  registry.addFileType({
    name: 'Notebook',
    extension: '.ipynb',
    contentType: 'notebook',
    fileFormat: 'json'
  });
  registry.addCreator({
    name: 'Notebook',
    fileType: 'Notebook',
    widgetName: 'Notebook'
  });

  addCommands(app, services, tracker);
  populatePalette(palette);

  let id = 0; // The ID counter for notebook panels.

  factory.widgetCreated.connect((sender, widget) => {
    // If the notebook panel does not have an ID, assign it one.
    widget.id = widget.id || `notebook-${++id}`;
    widget.title.icon = `${PORTRAIT_ICON_CLASS} ${NOTEBOOK_ICON_CLASS}`;
    // Immediately set the inspector source to the current notebook.
    inspector.source = widget.inspectionHandler;
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
    // Add the notebook panel to the tracker.
    tracker.add(widget);
  });

  // Add main menu notebook menu.
  mainMenu.addMenu(createMenu(app), { rank: 20 });

  addRealtimeTracker(tracker, (widget: NotebookPanel) => {
    return widget.context.model as NotebookModel;
  });
  return tracker;
}

/**
 * Add the notebook commands to the application's command registry.
 */
function addCommands(app: JupyterLab, services: IServiceManager, tracker: NotebookTracker): void {
  let commands = app.commands;

  commands.addCommand(cmdIds.runAndAdvance, {
    label: 'Run Cell(s) and Advance',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        let content = current.notebook;
        NotebookActions.runAndAdvance(content, current.context.kernel);
      }
    }
  });
  commands.addCommand(cmdIds.run, {
    label: 'Run Cell(s)',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.run(current.notebook, current.context.kernel);
      }
    }
  });
  commands.addCommand(cmdIds.runAndInsert, {
    label: 'Run Cell(s) and Insert',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.runAndInsert(current.notebook, current.context.kernel);
      }
    }
  });
  commands.addCommand(cmdIds.runAll, {
    label: 'Run All Cells',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.runAll(current.notebook, current.context.kernel);
      }
    }
  });
  commands.addCommand(cmdIds.restart, {
    label: 'Restart Kernel',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        restartKernel(current.kernel, current.node).then(() => {
          current.activate();
        });
      }
    }
  });
  commands.addCommand(cmdIds.closeAndHalt, {
    label: 'Close and Halt',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        current.context.changeKernel(null).then(() => { current.dispose(); });
      }
    }
  });
  commands.addCommand(cmdIds.trust, {
    label: 'Trust Notebook',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        return trustNotebook(current.context.model).then(() => {
          return current.context.save();
        });
      }
    }
  });
  commands.addCommand(cmdIds.restartClear, {
    label: 'Restart Kernel & Clear Outputs',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        let promise = restartKernel(current.kernel, current.node);
        promise.then(result => {
          current.activate();
          if (result) {
            NotebookActions.clearAllOutputs(current.notebook);
          }
        });
      }
    }
  });
  commands.addCommand(cmdIds.restartRunAll, {
    label: 'Restart Kernel & Run All',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        let promise = restartKernel(current.kernel, current.node);
        promise.then(result => {
          current.activate();
          NotebookActions.runAll(current.notebook, current.context.kernel);
        });
      }
    }
  });
  commands.addCommand(cmdIds.clearAllOutputs, {
    label: 'Clear All Outputs',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.clearAllOutputs(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.clearOutputs, {
    label: 'Clear Output(s)',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.clearOutputs(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.interrupt, {
    label: 'Interrupt Kernel',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        let kernel = current.context.kernel;
        if (kernel) {
          kernel.interrupt();
        }
      }
    }
  });
  commands.addCommand(cmdIds.toCode, {
    label: 'Convert to Code',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.changeCellType(current.notebook, 'code');
      }
    }
  });
  commands.addCommand(cmdIds.toMarkdown, {
    label: 'Convert to Markdown',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.changeCellType(current.notebook, 'markdown');
      }
    }
  });
  commands.addCommand(cmdIds.toRaw, {
    label: 'Convert to Raw',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.changeCellType(current.notebook, 'raw');
      }
    }
  });
  commands.addCommand(cmdIds.cut, {
    label: 'Cut Cell(s)',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.cut(current.notebook, current.clipboard);
      }
    }
  });
  commands.addCommand(cmdIds.copy, {
    label: 'Copy Cell(s)',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.copy(current.notebook, current.clipboard);
      }
    }
  });
  commands.addCommand(cmdIds.paste, {
    label: 'Paste Cell(s)',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.paste(current.notebook, current.clipboard);
      }
    }
  });
  commands.addCommand(cmdIds.deleteCell, {
    label: 'Delete Cell(s)',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.deleteCells(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.split, {
    label: 'Split Cell',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.splitCell(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.merge, {
    label: 'Merge Selected Cell(s)',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.mergeCells(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.insertAbove, {
    label: 'Insert Cell Above',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.insertAbove(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.insertBelow, {
    label: 'Insert Cell Below',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.insertBelow(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.selectAbove, {
    label: 'Select Cell Above',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.selectAbove(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.selectBelow, {
    label: 'Select Cell Below',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.selectBelow(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.extendAbove, {
    label: 'Extend Selection Above',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.extendSelectionAbove(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.extendBelow, {
    label: 'Extend Selection Below',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.extendSelectionBelow(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.moveUp, {
    label: 'Move Cell(s) Up',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.moveUp(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.moveDown, {
    label: 'Move Cell(s) Down',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.moveDown(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.toggleLines, {
    label: 'Toggle Line Numbers',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.toggleLineNumbers(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.toggleAllLines, {
    label: 'Toggle All Line Numbers',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.toggleAllLineNumbers(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.commandMode, {
    label: 'To Command Mode',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        current.notebook.mode = 'command';
      }
    }
  });
  commands.addCommand(cmdIds.editMode, {
    label: 'To Edit Mode',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        current.notebook.mode = 'edit';
      }
    }
  });
  commands.addCommand(cmdIds.undo, {
    label: 'Undo Cell Operation',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.undo(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.redo, {
    label: 'Redo Cell Operation',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.redo(current.notebook);
      }
    }
  });
  commands.addCommand(cmdIds.switchKernel, {
    label: 'Switch Kernel',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        let context = current.context;
        let node = current.node;
        selectKernelForContext(context, services.sessions, node).then(() => {
          current.activate();
        });
      }
    }
  });
  commands.addCommand(cmdIds.markdown1, {
    label: 'Markdown Header 1',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.setMarkdownHeader(current.notebook, 1);
      }
    }
  });
  commands.addCommand(cmdIds.markdown2, {
    label: 'Markdown Header 2',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.setMarkdownHeader(current.notebook, 2);
      }
    }
  });
  commands.addCommand(cmdIds.markdown3, {
    label: 'Markdown Header 3',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.setMarkdownHeader(current.notebook, 3);
      }
    }
  });
  commands.addCommand(cmdIds.markdown4, {
    label: 'Markdown Header 4',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.setMarkdownHeader(current.notebook, 4);
      }
    }
  });
  commands.addCommand(cmdIds.markdown5, {
    label: 'Markdown Header 5',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.setMarkdownHeader(current.notebook, 5);
      }
    }
  });
  commands.addCommand(cmdIds.markdown6, {
    label: 'Markdown Header 6',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.setMarkdownHeader(current.notebook, 6);
      }
    }
  });
  }

/**
 * Populate the application's command palette with notebook commands.
 */
function populatePalette(palette: ICommandPalette): void {
  let category = 'Notebook Operations';
  [
    cmdIds.interrupt,
    cmdIds.restart,
    cmdIds.restartClear,
    cmdIds.restartRunAll,
    cmdIds.runAll,
    cmdIds.clearAllOutputs,
    cmdIds.toggleAllLines,
    cmdIds.editMode,
    cmdIds.commandMode,
    cmdIds.switchKernel,
    cmdIds.closeAndHalt,
    cmdIds.trust
  ].forEach(command => { palette.addItem({ command, category }); });

  category = 'Notebook Cell Operations';
  [
    cmdIds.run,
    cmdIds.runAndAdvance,
    cmdIds.runAndInsert,
    cmdIds.clearOutputs,
    cmdIds.toCode,
    cmdIds.toMarkdown,
    cmdIds.toRaw,
    cmdIds.cut,
    cmdIds.copy,
    cmdIds.paste,
    cmdIds.deleteCell,
    cmdIds.split,
    cmdIds.merge,
    cmdIds.insertAbove,
    cmdIds.insertBelow,
    cmdIds.selectAbove,
    cmdIds.selectBelow,
    cmdIds.extendAbove,
    cmdIds.extendBelow,
    cmdIds.moveDown,
    cmdIds.moveUp,
    cmdIds.toggleLines,
    cmdIds.undo,
    cmdIds.redo,
    cmdIds.markdown1,
    cmdIds.markdown2,
    cmdIds.markdown3,
    cmdIds.markdown4,
    cmdIds.markdown5,
    cmdIds.markdown6
  ].forEach(command => { palette.addItem({ command, category }); });
}

/**
 * Creates a menu for the notebook.
 */
function createMenu(app: JupyterLab): Menu {
  let { commands, keymap } = app;
  let menu = new Menu({ commands, keymap });
  let settings = new Menu({ commands, keymap });

  menu.title.label = 'Notebook';
  settings.title.label = 'Settings';
  settings.addItem({ command: cmdIds.toggleAllLines });

  menu.addItem({ command: cmdIds.undo });
  menu.addItem({ command: cmdIds.redo });
  menu.addItem({ command: cmdIds.split });
  menu.addItem({ command: cmdIds.deleteCell });
  menu.addItem({ command: cmdIds.clearAllOutputs });
  menu.addItem({ command: cmdIds.runAll });
  menu.addItem({ command: cmdIds.restart });
  menu.addItem({ command: cmdIds.switchKernel });
  menu.addItem({ command: cmdIds.closeAndHalt });
  menu.addItem({ command: cmdIds.trust });
  menu.addItem({ type: 'separator' });
  menu.addItem({ type: 'submenu', menu: settings });

  return menu;
}
