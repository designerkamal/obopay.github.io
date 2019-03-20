/*------------------------------------------------------------------------------
   About      : Encryption-decryption provider for https request
   
   Created on : Wed Mar 13 2019
   Author     : Vishal Sinha
   
   Copyright (c) 2019 Obopay Mobile Technologies Pvt Ltd. All rights reserved.
------------------------------------------------------------------------------*/

import { Logger }             from './logger'
import * as crypto            from 'crypto'
import * as zlib              from 'zlib'
import * as stream            from 'stream'

const SYM_ALGO                = 'aes-256-cbc',
      IV                      = Buffer.from([ 0x01, 0x00, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00,
                                              0x01, 0x00, 0x09, 0x00, 0x07, 0x00, 0x00, 0x00 ]),
      MIN_SIZE_TO_COMPRESS    = 1000,
      AES_KEY_SIZE            = 32,
      BASE64                  = 'base64',
      SIXTEEN                 = 16,
      CLASS_NAME              = 'HttpsEncProvider'

const HttpConstants = {
  gzip     : 'gzip',
  deflate  : 'deflate',
  identity : 'identity'
}      

export class HttpsEncProvider {

  private reqAesKey  : Buffer
  private respAesKey : Buffer

  public constructor(private logger : Logger, private privateKey : string) {

  }

  public encodeRequestKey(publicKey : string) : string {
    this.logger.logDebug(CLASS_NAME, 'encodeRequestKey')
    if(!this.reqAesKey) this.reqAesKey = this.getNewAesKey()

    const encKeyBuf = this.encryptUsingPublicKey(publicKey, this.reqAesKey),
          encKey    = encKeyBuf.toString(BASE64)

    return encKey
  }

  public encodeRequestTs(ts : number) : string {
    this.logger.logDebug(CLASS_NAME, 'encodeRequestTs', ts)
    const encReqTs = this.encryptRequestTs(ts)

    return encReqTs
  }

  public encodeBody(data : any) : {
                                    streams        : Array<stream.Writable>,
                                    dataStr        : string,
                                    bodyEncoding   : string,
                                    contentLength ?: number
                                  } {

    this.logger.logDebug(CLASS_NAME, 'encodeBody', data)
    return this.encryptBody(data)
  }

  public decodeBody(streams : Array<stream.Readable>, encoding : string) : Array<stream.Readable> {
    this.logger.logDebug(CLASS_NAME, 'decodeBody', encoding)
    return this.decryptBody(streams, encoding)
  }

  public decodeResponseKey(publicKey : string, encKey : string) : Buffer {
    this.logger.logDebug(CLASS_NAME, 'decodeResponseKey', encKey)
    const encKeyBuf = Buffer.from(encKey, BASE64),
          decKey    = this.decryptUsingPublicKey(publicKey, encKeyBuf)
    
    this.respAesKey = this.decryptUsingReqAesKey(decKey)
    return this.respAesKey
  }

/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   PRIVATE METHODS
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

  private encryptRequestTs(tsMicro : number) : string {
    const encReqTs = this.encryptUsingPrivateKey(Buffer.from(tsMicro.toString()))

    return encReqTs.toString(BASE64)
  }

  private encryptBody(json : any) : {
                                      streams        : Array<stream.Writable>,
                                      dataStr        : string,
                                      bodyEncoding   : string,
                                      contentLength ?: number
                                    } {

    const jsonStr = JSON.stringify(json),
          streams = [] as Array<stream.Writable>

    let bodyEncoding  : string             = HttpConstants.identity,
        contentLength : number | undefined

    if(jsonStr.length > MIN_SIZE_TO_COMPRESS) {
      bodyEncoding = HttpConstants.deflate
      streams.push(zlib.createDeflate())
    } else {
      contentLength = this.getFinalContentLength(jsonStr.length)
    }

    if(!this.reqAesKey)  this.reqAesKey  = this.getNewAesKey()
    streams.push(this.getCipher(this.reqAesKey) as any)

    return {streams, dataStr : jsonStr, bodyEncoding, contentLength}
  }

  private decryptBody(streams : Array<stream.Readable>, encoding : string) : Array<stream.Readable> {
    
    streams.push(this.getDecipher(this.respAesKey) as any)

    switch(encoding) {
      case HttpConstants.deflate :
        streams.push(zlib.createInflate())
        break

      case HttpConstants.gzip :
        streams.push(zlib.createGunzip())
        break

      case HttpConstants.identity :
        break

      default :
        this.logger.logError(CLASS_NAME, 'Unknown compression factor.', encoding)
        throw new Error('Unknown compression factor.')
    }

    return streams
  }

  private getNewAesKey() : Buffer {
    const key = crypto.randomBytes(AES_KEY_SIZE)
    this.logger.logDebug(CLASS_NAME, 'Generating new aes key.', key.toString(BASE64))

    return key
  }

  private getCipher(key : Buffer) {
    this.logger.logDebug(CLASS_NAME, 'Generating new cipher.', key.toString(BASE64))
    const cipher = crypto.createCipheriv(SYM_ALGO, key, IV)

    return cipher
  }

  private getDecipher(key : Buffer) {
    this.logger.logDebug(CLASS_NAME, 'Generating new decipher.', key.toString(BASE64))
    const decipher = crypto.createDecipheriv(SYM_ALGO, key, IV)

    return decipher
  }

  private decryptUsingReqAesKey(encData : Buffer) : Buffer {
    this.logger.logDebug(CLASS_NAME, 'decryptUsingReqAesKey', encData.toString(BASE64))
    const decipher = this.getDecipher(this.reqAesKey),
          buff1    = decipher.update(encData),
          buff2    = decipher.final()

    return buff2.length ? Buffer.concat([buff1, buff2]) : buff1
  }

  private getFinalContentLength(contentLength : number) : number {
    const rem         = contentLength % SIXTEEN,
          finalLength = contentLength - rem + SIXTEEN

    this.logger.logDebug(CLASS_NAME, 'getFinalContentLength', contentLength, finalLength)
    return finalLength
  }

  private encryptUsingPublicKey(publicKey : string, data : Buffer) : Buffer {
    this.logger.logDebug(CLASS_NAME, 'encryptUsingPublicKey', data.toString(BASE64))
    const encData = crypto.publicEncrypt(publicKey, data)

    return encData
  }

  private decryptUsingPublicKey(publicKey : string, encData : Buffer) : Buffer {
    this.logger.logDebug(CLASS_NAME, 'decryptUsingPublicKey', encData.toString(BASE64))
    const data = crypto.publicDecrypt(publicKey, encData)

    return data
  }

  private encryptUsingPrivateKey(data : Buffer) : Buffer {
    this.logger.logDebug(CLASS_NAME, 'encryptUsingPrivateKey', data.toString(BASE64))
    const encData = crypto.privateEncrypt(this.privateKey, data)

    return encData
  }
}