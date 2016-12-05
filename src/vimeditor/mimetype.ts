// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/services';

import {
  IEditorMimeTypeService
} from '../codeeditor';

/**
 * The mime type service for vim.
 */
export
class VimMimeTypeService implements IEditorMimeTypeService {
  /**
   * Returns a mime type for the given language info.
   *
   * #### Notes
   * If a mime type cannot be found returns the defaul mime type `text/plain`, never `null`.
   */
  getMimeTypeByLanguage(info: nbformat.ILanguageInfoMetadata): string {
    return IEditorMimeTypeService.defaultMimeType;
  }
  /**
   * Returns a mime type for the given file path.
   *
   * #### Notes
   * If a mime type cannot be found returns the defaul mime type `text/plain`, never `null`.
   */
  getMimeTypeByFilePath(path: string): string {
    return IEditorMimeTypeService.defaultMimeType;
  }
}
