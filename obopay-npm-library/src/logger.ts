/*------------------------------------------------------------------------------
   About      : Obopay Client Logger
   
   Created on : Fri Mar 15 2019
   Author     : Vishal Sinha
   
   Copyright (c) 2019 Obopay Mobile Technologies Pvt Ltd. All rights reserved.
------------------------------------------------------------------------------*/

import * as stream from 'stream'

export type LogLevel = 'NONE' | 'ERROR' | 'DEBUG' | 'CONSOLE'

export enum LogVal {
  NONE = 0, ERROR, DEBUG, CONSOLE
}

export class Logger {

  private logVal : number = 0

  constructor(logLevel : LogLevel, private wStream : stream.Writable) {
    this.logVal = LogVal[logLevel]
  }

  close() {
    this.wStream.end()
  }

  logError(moduleName : string, ...args : Array<any>) {
    if(!this.isErrorAllowed()) return

    this.log('!!!', moduleName, args)
  }

  logDebug(moduleName : string, ...args : Array<any>) {
    if(!this.isDebugAllowed()) return

    this.log('-->', moduleName, args)
  }

  isErrorAllowed() : boolean {
    return this.logVal >= LogVal.ERROR
  }

  isDebugAllowed() : boolean {
    return this.logVal >= LogVal.DEBUG
  }

  isConsoleAllowed() : boolean {
    return this.logVal >= LogVal.CONSOLE
  }

  private log(logPrefix : string, moduleName : string, args : Array<any>) {
    const date    = new Date(),
          dateStr = this.getDateStr(date)

    let logStr = `${logPrefix} ${dateStr} ${moduleName}:`

    for(const arg of args) {
      let add = arg
      if(typeof arg === 'object') add = JSON.stringify(arg)

      logStr = logStr + ' ' + add
    }

    if(this.isConsoleAllowed()) console.log(logStr)
    logStr = logStr + '\n'

    this.wStream.write(Buffer.from(logStr))
  }

  private getDateStr(date ?: Date) {
    if(!date) date = new Date()

    function doubleDigit(val: number) {
      return ('0' + val.toString()).slice(-2)
    }

    return `${doubleDigit(date.getDate())}/${doubleDigit(date.getMonth())}`
           + ` ${doubleDigit(date.getHours())}:${doubleDigit(date.getMinutes())}:${doubleDigit(date.getSeconds())}`
           + `.${('00' + date.getMilliseconds().toString()).slice(-3)}`
  }
}