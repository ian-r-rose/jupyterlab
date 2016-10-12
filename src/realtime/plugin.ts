// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  FocusTracker
} from 'phosphor/lib/ui/focustracker';

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  IMainMenu
} from '../mainmenu';

import {
  RealtimeDocumentModel, RealtimeTextModelFactory
} from './model';

import {
  setupRealtime, createPermissions
} from './auth';

import {
  EditorWidgetFactory, EditorWidget
} from '../editorwidget';

import {
  IEditorTracker
} from '../editorwidget';

/**
 * The class name for all main area portrait tab icons.
 */
const PORTRAIT_ICON_CLASS = 'jp-MainAreaPortraitIcon';

/**
 * The class name for the text editor icon from the default theme.
 */
const EDITOR_ICON_CLASS = 'jp-ImageTextEditor';

/**
 * The table file handler extension.
 */
export
const realtimeExtension: JupyterLabPlugin<IEditorTracker> = {
  id: 'jupyter.extensions.realtime',
  requires: [IDocumentRegistry, IMainMenu],
  activate: activateRealtime,
  provides: IEditorTracker,
  autoStart: true
};

const cmdIds = {
  newRealtimeFile : 'realtime:create-new',
  shareRealtimeFile : 'realtime:share'
};

/**
 * Activate the table widget extension.
 */
function activateRealtime(app: JupyterLab, registry: IDocumentRegistry, mainMenu : IMainMenu): IEditorTracker {

  let widgetFactory = new EditorWidgetFactory();
  let tracker = new FocusTracker<EditorWidget>();
  widgetFactory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = `${PORTRAIT_ICON_CLASS} ${EDITOR_ICON_CLASS}`;
    tracker.add(widget);
  });
  registry.addWidgetFactory(widgetFactory,
  {
    fileExtensions: ['.rtxt'],
    defaultFor: ['.rtxt'],
    displayName: 'Realtime text',
    modelName: 'realtime text',
    preferKernel: false,
    canStartKernel: false
  });

  registry.addModelFactory(new RealtimeTextModelFactory());
  registry.addFileType({
    name: 'realtime text',
    extension: '.rtxt',
    contentType: 'file',
    fileFormat: 'text'
  });

  registry.addCreator({
    name: 'Realtime Text File',
    fileType: 'realtime text',
  });

  setupRealtime();

  mainMenu.addMenu(createMenu(app, tracker), {rank: 60});
  let commands = app.commands;

  commands.addCommand(cmdIds.newRealtimeFile, {
    label: 'New Realtime Text File',
    caption: 'Create a new realtime text file',
    execute: () => { console.log("Hello.");} 
  });

  commands.addCommand(cmdIds.shareRealtimeFile, {
    label: 'Share',
    caption: 'Share this file through Google ID',
    execute: ()=> {shareRealtimeDocument(tracker);}
  });

  return tracker;
}


function createMenu( app: JupyterLab, tracker: IEditorTracker ) : Menu {

  let {commands, keymap} = app;
  let menu = new Menu( {commands, keymap} )
  menu.title.label = 'Realtime'

  menu.addItem( {command: cmdIds.newRealtimeFile});
  menu.addItem( {command: cmdIds.shareRealtimeFile});

  return menu;
}

function shareRealtimeDocument(tracker : IEditorTracker) {
  if (tracker.currentWidget) {
    debugger;
    let model = tracker.currentWidget.context.model
    let fileId : string = (model as RealtimeDocumentModel).fileId;
    let emailAddress = 'jupyter.realtime@gmail.com';
    createPermissions(fileId, emailAddress);
    console.log(fileId);
  }
}
