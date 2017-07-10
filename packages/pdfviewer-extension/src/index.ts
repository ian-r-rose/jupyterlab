// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  InstanceTracker
} from '@jupyterlab/apputils';

import {
  MimeDocumentFactory, MimeDocument
} from '@jupyterlab/docregistry';

import '../style/index.css';

/**
 * The list of file extensions for PDFs.
 */
const EXTENSIONS = ['.pdf'];

/**
 * The name of the factory that creates PDF widgets.
 */
const FACTORY = 'PDF';

/**
 * The PDF file handler extension.
 */
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: 'jupyter.extensions.pdf-handler',
  requires: [ILayoutRestorer],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the PDF widget extension.
 */
function activate(app: JupyterLab, restorer: ILayoutRestorer) {
  const namespace = 'PDF-widget';
  const factory = new MimeDocumentFactory({
    name: FACTORY,
    modelName: 'base64',
    fileExtensions: EXTENSIONS,
    defaultFor: EXTENSIONS,
    mimeType: 'application/pdf',
    readOnly: true,
    rendermime: app.rendermime
  });
  const tracker = new InstanceTracker<MimeDocument>({ namespace });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: 'file-operations:open',
    args: widget => ({ path: widget.context.path, factory: FACTORY }),
    name: widget => widget.context.path
  });

  app.docRegistry.addWidgetFactory(factory);

  factory.widgetCreated.connect((sender, widget) => {
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
    tracker.add(widget);
  });
}
