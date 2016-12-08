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

import {
  GoogleRealtime
} from './googlerealtime';


let trackerSet = new Set<[InstanceTracker<Widget>, (widget: Widget)=>IRealtimeModel]>();

export
const plugin: JupyterLabPlugin<IRealtime> = {
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

  let realtime = new GoogleRealtime();

  mainMenu.addMenu(createMenu(app), {rank: 60});
  let commands = app.commands;

  commands.addCommand(cmdIds.shareRealtimeFile, {
    label: 'Share',
    caption: 'Share this file',
    execute: ()=> {
      let model = getRealtimeModel(app);
      if (model) realtime.shareDocument(model);
    }
  });
  commands.addCommand(cmdIds.openRealtimeFile, {
    label: 'Open',
    caption: 'Open a file that has been shared with you',
    execute: ()=> {
      let model = getRealtimeModel(app);
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

function getRealtimeModel( app: JupyterLab): IRealtimeModel {
  let model: IRealtimeModel = null;
  let widget = app.shell.currentWidget;
  trackerSet.forEach( ([tracker, getModel]) => {
    if (tracker.has(widget)) {
      model = getModel(widget);
    }
  });
  return model as IRealtimeModel;
}

export
function addRealtimeTracker( tracker: InstanceTracker<Widget>, getModel : (widget: Widget)=>IRealtimeModel ): void {
  trackerSet.add([tracker, getModel]);
}
