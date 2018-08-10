// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { PromiseDelegate } from '@phosphor/coreutils';

import { Widget } from '@phosphor/widgets';

import { Context } from '@jupyterlab/docregistry';

import { CodeCell, MarkdownCell } from '@jupyterlab/cells';

import { ToolbarItems } from '@jupyterlab/notebook';

import { INotebookModel } from '@jupyterlab/notebook';

import { NotebookPanel } from '@jupyterlab/notebook';

import { createNotebookContext, NBTestUtils } from '@jupyterlab/testutils';

describe('@jupyterlab/notebook', () => {
  describe('ToolbarItems', () => {
    let context: Context<INotebookModel>;
    let panel: NotebookPanel;

    describe('#createRunButton()', () => {
      it('should run and advance when clicked', async () => {
        for (let i = 0; i < 10; ++i) {
          context = await createNotebookContext();
          await context.initialize(true);
          panel = NBTestUtils.createNotebookPanel(context);
          context.model.fromJSON(NBTestUtils.DEFAULT_CONTENT);

          const button = ToolbarItems.createRunButton(panel);
          const widget = panel.content;

          // Clear and select the first two cells.
          const codeCell = widget.widgets[0] as CodeCell;
          codeCell.model.outputs.clear();
          widget.select(codeCell);
          const mdCell = widget.widgets[1] as MarkdownCell;
          mdCell.rendered = false;
          widget.select(mdCell);

          Widget.attach(button, document.body);
          await context.ready;
          await context.session.ready;
          await context.session.kernel.ready;
          const p = new PromiseDelegate();
          context.session.statusChanged.connect((sender, status) => {
            // Find the right status idle message
            if (status === 'idle' && codeCell.model.outputs.length > 0) {
              expect(mdCell.rendered).to.equal(true);
              expect(widget.activeCellIndex).to.equal(2);
              button.dispose();
              p.resolve(0);
            }
          });
          button.node.click();
          await p.promise;

          await context.session.shutdown();
          context.dispose();
          panel.dispose();
        }
      });
    });
  });
});
