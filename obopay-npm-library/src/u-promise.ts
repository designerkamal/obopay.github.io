/*------------------------------------------------------------------------------
   About      : UPromise
   
   Created on : Wed Mar 13 2019
   Author     : Vishal Sinha
   
   Copyright (c) 2019 Obopay Mobile Technologies Pvt Ltd. All rights reserved.
------------------------------------------------------------------------------*/

export class UPromise<T> {

  static execFn(fn: Function, context: Object | null, ...params: any[]) : Promise<any> {
    const promiseFn = this.getFn(fn, context)
    return promiseFn(...params)
  }

  static delayedPromise<X>(ms: number, fulfillWith ?: X): Promise<X> {
    return new Promise((resolve : any, reject : any) => {
      setTimeout(() => resolve(fulfillWith), ms)
    })
  }

  private static getFn(fn: Function, context: Object | null): (...arParam: any[]) => Promise<any> {

    return function(...arParam: any[]): Promise<any> {
      
      return new Promise( function(resolve : any, reject : any) {
        
        function cb(...arCbParam: any[]) {
          
          const err = arCbParam.shift()
          if (err) return reject(err)
          // Resolved with multiple values; this would actually give first value in promise
          resolve.apply(null, arCbParam)
        }
        
        try {
          arParam.push(cb)
          fn.apply(context, arParam)
        } catch (e) {
          reject(e)
        }
      })
    }
  }

  private  fnResolve : null | ((result: any) => any) = null
  private  fnReject  : null | ((err: Error)  => any) = null
  readonly promise   : Promise<T>

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.fnResolve = resolve
      this.fnReject  = reject
    })
  }

  // Executes a function sync and return promise for chaining
  execute(cb: (promise: UPromise<T>) => void): UPromise<T> {
    cb(this)
    return this
  }

  resolve(result : T) {
    if (this.fnResolve) {
      this.fnResolve(result)
      this.cleanup()
    }
  }

  reject(err: Error) {
    if (this.fnReject) {
      this.fnReject(err)
      this.cleanup()
    }
  }

  private cleanup() {
    this.fnResolve = null
    this.fnReject  = null
  }
}