// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  FocusTracker
} from 'phosphor/lib/ui/focustracker';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  RealtimeDocumentModel, RealtimeTextModelFactory
} from './model';

import {
  setupRealtime
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
const realtimeExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.realtime',
  requires: [IDocumentRegistry],
  activate: activateRealtime,
  provides: IEditorTracker,
  autoStart: true
};


/**
 * Activate the table widget extension.
 */
function activateRealtime(app: JupyterLab, registry: IDocumentRegistry): void {

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
}
