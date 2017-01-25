// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from 'phosphor/lib/core/token';

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  IObservableString
} from '../common/observablestring';

import {
  IObservableUndoableVector, ISerializable
} from '../notebook/common/undo';

/* tslint:disable */
/**
 * The realtime service token.
 */
export
const IRealtime = new Token<IRealtime>('jupyter.services.realtime');
/* tslint:enable */


/**
 * Interface for a Realtime service.
 */
export
interface IRealtime {

  /**
   * Share a realtime model.
   *
   * @param model: the model to be shared.
   *
   * @returns a promise that is resolved when the model
   *   has been successfully shared.
   */
  shareDocument(model: IRealtimeModel): Promise<void>;

  /**
   * Open a realtime model that has been shared.
   *
   * @param model: the model to be shared.
   *
   * @returns a promise that is resolved when the model
   *   has been successfully opened.
   */
  openSharedDocument(model: IRealtimeModel): Promise<void>;

  /**
   * The realtime services may require some setup before
   * it can be used (e.g., loading external APIs, authorization).
   * This promise is resolved when the services are ready to
   * be used.
   */
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
   *
   * @param handler: the realtime handler to which the model
   *   describes itself.
   *
   * @returns a promise that is resolved when the model is done
   * registering itself as collaborative.
   */
  registerCollaborative (handler: IRealtimeHandler): Promise<void>;
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
   * Create a string for the realtime model.
   *
   * @param initialValue: the optional initial value of the string.
   *
   * @returns a promise of a realtime string.
   */
  createString(initialValue?: string) : Promise<IObservableString>;

  /**
   * Create a vector for the realtime model.
   *
   * @param factory: a method that takes a `JSONObject` representing a
   *   serialized vector entry, and creates an object from that.
   *
   * @param initialValue: the optional initial value of the vector.
   *
   * @returns a promise of a realtime vector.
   */
  createVector<T extends ISynchronizable<T> >(factory: (value: JSONObject)=>T, initialValue?: IObservableUndoableVector<T>): Promise<IObservableUndoableVector<T>>;
}

/**
 * Interface for an object which is both able to be serialized,
 * as well as able to signal a request for synchronization
 * through an IRealtimeHandler. This request may be every time
 * the object changes, or it may be batched in some way.
 */
export
interface ISynchronizable<T> extends ISerializable {

  /**
   * A signal that is emitted when a synchronizable object
   * requests to be synchronized through the realtime handler.
   */
  synchronizeRequest: ISignal<T, void>;
}
