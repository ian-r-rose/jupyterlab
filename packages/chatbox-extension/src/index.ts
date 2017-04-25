// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, ILayoutRestorer
} from '@jupyterlab/apputils';

import {
  IEditorServices
} from '@jupyterlab/codeeditor';

import {
  ChatboxPanel
} from '@jupyterlab/chatbox';

import {
  IRenderMime
} from '@jupyterlab/rendermime';


/**
 * The command IDs used by the chatbox plugin.
 */
namespace CommandIDs {
  export
  const create = 'chatbox:create';

  export
  const clear = 'chatbox:clear';

  export
  const run = 'chatbox:push';

  export
  const linebreak = 'chatbox:linebreak';
};

/**
 * The chatbox widget content factory.
 */
export
const chatboxPlugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.chatbox',
  requires: [IRenderMime, ICommandPalette, IEditorServices, ILayoutRestorer],
  autoStart: true,
  activate: activateChatbox
}


/**
 * Export the plugin as the default.
 */
export default chatboxPlugin;


/**
 * Activate the chatbox extension.
 */
function activateChatbox(app: JupyterLab, rendermime: IRenderMime, palette: ICommandPalette, editorServices: IEditorServices, restorer: ILayoutRestorer): void {
  let { commands, shell } = app;
  let category = 'Chatbox';
  let command: string;

  /**
   * Create a chatbox for a given path.
   */
  let editorFactory = editorServices.factoryService.newInlineEditor.bind(
    editorServices.factoryService);
  let contentFactory = new ChatboxPanel.ContentFactory({ editorFactory });
  let panel = new ChatboxPanel({
    rendermime: rendermime.clone(),
    contentFactory,
    mimeTypeService: editorServices.mimeTypeService
  });

  // Add the chatbox panel to the tracker.
  panel.title.label = 'Chat';
  shell.addToLeftArea(panel);


  command = CommandIDs.clear;
  commands.addCommand(command, {
    label: 'Clear Cells',
    execute: args => {
      panel.chatbox.clear();
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.run;
  commands.addCommand(command, {
    label: 'Run Cell',
    execute: args => {
      return panel.chatbox.execute();
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.linebreak;
  commands.addCommand(command, {
    label: 'Insert Line Break',
    execute: args => {
      panel.chatbox.insertLinebreak();
    }
  });
  palette.addItem({ command, category });
}
