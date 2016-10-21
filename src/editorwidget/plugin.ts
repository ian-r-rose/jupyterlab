// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each
} from 'phosphor/lib/algorithm/iteration';

import {
  AttachedProperty
} from 'phosphor/lib/core/properties';

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  EditorWidgetFactory, EditorWidget
} from './widget';

import {
  ICommandPalette
} from '../commandpalette';

import {
  IMainMenu
} from '../mainmenu';

import {
  IEditorTracker
} from './index';

import {
  DEFAULT_CODEMIRROR_THEME
} from '../codemirror/widget';

import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/addon/comment/comment.js';
import 'codemirror/keymap/vim.js';


/**
 * The class name for all main area portrait tab icons.
 */
const PORTRAIT_ICON_CLASS = 'jp-MainAreaPortraitIcon';

/**
 * The class name for the text editor icon from the default theme.
 */
const EDITOR_ICON_CLASS = 'jp-ImageTextEditor';

/**
 * The map of command ids used by the editor.
 */
const cmdIds = {
  lineNumbers: 'editor:line-numbers',
  lineWrap: 'editor:line-wrap',
  matchBrackets: 'editor:match-brackets',
  vimMode: 'editor:vim-mode',
  closeAll: 'editor:close-all',
  changeTheme: 'editor:change-theme',
  createConsole: 'editor:create-console',
  runCode: 'editor:run-code'
};

/**
 * The editor widget instance tracker.
 */
const tracker = new InstanceTracker<EditorWidget>();


/**
 * The editor handler extension.
 */
export
const editorHandlerProvider: JupyterLabPlugin<IEditorTracker> = {
  id: 'jupyter.services.editor-handler',
  requires: [IDocumentRegistry, IMainMenu, ICommandPalette],
  provides: IEditorTracker,
  activate: activateEditorHandler,
  autoStart: true
};


/**
 * Sets up the editor widget
 */
function activateEditorHandler(app: JupyterLab, registry: IDocumentRegistry, mainMenu: IMainMenu, palette: ICommandPalette): IEditorTracker {
  let widgetFactory = new EditorWidgetFactory();

  // Sync tracker with currently focused widget.
  app.shell.currentChanged.connect((sender, args) => {
    tracker.sync(args.newValue);
  });

  widgetFactory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = `${PORTRAIT_ICON_CLASS} ${EDITOR_ICON_CLASS}`;
    tracker.add(widget);
  });
  registry.addWidgetFactory(widgetFactory,
  {
    fileExtensions: ['*'],
    displayName: 'Editor',
    modelName: 'text',
    defaultFor: ['*'],
    preferKernel: false,
    canStartKernel: false
  });

  mainMenu.addMenu(createMenu(app), {rank: 30});

  let commands = app.commands;

  commands.addCommand(cmdIds.lineNumbers, {
    execute: () => { toggleLineNums(); },
    label: 'Toggle Line Numbers',
  });

  commands.addCommand(cmdIds.lineWrap, {
    execute: () => { toggleLineWrap(); },
    label: 'Toggle Line Wrap',
  });

  commands.addCommand(cmdIds.matchBrackets, {
    execute: () => { toggleMatchBrackets(); },
    label: 'Toggle Match Brackets',
  });

  commands.addCommand(cmdIds.vimMode, {
    execute: () => { toggleVim(); },
    label: 'Toggle Vim Mode'
  });

  commands.addCommand(cmdIds.closeAll, {
    execute: () => { closeAllFiles(); },
    label: 'Close all files'
  });

  commands.addCommand(cmdIds.createConsole, {
    execute: () => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      let options: any = {
        path: widget.context.path,
        preferredLanguage: widget.context.model.defaultKernelLanguage
      };
      commands.execute('console:create', options).then(id => {
        sessionIdProperty.set(widget, id);
      });
    },
    label: 'Create Console for Editor'
  });

  commands.addCommand(cmdIds.runCode, {
    execute: () => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      // Get the session id.
      let id = sessionIdProperty.get(widget);
      if (!id) {
        return;
      }
      // Get the selected code from the editor.
      let doc = widget.editor.getDoc();
      let code = doc.getSelection();
      if (!code) {
        let { line } = doc.getCursor();
        code = doc.getLine(line);
      }
      commands.execute('console:inject', { id, code });
    },
    label: 'Run Code',
  });

  [
    cmdIds.lineNumbers,
    cmdIds.lineWrap,
    cmdIds.matchBrackets,
    cmdIds.vimMode,
    cmdIds.closeAll,
    cmdIds.createConsole,
    cmdIds.runCode,
  ].forEach(command => palette.addItem({ command, category: 'Editor' }));

  return tracker;
}


/**
 * An attached property for the session id associated with an editor widget.
 */
const sessionIdProperty = new AttachedProperty<EditorWidget, string>({ name: 'sessionId' });


/**
 * Toggle editor line numbers
 */
function toggleLineNums() {
  if (tracker.currentWidget) {
    let editor = tracker.currentWidget.editor;
    editor.setOption('lineNumbers', !editor.getOption('lineNumbers'));
  }
}


/**
 * Toggle editor line wrap
 */
function toggleLineWrap() {
  if (tracker.currentWidget) {
    let editor = tracker.currentWidget.editor;
    editor.setOption('lineWrapping', !editor.getOption('lineWrapping'));
  }
}


/**
 * Toggle editor matching brackets
 */
function toggleMatchBrackets() {
  if (tracker.currentWidget) {
    let editor = tracker.currentWidget.editor;
    editor.setOption('matchBrackets', !editor.getOption('matchBrackets'));
  }
}


/**
 * Toggle the editor's vim mode
 */
function toggleVim() {
  tracker.forEach(widget => {
    let keymap = widget.editor.getOption('keyMap') === 'vim' ? 'default'
      : 'vim';
    widget.editor.setOption('keyMap', keymap);
  });
}


/**
 * Close all currently open text editor files
 */
function closeAllFiles() {
  tracker.forEach(widget => { widget.close(); });
}


/**
 * Create a menu for the editor.
 */
function createMenu(app: JupyterLab): Menu {
  let { commands, keymap } = app;
  let settings = new Menu({ commands, keymap });
  let theme = new Menu({ commands, keymap });
  let menu = new Menu({ commands, keymap });

  menu.title.label = 'Editor';
  settings.title.label = 'Settings';
  theme.title.label = 'Theme';

  settings.addItem({ command: cmdIds.lineNumbers });
  settings.addItem({ command: cmdIds.lineWrap });
  settings.addItem({ command: cmdIds.matchBrackets });
  settings.addItem({ command: cmdIds.vimMode });

  commands.addCommand(cmdIds.changeTheme, {
    label: args => {
      return args['theme'] as string;
    },
    execute: args => {
      let name: string = args['theme'] as string || DEFAULT_CODEMIRROR_THEME;
      tracker.forEach(widget => { widget.editor.setOption('theme', name); });
    }
  });

  [
   'jupyter', 'default', 'abcdef', 'base16-dark', 'base16-light',
   'hopscotch', 'material', 'mbo', 'mdn-like', 'seti', 'the-matrix',
   'xq-light', 'zenburn'
  ].forEach(name => theme.addItem({
    command: 'editor:change-theme',
    args: { theme: name }
  }));

  menu.addItem({ command: cmdIds.closeAll });
  menu.addItem({ type: 'separator' });
  menu.addItem({ type: 'submenu', menu: settings });
  menu.addItem({ type: 'submenu', menu: theme });

  return menu;
}
