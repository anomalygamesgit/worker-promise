import { nanoid } from 'nanoid';

import Emitter from './emitter';

const MESSAGE_RESULT = 0;
const MESSAGE_EVENT = 1;

const RESULT_ERROR = 0;
const RESULT_SUCCESS = 1;

class WorkerPromise extends Emitter {
  _messageId = 1;
  _messages = new Map();

  _worker: Worker;
  _id = nanoid();

  constructor(worker: Worker) {
    super();

    this._worker = worker;
    this._worker.onmessage = this._onMessage.bind(this);
  }

  terminate() {
    this._worker.terminate();
  }

  isFree() {
    return this._messages.size === 0;
  }

  jobsLength() {
    return this._messages.size;
  }

  exec(operationName: string, data = undefined, transferable: Transferable[], onEvent: Function) {
    return new Promise((res, rej) => {
      const messageId = this._messageId++;
      this._messages.set(messageId, [res, rej, onEvent]);
      this._worker.postMessage([messageId, data, operationName], transferable ?? []);
    });
  }

  postMessage(data: any, transferable?: Transferable[], onEvent?: Function) {
    return new Promise((res, rej) => {
      const messageId = this._messageId++;
      this._messages.set(messageId, [res, rej, onEvent]);
      this._worker.postMessage([messageId, data], transferable ?? []);
    });
  }

  emit(eventName: string, ...args: any[]) {
    this._worker.postMessage({ args, eventName });
    return this;
  }

  _onMessage(e: any) {
    if (!Array.isArray(e.data) && e.data.eventName) {
      return super.emit(e.data.eventName, ...e.data.args);
    }

    const [type, ...args] = e.data;

    if (type === MESSAGE_EVENT) {
      this._onEvent(...args);
    } else if (type === MESSAGE_RESULT) {
      this._onResult(...args);
    } else {
      throw new Error(`Invalid message type: ${type}`);
    }
  }

  _onResult(...args: any[]) {
    const [messageId, success, payload] = args;
    const [res, rej] = this._messages.get(messageId);
    this._messages.delete(messageId);

    return success === RESULT_SUCCESS ? res(payload) : rej(payload);
  }

  _onEvent(...args: any[]) {
    const [messageId, eventName, data] = args;
    const [, , onEvent] = this._messages.get(messageId);

    if (onEvent) {
      onEvent(eventName, data);
    }
  }
}

export default WorkerPromise;
