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
  IInspector
} from '../inspector';

import {
  ILayoutRestorer
} from '../layoutrestorer';

import {
  IRenderMime
} from '../rendermime';

import {
  IServiceManager
} from '../services';

import {
  INotebookTracker, NotebookModelFactory, NotebookPanel,
  NotebookTracker, NotebookWidgetFactory, NotebookActions,
  Notebook, NotebookModel, trustNotebook
} from './index';

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
 * The map of command ids used by the notebook.
 */
const cmdIds = {
  interrupt: 'notebook:interrupt-kernel',
  restart: 'notebook:restart-kernel',
  restartClear: 'notebook:restart-clear',
  restartRunAll: 'notebook:restart-runAll',
  switchKernel: 'notebook:switch-kernel',
  clearAllOutputs: 'notebook:clear-outputs',
  closeAndHalt: 'notebook:close-and-halt',
  trust: 'notebook:trust',
  run: 'notebook-cells:run',
  runAndAdvance: 'notebook-cells:run-and-advance',
  runAndInsert: 'notebook-cells:run-and-insert',
  runAll: 'notebook:run-all',
  toCode: 'notebook-cells:to-code',
  toMarkdown: 'notebook-cells:to-markdown',
  toRaw: 'notebook-cells:to-raw',
  cut: 'notebook-cells:cut',
  copy: 'notebook-cells:copy',
  paste: 'notebook-cells:paste',
  moveUp: 'notebook-cells:move-up',
  moveDown: 'notebook-cells:move-down',
  clearOutputs: 'notebook-cells:clear-output',
  deleteCell: 'notebook-cells:delete',
  insertAbove: 'notebook-cells:insert-above',
  insertBelow: 'notebook-cells:insert-below',
  selectAbove: 'notebook-cells:select-above',
  selectBelow: 'notebook-cells:select-below',
  extendAbove: 'notebook-cells:extend-above',
  extendBelow: 'notebook-cells:extend-below',
  editMode: 'notebook:edit-mode',
  merge: 'notebook-cells:merge',
  split: 'notebook-cells:split',
  commandMode: 'notebook:command-mode',
  toggleLines: 'notebook-cells:toggle-line-numbers',
  toggleAllLines: 'notebook-cells:toggle-all-line-numbers',
  undo: 'notebook-cells:undo',
  redo: 'notebook-cells:redo',
  markdown1: 'notebook-cells:markdown-header1',
  markdown2: 'notebook-cells:markdown-header2',
  markdown3: 'notebook-cells:markdown-header3',
  markdown4: 'notebook-cells:markdown-header4',
  markdown5: 'notebook-cells:markdown-header5',
  markdown6: 'notebook-cells:markdown-header6',
};

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
    NotebookPanel.IRenderer,
    ILayoutRestorer
  ],
  activate: activateNotebookHandler,
  autoStart: true
};


/**
 * The notebook renderer provider.
 */
export
const rendererPlugin: JupyterLabPlugin<NotebookPanel.IRenderer> = {
  id: 'jupyter.services.notebook-renderer',
  provides: NotebookPanel.IRenderer,
  requires: [IEditorServices],
  autoStart: true,
  activate: (app: JupyterLab, editorServices: IEditorServices) => {
    const notebookRenderer = new Notebook.Renderer({ editorServices });
    return new NotebookPanel.Renderer({ notebookRenderer });
  }
};


/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [rendererPlugin, trackerPlugin];
export default plugins;


/**
 * Activate the notebook handler extension.
 */
function activateNotebookHandler(app: JupyterLab, registry: IDocumentRegistry, services: IServiceManager, rendermime: IRenderMime, clipboard: IClipboard, mainMenu: IMainMenu, palette: ICommandPalette, inspector: IInspector, renderer: NotebookPanel.IRenderer, layout: ILayoutRestorer): INotebookTracker {

  const factory = new NotebookWidgetFactory({
    name: FACTORY,
    fileExtensions: ['.ipynb'],
    modelName: 'notebook',
    defaultFor: ['.ipynb'],
    preferKernel: true,
    canStartKernel: true,
    rendermime,
    clipboard,
    renderer
  });

  const tracker = new NotebookTracker({ namespace: 'notebook' });

  // Handle state restoration.
  layout.restore(tracker, {
    command: 'file-operations:open',
    args: panel => ({ path: panel.context.path, factory: FACTORY }),
    name: panel => panel.context.path,
    when: services.ready
  });

  // Sync tracker and set the source of the code inspector.
  app.shell.currentChanged.connect((sender, args) => {
    let widget = tracker.sync(args.newValue);
    if (widget) {
      inspector.source = widget.content.inspectionHandler;
    }
  });

  registry.addModelFactory(new NotebookModelFactory());
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
    inspector.source = widget.content.inspectionHandler;
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
        let content = current.content;
        NotebookActions.runAndAdvance(content, current.context.kernel);
      }
    }
  });
  commands.addCommand(cmdIds.run, {
    label: 'Run Cell(s)',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.run(current.content, current.context.kernel);
      }
    }
  });
  commands.addCommand(cmdIds.runAndInsert, {
    label: 'Run Cell(s) and Insert',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.runAndInsert(current.content, current.context.kernel);
      }
    }
  });
  commands.addCommand(cmdIds.runAll, {
    label: 'Run All Cells',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.runAll(current.content, current.context.kernel);
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
            NotebookActions.clearAllOutputs(current.content);
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
          NotebookActions.runAll(current.content, current.context.kernel);
        });
      }
    }
  });
  commands.addCommand(cmdIds.clearAllOutputs, {
    label: 'Clear All Outputs',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.clearAllOutputs(current.content);
      }
    }
  });
  commands.addCommand(cmdIds.clearOutputs, {
    label: 'Clear Output(s)',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.clearOutputs(current.content);
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
        NotebookActions.changeCellType(current.content, 'code');
      }
    }
  });
  commands.addCommand(cmdIds.toMarkdown, {
    label: 'Convert to Markdown',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.changeCellType(current.content, 'markdown');
      }
    }
  });
  commands.addCommand(cmdIds.toRaw, {
    label: 'Convert to Raw',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.changeCellType(current.content, 'raw');
      }
    }
  });
  commands.addCommand(cmdIds.cut, {
    label: 'Cut Cell(s)',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.cut(current.content, current.clipboard);
      }
    }
  });
  commands.addCommand(cmdIds.copy, {
    label: 'Copy Cell(s)',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.copy(current.content, current.clipboard);
      }
    }
  });
  commands.addCommand(cmdIds.paste, {
    label: 'Paste Cell(s)',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.paste(current.content, current.clipboard);
      }
    }
  });
  commands.addCommand(cmdIds.deleteCell, {
    label: 'Delete Cell(s)',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.deleteCells(current.content);
      }
    }
  });
  commands.addCommand(cmdIds.split, {
    label: 'Split Cell',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.splitCell(current.content);
      }
    }
  });
  commands.addCommand(cmdIds.merge, {
    label: 'Merge Selected Cell(s)',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.mergeCells(current.content);
      }
    }
  });
  commands.addCommand(cmdIds.insertAbove, {
    label: 'Insert Cell Above',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.insertAbove(current.content);
      }
    }
  });
  commands.addCommand(cmdIds.insertBelow, {
    label: 'Insert Cell Below',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.insertBelow(current.content);
      }
    }
  });
  commands.addCommand(cmdIds.selectAbove, {
    label: 'Select Cell Above',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.selectAbove(current.content);
      }
    }
  });
  commands.addCommand(cmdIds.selectBelow, {
    label: 'Select Cell Below',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.selectBelow(current.content);
      }
    }
  });
  commands.addCommand(cmdIds.extendAbove, {
    label: 'Extend Selection Above',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.extendSelectionAbove(current.content);
      }
    }
  });
  commands.addCommand(cmdIds.extendBelow, {
    label: 'Extend Selection Below',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.extendSelectionBelow(current.content);
      }
    }
  });
  commands.addCommand(cmdIds.moveUp, {
    label: 'Move Cell(s) Up',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.moveUp(current.content);
      }
    }
  });
  commands.addCommand(cmdIds.moveDown, {
    label: 'Move Cell(s) Down',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.moveDown(current.content);
      }
    }
  });
  commands.addCommand(cmdIds.toggleLines, {
    label: 'Toggle Line Numbers',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.toggleLineNumbers(current.content);
      }
    }
  });
  commands.addCommand(cmdIds.toggleAllLines, {
    label: 'Toggle All Line Numbers',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.toggleAllLineNumbers(current.content);
      }
    }
  });
  commands.addCommand(cmdIds.commandMode, {
    label: 'To Command Mode',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        current.content.mode = 'command';
      }
    }
  });
  commands.addCommand(cmdIds.editMode, {
    label: 'To Edit Mode',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        current.content.mode = 'edit';
      }
    }
  });
  commands.addCommand(cmdIds.undo, {
    label: 'Undo Cell Operation',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.undo(current.content);
      }
    }
  });
  commands.addCommand(cmdIds.redo, {
    label: 'Redo Cell Operation',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.redo(current.content);
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
        NotebookActions.setMarkdownHeader(current.content, 1);
      }
    }
  });
  commands.addCommand(cmdIds.markdown2, {
    label: 'Markdown Header 2',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.setMarkdownHeader(current.content, 2);
      }
    }
  });
  commands.addCommand(cmdIds.markdown3, {
    label: 'Markdown Header 3',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.setMarkdownHeader(current.content, 3);
      }
    }
  });
  commands.addCommand(cmdIds.markdown4, {
    label: 'Markdown Header 4',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.setMarkdownHeader(current.content, 4);
      }
    }
  });
  commands.addCommand(cmdIds.markdown5, {
    label: 'Markdown Header 5',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.setMarkdownHeader(current.content, 5);
      }
    }
  });
  commands.addCommand(cmdIds.markdown6, {
    label: 'Markdown Header 6',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        NotebookActions.setMarkdownHeader(current.content, 6);
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
