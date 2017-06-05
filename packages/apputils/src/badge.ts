// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from '@phosphor/widgets';

import {
  ICollaborator
} from '@jupyterlab/coreutils';

/**
 * The class name added to collaborator badges.
 */
const COLLABORATOR_BADGE_CLASS = 'jp-Collaborator-badge';


/**
 * A collaborator badge widget.
 */
export
class CollaboratorBadge extends Widget {
  /**
   * Construct a collaborator badge widget.
   */
  constructor(collaborator: ICollaborator) {
    super();
    this.addClass(COLLABORATOR_BADGE_CLASS);

    let badgeName = collaborator.shortName ||
                    collaborator.displayName.split(' ')
                    .filter(s => s).map(s => s[0]).join('');
    this.node.textContent = badgeName;
    this.node.title = collaborator.displayName;

    this.node.style.backgroundColor = collaborator.color;
  }
}
