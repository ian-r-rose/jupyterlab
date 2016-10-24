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

import {
  showDialog, okButton
} from '../dialog';

/**
 * The realtime widget instance tracker.
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
  shareRealtimeFile : 'realtime:share',
  openRealtimeFile : 'realtime:open'
};

function activateRealtime(app: JupyterLab, mainMenu : IMainMenu): void {

  // Sync tracker with currently focused widget.
  app.shell.currentChanged.connect((sender, args) => {
    if(!tracker.has(args.newValue)) {
      tracker.add(args.newValue);
    }
    tracker.sync(args.newValue);
  });

  authorize();

  mainMenu.addMenu(createMenu(app), {rank: 60});
  let commands = app.commands;

  commands.addCommand(cmdIds.shareRealtimeFile, {
    label: 'Share',
    caption: 'Share this file through Google ID',
    execute: ()=> {
      let input = document.createElement('input');
      showDialog({
        title: 'Email address...',
        body: input,
        okText: 'SHARE'
      }).then(result => {
        if (result.text === 'SHARE') {
          shareRealtimeDocument(input.value);
        }
      });
    }
  });
  commands.addCommand(cmdIds.openRealtimeFile, {
    label: 'Open',
    caption: 'Open a file that has been shared with you',
    execute: ()=> {
      let input = document.createElement('input');
      showDialog({
        title: 'File ID...',
        body: input,
        okText: 'OPEN'
      }).then(result => {
        if (result.text === 'OPEN') {
          openRealtimeDocument( input.value);
        }
      });
    }
  });
}


function createMenu( app: JupyterLab ) : Menu {

  let {commands, keymap} = app;
  let menu = new Menu( {commands, keymap} )
  menu.title.label = 'Realtime'

  menu.addItem( {command: cmdIds.shareRealtimeFile});
  menu.addItem( {command: cmdIds.openRealtimeFile});

  return menu;
}

export
function shareRealtimeDocument( emailAddress : string) : void {
  if (tracker.currentWidget) {
    let handler = new GoogleRealtimeHandler();
    //let model : DocumentRegistry.IModel = (tracker.currentWidget as any).context.model;
    let model = (tracker.currentWidget as any)._content;
    (model as any).registerCollaborative(handler);
    handler.ready.then( () => {
      console.log(handler.fileId);
      createPermissions(handler.fileId, emailAddress);
    });
  }
}

export
function openRealtimeDocument( fileId: string) : void {
  let handler = new GoogleRealtimeHandler(fileId);
  let model = (tracker.currentWidget as any)._content;
  (model as any).registerCollaborative(handler);
}

