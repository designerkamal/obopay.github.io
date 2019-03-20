/*------------------------------------------------------------------------------
   About      : Obopay Client
   
   Created on : Wed Mar 13 2019
   Author     : Vishal Sinha
   
   Copyright (c) 2019 Obopay Mobile Technologies Pvt Ltd. All rights reserved.
------------------------------------------------------------------------------*/

import {
         LogLevel,
         Logger
       }                      from './logger'
import { UPromise }           from './u-promise'
import { UStream }            from './u-stream'
import { HttpsEncProvider }   from './https-enc-provider'
import * as https             from 'https'
import * as http              from 'http'
import * as stream            from 'stream'
import * as fs                from 'fs'
import * as path              from 'path'

const POST             = 'POST',
      SLASH_SEP        = '/',
      CLASS_NAME       = 'ObopayClient',
      CURRENT_PROTOCOL = 'v2',
      LOG_DIRECTORY    = 'obopay-logs'

const HttpConstants = {
  httpProto        : 'http:',
  httpsProto       : 'https:',
  contentType      : 'content-type',
  contentLength    : 'content-length',
  clientId         : 'x-obopay-cid',
  versionNumber    : 'x-obopay-version',
  requestTs        : 'x-obopay-ts',
  symmKey          : 'x-obopay-key',
  requestType      : 'x-obopay-type',
  bodyEncoding     : 'x-obopay-encoding',
  transferEncoding : 'transfer-encoding',
  stream           : 'application/octet-stream',
  identity         : 'identity',
  chunked          : 'chunked'
}

const ErrorCodes = {
  PROTOCOL_FAILURE          : 'PROTOCOL_FAILURE',
  OBOPAY_SERVER_UNREACHABLE : 'OBOPAY_SERVER_UNREACHABLE'
}

export type LoggerConfig = {
  logLevel     : LogLevel
  writeStream ?: stream.Writable
}

export type ObopayConfig = {
  clientId         : string
  clientPrivateKey : string
  
  serverPublicKey  : string
  serverHost       : string
  serverPort      ?: number
}

export type ResultStruct = {
  error  : null | string
  data   : any
}

export namespace ObopayClient {
  let clientId         : string,
      clientPrivateKey : string,
      serverPublicKey  : string,
      serverHost       : string,
      serverPort       : number,
      logger           : Logger,
      logLevel         : LogLevel,
      selfLogStream    : boolean,
      currentLogDate   : string

  export function init(config : ObopayConfig, loggerConfig ?: LoggerConfig) {
    if(clientId) {
      if(logger) logger.logError('Calling ObopayClient init twice.')
      throw new Error('Calling ObopayClient init twice.')
    }

    clientId         = config.clientId
    clientPrivateKey = config.clientPrivateKey
    serverPublicKey  = config.serverPublicKey
    serverHost       = config.serverHost
    serverPort       = config.serverPort || 443

    initLogger(loggerConfig)

    delete config.clientPrivateKey
    logger.logDebug(CLASS_NAME, 'init', config)
  }

  export function initLogger(loggerConfig ?: LoggerConfig) {
    if(!fs.existsSync(LOG_DIRECTORY)) fs.mkdirSync(LOG_DIRECTORY)

    const logDate    = currentDate(),
          logFile    = path.join(process.cwd(), LOG_DIRECTORY, `${logDate}.log`),
          logStream  = loggerConfig && loggerConfig.writeStream ? loggerConfig.writeStream
                                                                : fs.createWriteStream(logFile)

    logLevel      = loggerConfig && loggerConfig.logLevel ? loggerConfig.logLevel : 'DEBUG',
    selfLogStream = !(loggerConfig && loggerConfig.writeStream)
    logger        = new Logger(logLevel, logStream)

    if(selfLogStream) currentLogDate = logDate

    logger.logDebug(CLASS_NAME, 'initLogger', logLevel)
  }

  export function obopayApi(apiName    : string,
                            params     : any,
                            unsecured ?: boolean) : Promise<ResultStruct> {

    if(!logger) throw new Error('logger not initialized.')

    if(!clientId || !clientPrivateKey || !serverPublicKey || !serverHost || !serverPort) {
      logger.logError(CLASS_NAME, 'ObopayClient not initialized with proper params.',
                      {clientId, serverPublicKey, serverHost, serverPort, log : !!logger})
      throw new Error('ObopayClient not initialized with proper params.')
    }

    if(selfLogStream && currentLogDate && currentLogDate != currentDate()) {
      logger.logDebug(CLASS_NAME, 'closing logger')
      logger.close()

      initLogger({logLevel})
    }

    logger.logDebug(CLASS_NAME, 'obopayApi', apiName, params)
    
    const headers : any = {}

    headers[HttpConstants.clientId]      = clientId
    headers[HttpConstants.versionNumber] = CURRENT_PROTOCOL
    headers[HttpConstants.contentType]   = HttpConstants.stream

    const encProvider = new HttpsEncProvider(logger, clientPrivateKey)

    headers[HttpConstants.symmKey]   = encProvider.encodeRequestKey(serverPublicKey)
    headers[HttpConstants.requestTs] = encProvider.encodeRequestTs(Date.now() * 1000)     // Current ts in micro seconds

    const encBodyObj = encProvider.encodeBody(params)

    headers[HttpConstants.bodyEncoding] = encBodyObj.bodyEncoding
    encBodyObj.contentLength ? headers[HttpConstants.contentLength]    = encBodyObj.contentLength
                             : headers[HttpConstants.transferEncoding] = HttpConstants.chunked

    const options : https.RequestOptions = {
      method   : POST,
      protocol : unsecured ? HttpConstants.httpProto : HttpConstants.httpsProto,
      host     : serverHost,
      port     : serverPort,
      path     : SLASH_SEP + apiName,
      headers  : headers
    }

    logger.logDebug(CLASS_NAME, 'request', options)

    const resp = request(options, encProvider, encBodyObj.streams, encBodyObj.dataStr, unsecured)
    return resp
  }

  export function closeResources() {
    if(logger) {
      logger.logDebug(CLASS_NAME, 'closeResources')
      logger.close()
    }

    clientId = undefined as any
  }

  async function request(options       : https.RequestOptions,
                         encProvider   : HttpsEncProvider,
                         writeStreams  : Array<stream.Writable>,
                         dataStr       : string,
                         unsecured    ?: boolean) : Promise<ResultStruct> {

    logger.logDebug(CLASS_NAME, `${unsecured ? 'http' : 'https'} request to server.`, options)
                      
    const req          = unsecured ? http.request(options) : https.request(options),
          writePromise = new UPromise(),
          readPromise  = new UPromise()

    writeStreams.push(req)

    req.on('response', (resp : http.IncomingMessage) => {

      logger.logDebug(CLASS_NAME,
                      `${unsecured ? 'http' : 'https'} response from server, status: ${resp.statusCode}.`, 
                      resp.headers)

      if(!resp.headers[HttpConstants.symmKey]) {
        const err = new Error(`${HttpConstants.symmKey} missing in response headers.`)
        logger.logError(CLASS_NAME, err)

        writePromise.reject(err)
        readPromise.reject(err)
        // throw err
      }

      if(!resp.headers[HttpConstants.bodyEncoding])
        resp.headers[HttpConstants.bodyEncoding] = HttpConstants.identity

      encProvider.decodeResponseKey(serverPublicKey, resp.headers[HttpConstants.symmKey] as string)

      const readStreams = encProvider.decodeBody([resp],
                                                 resp.headers[HttpConstants.bodyEncoding] as string)

      const readUstream = new UStream.ReadStreams(readStreams, readPromise)
      readUstream.read()
    })

    req.on('error', (err : Error) => {
      logger.logError(CLASS_NAME, err)

      writePromise.reject(err)
      readPromise.reject(err)
    })

    const writeUstream = new UStream.WriteStreams(writeStreams, writePromise)

    writeUstream.write(dataStr)

    try {
      const [ , output] : Array<any> = await Promise.all([writePromise.promise,
                                                          readPromise.promise])

      const result = JSON.parse(output.toString()) as ResultStruct
      logger.logDebug(CLASS_NAME, 'result', result)

      if(result.error && result.error === 'success') {
        const data = typeof result.data === 'number'
                     ? `Refer to obopay security error codes for error code ${result.data}.`
                     : result.data

        const errResult = {error : ErrorCodes.PROTOCOL_FAILURE, data} 

        logger.logError(CLASS_NAME, 'error-result', errResult)
        throw errResult
      }

      return result

    } catch(err) {
      if(err.error === ErrorCodes.PROTOCOL_FAILURE) return err

      logger.logError(CLASS_NAME, err)

      if(err.code === 'ECONNREFUSED') {
        return {
                 error : ErrorCodes.OBOPAY_SERVER_UNREACHABLE,
                 data : 'Obopay server is unreachable. Please try after some time.'
               }
      }

      return {error : err.code, data : err}
    }
  }

  function currentDate() : string {
    const date = new Date()

    
    function doubleDigit(val: number) {
      return ('0' + val.toString()).slice(-2)
    }

    return `${doubleDigit(date.getDate())}_${doubleDigit(date.getMonth())}_${doubleDigit(date.getFullYear())}`
  }

}