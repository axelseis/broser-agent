import { AgentStatus, type StoreData } from "./types";

// Reactive store with change notifications
type StoreListener = (key: string, oldValue: any, newValue: any) => void;

class ReactiveStore {
  private listeners: StoreListener[] = [];
  private store: StoreData;

  constructor(initialData: StoreData) {
    this.store = { ...initialData };
  }

  createProxy() {
    return new Proxy(this.store, {
      set: (target, prop, value) => {
        const oldValue = target[prop as string];
        target[prop as string] = value;
        
        // Notify listeners of the change
        this.notifyListeners(prop as string, oldValue, value);
        
        return true;
      },
      get: (target, prop) => {
        // If the property is a method of this class, return it bound to this context
        if (prop === 'subscribe' || prop === 'getState' || prop === 'update') {
          return (this as any)[prop].bind(this);
        }
        // Otherwise return the store data
        return target[prop as string];
      }
    });
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(key: string, oldValue: any, newValue: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(key, oldValue, newValue);
      } catch (error) {
        console.error('Error in store listener:', error);
      }
    });
  }

  // Method to get current store state
  getState(): Record<string, any> {
    return { ...this.store };
  }

  // Method to update multiple properties at once
  update(updates: Partial<Record<string, any>>): void {
    Object.entries(updates).forEach(([key, value]) => {
      (this.store as any)[key] = value;
    });
  }
}

const reactiveStore = new ReactiveStore({
  agentStatus: AgentStatus.OFFLINE,
  configFormOpened: false
});

export const Store = reactiveStore.createProxy() as StoreData & {
  subscribe: (listener: StoreListener) => () => void;
  getState: () => StoreData;
  update: (updates: Partial<StoreData>) => void;
};
