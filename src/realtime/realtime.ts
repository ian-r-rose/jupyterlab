// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from 'phosphor/lib/core/token';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  IObservableString
} from '../common/observablestring';

/* tslint:disable */
/**
 * The realtime service token.
 */
export
const IRealtime = new Token<IRealtime>('jupyter.services.realtime');
/* tslint:enable */


//Interface for a Realtime service
export
interface IRealtime {

  shareDocument(model: IRealtimeModel): void;

  openSharedDocument(model: IRealtimeModel): void;

  ready: Promise<void>;
}

/**
 * Interface for an object which has the ability to be shared via
 * the realtime interface. These objects are required to implement
 * method `registerCollaborative( handler : IRealtimeHandler)`
 * which describes to the handler the members which are realtime-enabled.
 */
export
interface IRealtimeModel {
  /**
   * Register this object as collaborative.
   */
  registerCollaborative (handler: IRealtimeHandler): void;
}


/**
 * Interface for an object that coordinates realtime collaboration between
 * objects. These objects are expected to subscribe to the handler using
 * IRealtimeModel.registerCollaborative( handler : IRealtimeHandller)`.
 * There should be one realtime handler per realtime model.
 */
export
interface IRealtimeHandler {
  /**
   * Include a string in the realtime model.
   */
  createString(initialValue?: string) : Promise<IObservableString>;
}
