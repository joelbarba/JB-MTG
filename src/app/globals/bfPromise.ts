/**
 * This reproduces the native ES6 Promise object, extending its capabilities:
 * - Cancel option    --> It is possible to cancel a pending promise
 * - Exposed status   --> The status is readable at any time, to be checked out of the promise (IBfDeferStatus)
 * - Complete         --> It exposes a complete (like finally) subscription, available on the then() function too.
 * - Resolve / Reject --> It exposes the resolve() / reject() methods externally,
 *                        so they can be called out of the constructor
 *
 * It does not use a native promise internally, but reproduces the stack callback chain so it has full controll
 * on the ongoing subscriptions. It can also be chained.
 *
 * // Example (with constructor):
 *    let bfPromise = new BfPromise((resolve, reject, cancel) => {
 *      setTimeout(() => { cancel(1);  }, 2000);
 *      setTimeout(() => { resolve(2); }, 3000);
 *      setTimeout(() => { reject(3);  }, 4000);
 *    });
 *
 * // Example (no constructor):
 *    let bfPromise = new BfPromise();
 *    setTimeout(() => { bfPromise.cancel();  }, 2000);
 *    setTimeout(() => { bfPromise.resolve(); }, 3000);
 *    setTimeout(() => { bfPromise.reject();  }, 4000);
 *
 *    bfPromise.then(
 *      () => { console.log('Promise resolved'); },
 *      () => { console.log('Promise rejected'); },
 *      () => { console.log('Promise completed'); }
 *    );
 *
 *    bfPromise.then(() => { console.log('Promise resolved'); });
 *    bfPromise.fail(() => { console.log('Promise rejected'); });
 *    bfPromise.complete(() => { console.log('Promise completed'); });
 *
 */
export enum IBfDeferStatus { pending = 0, resolved = 1, rejected = 2, cancelled = 3 }
interface IChainStack { fn: Function, promise?: BfPromise }

export class BfPromise {
  public status: IBfDeferStatus;
  public result: any;  // Catch the result param

  private thenStack     : Array<IChainStack>;
  private catchStack    : Array<IChainStack>;
  private completeStack : Array<IChainStack>;

  constructor(iniFn?:Function) {
    this.status = IBfDeferStatus.pending;
    this.resetStacks();

    // Extend the constructor out of the wrapper, if need be
    if (!!iniFn && typeof iniFn === 'function') {
      iniFn(this.resolve, this.reject, this.cancel);
    }
  }

  // Function wrapper to resolve. It runs all then + complete stack
  public resolve = (res?) => {
    if (this.status === IBfDeferStatus.pending) {
      this.status = IBfDeferStatus.resolved;
      this.result = res;

      this.thenStack.forEach(stackItem => {
        const result = stackItem.fn(res);
        stackItem.promise.resolve(result);  // Propagate chained promise
      });
      this.completeStack.forEach(stackItem => {
        const result = stackItem.fn(res);
        stackItem.promise.resolve(result);
      });
      this.resetStacks();
    }
  };

  // Function wrapper to reject. It runs all catch + complete stack
  public reject = (res?) => {
    if (this.status === IBfDeferStatus.pending) {
      this.status = IBfDeferStatus.rejected;
      this.result = res;

      this.catchStack.forEach(stackItem => {
        const result = stackItem.fn(res);
        stackItem.promise.reject(result);
      });
      this.completeStack.forEach(stackItem => {
        const result = stackItem.fn(res);
        stackItem.promise.reject(result);
      });
      this.resetStacks();
    }
  };

  // Cancel the pending stacks
  public cancel = () => {
    if (this.status === IBfDeferStatus.pending) {
      this.status = IBfDeferStatus.cancelled;
      this.resetStacks();
    }
  };


  // Subscribe to the promise resolve + reject + complete. It returns another promise to chain
  public then = (thenFn: Function, catchFn?: Function, completeFn?: Function): BfPromise => {
    const chainPromise = new BfPromise();
    if (!!thenFn && typeof thenFn === 'function') {
      this.thenStack.push({ fn: thenFn, promise: chainPromise });

      if (!!catchFn && typeof catchFn === 'function') {
        this.catchStack.push({fn: catchFn, promise: chainPromise });
      }

      if (!!completeFn && typeof completeFn === 'function') {
        this.completeStack.push({ fn: completeFn, promise: chainPromise });
      }

      this.immediateCall(); // If not pending, run it immediately
    }
    return chainPromise;
  };

  // Subscribe to the promise reject
  public fail = (catchFn: Function): BfPromise => {
    const chainPromise = new BfPromise();
    if (!!catchFn && typeof catchFn === 'function') {
      this.catchStack.push({ fn: catchFn, promise: chainPromise });
      this.immediateCall(); // If not pending, run it immediately
    }
    return chainPromise;
  };

  // Subscribe to the promise complete
  public complete = (completeFn: Function): BfPromise => {
    const chainPromise = new BfPromise();
    if (!!completeFn && typeof completeFn === 'function') {
      this.completeStack.push({ fn: completeFn, promise: chainPromise });
      this.immediateCall(); // If not pending, run it immediately
    }
    return chainPromise;
  };



  // Empty stacks
  private resetStacks = () => {
    this.thenStack = [];
    this.catchStack = [];
    this.completeStack = [];
  };

  // Check if the promise is completed and run the stacks
  public immediateCall = () => {
    if (this.status === IBfDeferStatus.resolved) {  // If resolved, run it immediately
      setTimeout(() => { this.resolve(this.result); });
    }
    if (this.status === IBfDeferStatus.rejected) {  // If rejected, run it immediately
      setTimeout(() => { this.reject(this.result); });
    }
  };


  // ---------- Static helpers --------------

  // Convert a native promise to a BfPromise
  static from = (nativePromise: Promise<any>) => {
    return new BfPromise((resolve, reject) => {
      nativePromise.then(resolve, reject);
    });
  };

  // Returns a promise that resolves when all the given promises are resolved, or one is rejected (same as Promise.all)
  static all = (stack: Array<BfPromise>) => {
    // TODO: Implement it
  };

  // Returns a promise that resolves when all the given promises are completed
  static allCompleted = (stack: Array<BfPromise>) => {
    // TODO: Implement it
  };

  // Returns a promise that resolves when all are resolved, or one is rejected (same as Promise.all)
  static allResolved = (stack: Array<BfPromise>) => {
    // TODO: Implement it
  };


}










// ---------------- Those here below are just tests ---------------------- //
/*

export class RxPromise {
  public status: IBfDeferStatus;
  public result: any;  // Catch the result param
  public promise$;  // Observable that mocks the promise

  public resolve = (res) => {};
  public reject = (res) => {};
  public cancel = () => {};

  constructor(iniFn?: Function) {
    this.status = IBfDeferStatus.pending;

    this.promise$ = Rx.Observable.create(obs => {
      console.log('Generate observable');
      this.resolve = (res) => { obs.next(res); };
      this.reject  = (res) => { obs.error(res); };
      this.cancel  = () => {
        console.log('Cancel promise');
        this.subStack.forEach(sub => { sub.unsubscribe(); });
        this.subStack = [];
        this.status = IBfDeferStatus.cancelled;
        obs.complete();
      };
    }).pipe(RxOp.take(1));

    // Control Subscription.
    this.subStack.push(this.promise$.subscribe(
      (val) => { console.log('Resolve', val); this.status = IBfDeferStatus.resolved; },
      (err) => { console.log('Reject',  err); this.status = IBfDeferStatus.rejected; },
      ()    => { console.log('Complete'); },
    ));

    // Extend the constructor out of the wrapper, if need be
    if (!!iniFn && typeof iniFn === 'function') {
      iniFn(this.resolve, this.reject, this.cancel);
    }
  }

  public subStack = [];
  public then = (thenFn: Function, catchFn?: Function, completeFn?: Function) => {
    this.subStack.push(this.promise$.subscribe(
      (val) => { console.log('then - Resolve', val); },
      (err) => { console.log('then - Reject', err); },
      ()    => { console.log('then - Complete'); }
    ));
  };

  public fail = (catchFn: Function) => {
    this.subStack.push(this.promise$.subscribe(
      () => {}, (err) => { catchFn(err) }
    ));
  };


}




// Extended ES6 Promise (cancellable, exposed status, manual resolve/reject, completed)
// Inspired on: https://github.com/alkemics/CancelablePromise/blob/master/CancelablePromise.js
export class SuperPromise {
  public status: IBfDeferStatus;
  public promise: Promise<any>;
  public resolve;   // Function to manually resolve the internal promise
  public reject;    // Function to manually reject the internal promise

  constructor(public iniFunc?) {
    console.log('BfDefer constructor');

    this.promise = new Promise((resolve, reject) => {
      this.status = IBfDeferStatus.pending;
      this.resolve = () => { if (this.status === IBfDeferStatus.pending) { resolve(); } };
      this.reject  = () => { if (this.status === IBfDeferStatus.pending) { reject(); } };

      if (!!this.iniFunc && typeof this.iniFunc === 'function') {
        this.iniFunc(this.resolve, this.reject);
      }
    });

    // Change the exposed status when resolved/rejected, and handle complete
    this.promise.then(() => {
      if (this.status === IBfDeferStatus.pending) {
        this.status = IBfDeferStatus.resolved;
        this.onComplete();
      }
    }).catch(() => {
      if (this.status === IBfDeferStatus.pending) {
        this.status = IBfDeferStatus.rejected;
        this.onComplete();
      }
    });

  }


  // To cancel the ongoing promise
  public cancel = () => {
    if (this.status === IBfDeferStatus.pending) {
      console.log('Promise cancelled');
      this.status = IBfDeferStatus.cancelled;
    }
  };

  // Every then() generates a new bfPromise that will be resolve/reject only if the main promise is not cancelled
  public then = (thenFn, catchFn?) => {
    const bfPromise = new SuperPromise((cResolve, cReject) => {
      this.promise.then((res) => {
        if (this.status === IBfDeferStatus.cancelled) {
          bfPromise.cancel(); // Cancel child promise too

        } else {
          if (!!thenFn && typeof thenFn === 'function') {
            cResolve(thenFn(res));  // Resolve through the given callback function
            // TODO: If thenFn is rejected we should call cReject
          } else {
            cResolve(res);  // Just resolve
          }
        }

      }, (err) => {
        if (this.status === IBfDeferStatus.cancelled) {
          bfPromise.cancel(); // Cancel child promise too

        } else {
          if (!!catchFn && typeof catchFn === 'function') {
            cReject(catchFn(err));  // Reject through the given callback function
          } else {
            cReject(err);  // Just reject
          }
        }
      });
    });
    return bfPromise;
  };



  // Trigger a complete function whenever resolve or reject
  public onComplete = () => {};
  public complete = (fn) => {
    if (!!fn && typeof fn === 'function') {
      this.onComplete = fn;
    }
  };

}

*/