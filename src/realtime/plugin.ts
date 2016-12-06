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
  GoogleRealtimeHandler
} from './handler';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  showDialog, okButton
} from '../dialog';

import {
  GoogleRealtime
} from './googlerealtime';


let tracker = new InstanceTracker<Widget>();

export
const realtimeProvider: JupyterLabPlugin<IRealtime> = {
  id: 'jupyter.services.realtime',
  requires: [IMainMenu],
  provides: IRealtime,
  activate: activateRealtime,
  autoStart: true
};

const cmdIds = {
  shareRealtimeFile : 'realtime:share',
  openRealtimeFile : 'realtime:open'
};

function activateRealtime(app: JupyterLab, mainMenu : IMainMenu): IRealtime {

  // Sync tracker with currently focused widget.
  app.shell.currentChanged.connect((sender, args) => {
    if(!tracker.has(args.newValue)) {
      tracker.add(args.newValue);
    }
    tracker.sync(args.newValue);
  });

  let realtime = new GoogleRealtime();

  mainMenu.addMenu(createMenu(app), {rank: 60});
  let commands = app.commands;

  commands.addCommand(cmdIds.shareRealtimeFile, {
    label: 'Share',
    caption: 'Share this file',
    execute: ()=> {
      let model = getRealtimeModel();
      if (model) realtime.shareDocument(model);
    }
  });
  commands.addCommand(cmdIds.openRealtimeFile, {
    label: 'Open',
    caption: 'Open a file that has been shared with you',
    execute: ()=> {
      let model = getRealtimeModel();
      if(model) realtime.openSharedDocument(model);
    }
  });

  return realtime;
}


function createMenu( app: JupyterLab ) : Menu {

  let {commands, keymap} = app;
  let menu = new Menu( {commands, keymap} )
  menu.title.label = 'Realtime'

  menu.addItem( {command: cmdIds.shareRealtimeFile});
  menu.addItem( {command: cmdIds.openRealtimeFile});

  return menu;
}

function getRealtimeModel(): IRealtimeModel {
  let model: IRealtimeModel = null;
  let widget = tracker.currentWidget;
  if (widget) {
    if (widget.hasOwnProperty("_content")) {
      model = (widget as any)._content;
    } else {
      model = (widget as any).context.model;
    }
  }
  return model as IRealtimeModel;
}
