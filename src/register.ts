import Emitter from './emitter';

const MESSAGE_RESULT = 0;
const MESSAGE_EVENT = 1;

const RESULT_ERROR = 0;
const RESULT_SUCCESS = 1;

const DEFAULT_HANDLER = 'main';

const isPromise = (o: any) => typeof o === 'object' && typeof o.then === 'function' && typeof o.catch === 'function';

function RegisterPromise(fn: Function) {
  const handlers = { [DEFAULT_HANDLER]: fn };
  const sendPostMessage = self.postMessage.bind(self);

  const server = new (class WorkerRegister extends Emitter {
    emit(eventName: string, ...args: any[]) {
      if (args.length === 1 && args[0] instanceof TransferableResponse) {
        sendPostMessage({ eventName, args }, args[0]._transferable);
      } else {
        sendPostMessage({ eventName, args });
      }
      return this;
    }

    localEmit(eventName: string, ...args: any[]) {
      super.emit(eventName, ...args);
    }
  })();

  const run = (...args: any[]) => {
    const [messageId, payload, handlerName] = args;

    const onSuccess = (result: any) => {
      if (result && result instanceof TransferableResponse) {
        sendResult(messageId, RESULT_SUCCESS, result._payload, result._transferable);
      } else {
        sendResult(messageId, RESULT_SUCCESS, result);
      }
    };

    const onError = (e: any) => {
      sendResult(messageId, RESULT_ERROR, {
        message: e.message,
        stack: e.stack,
      });
    };

    try {
      const result = runFn(messageId, payload, handlerName);
      if (isPromise(result)) {
        result.then(onSuccess).catch(onError);
      } else {
        onSuccess(result);
      }
    } catch (e: any) {
      onError(e);
    }
  };

  const runFn = (messageId: number, payload: any, handlerName: any) => {
    // @ts-ignore
    const handler: any = handlers[handlerName ?? DEFAULT_HANDLER];

    if (!handler) {
      throw new Error(`No handler found for this request.`);
    }

    return handler(payload, sendEvent.bind(undefined, messageId));
  };

  const sendResult = (messageId: number, success: any, payload: any, transferable?: Transferable[]) => {
    sendPostMessage([MESSAGE_RESULT, messageId, success, payload], transferable ?? []);
  };

  const sendEvent = (messageId: number, eventName: string, payload: any) => {
    if (!eventName) {
      throw new Error('eventName is required.');
    }

    if (typeof eventName !== 'string') {
      throw new Error('eventName must be a string.');
    }

    sendPostMessage([MESSAGE_EVENT, messageId, eventName, payload]);
  };

  self.addEventListener('message', ({ data }: any | any[]) => {
    if (Array.isArray(data)) {
      run(...data);
    } else if (data && data.eventName) {
      server.localEmit(data.eventName, ...data.args);
    }
  });

  return server;
}

class TransferableResponse {
  _payload: any;
  _transferable: Transferable[];

  constructor(payload: any, transferable: Transferable[]) {
    this._payload = payload;
    this._transferable = transferable;
  }
}
