// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IMainMenu
} from '../mainmenu';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  GoogleRealtimeHandler
} from './handler';

import {
  authorize, createPermissions
} from './gapi';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  DocumentRegistry
} from '../docregistry/registry';

/**
 * The editor widget instance tracker.
 */
const tracker = new InstanceTracker<Widget>();

export
const realtimeExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.realtime',
  requires: [IMainMenu],
  activate: activateRealtime,
  autoStart: true
};

const cmdIds = {
  shareRealtimeFile : 'realtime:share'
};

function activateRealtime(app: JupyterLab, mainMenu : IMainMenu): void {

  // Sync tracker with currently focused widget.
  app.shell.currentChanged.connect((sender, args) => {
    tracker.sync(args.newValue);
  });

  authorize();

  mainMenu.addMenu(createMenu(app), {rank: 60});
  let commands = app.commands;

  commands.addCommand(cmdIds.shareRealtimeFile, {
    label: 'Share',
    caption: 'Share this file through Google ID',
    execute: ()=> {/*shareRealtimeDocument();*/}
  });
}


function createMenu( app: JupyterLab ) : Menu {

  let {commands, keymap} = app;
  let menu = new Menu( {commands, keymap} )
  menu.title.label = 'Realtime'

  menu.addItem( {command: cmdIds.shareRealtimeFile});

  return menu;
}

export
function shareRealtimeDocument( model : any) : void {
  if (model) {
    let query : string = (window as any).location.search;
    let handler : GoogleRealtimeHandler = null;
    if (query) {
      let fileId : string = query.slice(1);
      handler = new GoogleRealtimeHandler(fileId);
    } else {
      handler = new GoogleRealtimeHandler();
    }
    console.log(handler.fileId);

    //let model : DocumentRegistry.IModel = (tracker.currentWidget as any).context.model;
    (model as any).registerCollaborative(handler);
    let fileId : string = handler.fileId;
    let emailAddress = 'jupyter.realtime@gmail.com';
    //createPermissions(fileId, emailAddress);
  }
}
