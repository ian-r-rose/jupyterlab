// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  ChatboxWidget
} from './widget';

import {
  ICommandPalette
} from '../commandpalette';

import {
  IEditorServices
} from '../codeeditor';

/**
 * The chatbox file handler extension.
 */
export
const plugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.chatbox-handler',
  requires: [IEditorServices, ICommandPalette],
  activate: activateChatboxWidget,
  autoStart: true
};


/**
 * Activate the chatbox widget extension.
 */
function activateChatboxWidget(app: JupyterLab, editorServices: IEditorServices, commandPalette: ICommandPalette): void {

  const tracker = new InstanceTracker<ChatboxWidget>();

  // Sync tracker with currently focused widget.
  app.shell.currentChanged.connect((sender, args) => {
    tracker.sync(args.newValue);
  });

  let {commands, keymap} = app;
  let command: string;
  let category: string = 'Realtime';
  command = 'realtime:create-chatbox';
  commands.addCommand(command, {
    label: 'Open Chatbox',
    execute: ()=>{
      let chatbox = new ChatboxWidget();
      chatbox.id = chatbox.id || `chatbox`;
      tracker.add(chatbox);
      app.shell.addToMainArea(chatbox);
      app.shell.activateMain(chatbox.id);
    }
  });
  commandPalette.addItem({command, category});
  command = 'realtime:push-message';
  commands.addCommand(command, {
    label: 'Push message',
    execute: ()=>{
      debugger;
      let widget = tracker.currentWidget;
      widget.content.push("Hello");
    }
  });
  commandPalette.addItem({command, category});
}
