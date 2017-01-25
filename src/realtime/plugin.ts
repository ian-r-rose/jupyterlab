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
  IRealtime, IRealtimeModel
} from './realtime';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  showDialog, okButton
} from '../dialog';


const plugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.realtime-menu',
  requires: [IMainMenu],
  activate: activateRealtimeMenu,
  autoStart: true
};

const cmdIds = {
  shareRealtimeFile : 'realtime:share',
  openRealtimeFile : 'realtime:open',
};

function activateRealtimeMenu(app: JupyterLab, mainMenu : IMainMenu): void {
  app.resolveService(IRealtime).then((realtimeServices)=>{
    mainMenu.addMenu(createMenu(app), {rank: 60});
    let commands = app.commands;

    commands.addCommand(cmdIds.shareRealtimeFile, {
      label: 'Share file',
      caption: 'Share this file',
      execute: ()=> {
        let widget = app.shell.currentWidget;
        let model = realtimeServices.checkTrackers(widget);
        if (model) {
          realtimeServices.shareDocument(model);
        }
      }
    });
    commands.addCommand(cmdIds.openRealtimeFile, {
      label: 'Open shared file',
      caption: 'Open a file that has been shared with you',
      execute: ()=> {
        let widget = app.shell.currentWidget;
        let model = realtimeServices.checkTrackers(widget);
        if(model) {
          realtimeServices.openSharedDocument(model);
        }
      }
    });
  }).catch( ()=>{
    console.log("Realtime services not found, so no menu created.");
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

/**
 * Export the plugin as default.
 */
export default plugin;
