// Copyright (c) Jupyter Development Team.
//
// Distributed under the terms of the Modified BSD License.

import {
  showDialog
} from '../dialog';

declare let gapi : any;

const CLIENT_ID = '625147942732-t30t8vnn43fl5mvg1qde5pl84603dr6s.apps.googleusercontent.com';

const FILES_OAUTH_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const METADATA_OAUTH_SCOPE = 'https://www.googleapis.com/auth/drive.metadata';
const INSTALL_SCOPE = 'https://www.googleapis.com/auth/drive.install'
const RT_MIMETYPE = 'application/vnd.google-apps.drive-sdk';



export function authorize () : void {

  let handleAuthorization = function (authResult : any) {
    if (authResult && !authResult.error) {
      return;
    } else {
      popupAuthorization();
    }
  }

  let popupAuthorization = function() {
    showDialog({
      title: 'Proceed to Google Authorization?',
      okText: 'OK'
    }).then( result => {
      if (result.text === 'OK') {
        gapi.auth.authorize({
          client_id: CLIENT_ID,
          scope: [ FILES_OAUTH_SCOPE, METADATA_OAUTH_SCOPE],
          immediate: false
          },
          handleAuthorization);
      } else {
        return;
      }
    });
  }

  //Attempt to authorize without a popup
  gapi.auth.authorize({
       client_id: CLIENT_ID,
          scope: [
            FILES_OAUTH_SCOPE,
            METADATA_OAUTH_SCOPE
          ],
          immediate: true
        }, handleAuthorization);
}

export function createPermissions (fileId: string, emailAddress: string ) : void {
    let permissionRequest = {
      'type' : 'user',
      'role' : 'writer',
      'emailAddress': emailAddress
    }
    gapi.client.drive.permissions.create( {
      'fileId': fileId,
      'emailMessage' : 'fileId',
      'sendNotificationEmail' : true,
      'resource': permissionRequest
    }).then( (response : any) => {
    });
}

export function createRealtimeDocument() : Promise<gapi.drive.realtime.Document> {

  return new Promise( (resolve, reject) => {
    gapi.client.drive.files.create({
      'resource': {
        mimeType: RT_MIMETYPE,
        name: 'jupyterlab_realtime_file'
        }
    }).then( (response : any) : any => {
      let fileId : string = response.result.id;
      gapi.drive.realtime.load(fileId,
        (doc : gapi.drive.realtime.Document ) : any => {
          resolve( doc );
      });
    });
  });
}

export function loadRealtimeDocument( fileId : string) : Promise<gapi.drive.realtime.Document> {
  return new Promise( (resolve, reject) => {
    gapi.drive.realtime.load( fileId, (doc : gapi.drive.realtime.Document ):any => {
      resolve(doc);
    });
  });
}
