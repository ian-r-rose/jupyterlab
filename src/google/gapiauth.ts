// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

const CLIENT_ID = '625147942732-t30t8vnn43fl5mvg1qde5pl84603dr6s.apps.googleusercontent.com';
const FILES_OAUTH_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const METADATA_OAUTH_SCOPE = 'https://www.googleapis.com/auth/drive.readonly.metadata';

export function logger () : void {console.log("What is going on");}

export function authorize () : void {
  let clientId = CLIENT_ID;
  let _this = this;

  let handleAuthResult = function (token : any) : void {console.log(token)};

  console.log("Authorizing")
  gapi.auth.authorize({
    client_id: clientId,
    scope: [
      FILES_OAUTH_SCOPE,
      METADATA_OAUTH_SCOPE
    ],
    immediate: true
  }, handleAuthResult);
  console.log("Authorizing done")
}


