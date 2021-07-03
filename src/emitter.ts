class Emitter {
  _listeners: Map<string, Function[]> = new Map();

  emit(eventName: string, ...args: any[]) {
    if (!this._listeners.has(eventName)) {
      return this;
    }

    this._listeners.get(eventName)?.forEach(listener => listener(...args));
    return this;
  }

  once(eventName: string, handler: any) {
    const once = (...args: any[]) => {
      this.off(eventName, once);
      handler(...args);
    };
  }

  on(eventName: string, handler: any) {
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, [handler]);
    }

    return this;
  }

  off(eventName: string, handler: any) {
    if (handler) {
      this._listeners.set(eventName, this._listeners.get(eventName)?.filter(h => h !== handler) ?? []);
    } else {
      this._listeners.set(eventName, []);
    }
  }
}

export default Emitter;
