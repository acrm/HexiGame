type EventHandler<TArgs> = (args: TArgs) => void;

export class EventSourceBase<TEvents extends object> {
  private readonly eventHandlers: {
    [K in keyof TEvents]: Array<EventHandler<TEvents[K]>>;
  };

  public constructor(eventNames: Array<keyof TEvents>) {
    this.eventHandlers = {} as {
      [K in keyof TEvents]: Array<EventHandler<TEvents[K]>>;
    };

    for (const eventName of eventNames) {
      this.eventHandlers[eventName] = [];
    }
  }

  public addListener<K extends keyof TEvents>(eventName: K, handler: EventHandler<TEvents[K]>): void {
    const handlers = this.eventHandlers[eventName];
    if (!handlers) {
      throw new Error('Unknown event');
    }
    handlers.push(handler);
  }

  public removeListener<K extends keyof TEvents>(eventName: K, handler: EventHandler<TEvents[K]>): void {
    const handlers = this.eventHandlers[eventName];
    if (!handlers) {
      throw new Error('Unknown event');
    }

    const removeIndex = handlers.findIndex((registeredHandler) => registeredHandler === handler);
    if (removeIndex === -1) {
      throw new Error('Handler is not registered');
    }
    handlers.splice(removeIndex, 1);
  }

  protected notify<K extends keyof TEvents>(eventName: K, args: TEvents[K]): void {
    const handlers = this.eventHandlers[eventName];
    if (!handlers) {
      throw new Error('Unknown event');
    }

    for (const handler of handlers) {
      handler(args);
    }
  }
}
