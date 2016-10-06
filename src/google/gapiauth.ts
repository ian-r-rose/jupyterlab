// Copyright (c) Jupyter Development Team.
//
// Distributed under the terms of the Modified BSD License.

declare let gapi : any;

declare let rtclient : any;

export let gapi_loaded : boolean = true;
export let realtimeDoc : gapi.drive.realtime.Document = null;
export let realtimeModel : any  = null;
export let collaborativeString : any = null;

const CLIENT_ID = '625147942732-t30t8vnn43fl5mvg1qde5pl84603dr6s.apps.googleusercontent.com';

const FILES_OAUTH_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const METADATA_OAUTH_SCOPE = 'https://www.googleapis.com/auth/drive.metadata';
const INSTALL_SCOPE = 'https://www.googleapis.com/auth/drive.install'

const RT_MIMETYPE = 'application/vnd.google-apps.drive-sdk';


export function setupRealtime () : void {

  let handleAuthorization = function (authResult : any) {
    if (authResult && !authResult.error) {
      createOrLoadRealtimeFile();
    } else {
      popupAuthorization();
    }
  }

  let popupAuthorization = function() {
    gapi.auth.authorize({
         client_id: CLIENT_ID,
            scope: [
              FILES_OAUTH_SCOPE,
              METADATA_OAUTH_SCOPE
            ],
            immediate: false
          }, handleAuthorization);
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

function createOrLoadRealtimeFile() : void {

  gapi.client.load('drive', 'v3').then( function() {
    let query : string = (window as any).location.search;
    if (query) {
      let fileId : string = query.slice(1);
      loadRealtimeFile(fileId);
    }
    else {
      createRealtimeFile();
    }
  });
}

function createRealtimeFile() : void {
  gapi.client.drive.files.create({
    'resource': {
      mimeType: RT_MIMETYPE,
      name: 'wakka'
      }
    }).then( (response : any) : any => {
        let fileId : string = JSON.parse(response.body).id;
        gapi.drive.realtime.load( fileId, (doc : any ):any => {
          realtimeDoc = doc;
          realtimeModel = doc.getModel();
          collaborativeString = realtimeModel.createString("I am a collaborative string");
          realtimeModel.getRoot().set("collabstring", collaborativeString);
          console.log("setup realtime document "+fileId);
        });
      });
}

function loadRealtimeFile( fileId : string) : void {
  console.log("Attempting to load realtime file " + fileId);
  gapi.drive.realtime.load( fileId, (doc : any ):any => {
    realtimeDoc = doc;
    realtimeModel = doc.getModel();
    collaborativeString = realtimeModel.getRoot().get("collabstring");
    console.log("load realtime document");
  });
}
