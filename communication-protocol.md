# Obopay Secure Communication Protocol V2

As Obopay products involve payments, it is imperative that protocol safeguards our servers, users and customers data. It is designed with following principals / constraints:

- The protocol only supports https to avoid sniffing.
- The request only support post to allow for message body encryption. 
- The originator and receptor both need to be identified and authorized.
- As needed, the protocol will allow for compression to allow transmission to low-bandwidth app/web client users.

## Business setup
 
- Each business must get registered with Obopay. Obopay issues them a client identifier.
- Business should generate a RSA key pair. Should protect the private key and share the public key with Obopay.
- IP based restrictions are placed by configuring valid IP addresses of the client-nodes of businesses. These are checked additionally before applying the protocol validation itself. Clients should register their IP Addresses with Obopay for this purpose.
- In case, there is a requirement for callback, the callback url of businesses are registered with Obopay. In this case, Obopay supplies, it's IP Addresses list. Business should accept response from Obopay only from these IP Addresses.

## Key encryption technologies and usage

- **Symmetric**: 256 bits (32 bytes) AES/CBC/PKCS5Padding with fixed IV 0x0100 0300 0100 0000 0100 0900 0700 0000. It is typically used to encrypt message bodies.
- **Asymmetric**: For public-encrypt / private-decrypt: RSA_PKCS1_OAEP_PADDING. For private-encrypt / public-decrypt: RSA_PKCS1_PADDING. 
- **Public key encryption**: Both ends of the communication share their public key with the other party. Encryption uses RSA/OAEP/PKCS1Padding with 2048 bits (256 bytes) RSA. It is typically used to protect 'Symmetric keys' and other sensitive information. Web/app clients don't have their own key pair as they operate from public devices.
- **base64**: Wherever we need data in plain text for example http header, binary text is encoded in base64. However, the message bodies are sent in binary form to avoid data size overheads. 
- **timestamp**: Protocol uses timestamp in form of microseconds elapsed since epoch. The timestamp also doubles up as unique identifier for a node/request where-ever needed. 

## Terms

|Field|Header&nbsp;field&nbsp;name|Description|
|-|-|-|
|Client Identifier| x-obopay-cid| Unique identifier issued by Obopay to every business|
|Version number| x-obopay-version| Version number: fixed value v2|
|Request timestamp| x-obopay-ts| A request can have max difference of (+/-)15 minutes, essentially taking care time offset of server |
|Symmetric key| x-obopay-key| An AES key that is used to encrypt the message body |
|Request Content type| x-obopay-type| mime-type of the body is indicated using this field as the regular http header for content type is set to 'application/octet-stream'|

## Https based server-server protocol: Request

The client communication node is initialized with private key of self and public key of target server.

### Url
A typical request on client node is made with server hostname / port, api name and request json data. The url is formed using following format:

    url = https://host[:port]/apiName

### Http headers
This request is sent along with the following header fields:

    x-obopay-cid      : plain text
    x-obopay-version  : plain text with fixed value `v2`
    x-obopay-ts       : base64(EncryptWithClientPrivateKey(currentMicroSec))
    x-obopay-key      : base64(EncryptWithServerPublicKey(randomAesKey))
    x-obopay-type     : normally application/json   
                        // when missing assumed to be json
    x-obopay-encoding : gzip / deflate / identity   
                        // when missing assumed to be identity

The body can be sent either with chunked transfer-encoding or with content length. Server should support both of the methods. Chunked encoding is preferred as it is conducive to streams. Based on these rules following regular http headers are expected:

    transfer-encoding : chunked  
                        // or content-length to be given
    content-type      : application/octet-stream 

### Body
It is mandatory The request body 'json data' is stringified and encrypted with a random AES key (created as per the rules specified above). It is mandatory to send body as encrypted binary body using the symmetric key. The decision whether to use deflate / gzip should ideally depend on whether we will have sizable gain when we compress the message body. Ideally it is done when stringified json is of size above 1000 bytes. If compression is used, it is specified under 'x-obopay-encoding'

    MessageBody = EncryptWithSymmetricKey( 
                  OptionallyCompress(stringifiedJson))

## Https based server-server protocol: Response

Normal json response from the server follows the following structure:

    {
      error   : null OR error-code / error-message
                // Messages are for debugging, must not be displayed to user
      data    : json object with response data 
                // empty object body or absence indicates no data
    }

In case of protocol level error, a successful json response is given to hide protocol level failures. The real error code is hidden in the data

    {
      error   : 'success'
      data    : integer protocol level error code
    }

The server decrypts the headers based on the protocol specification. In case of any exception in protocol, the server responds back with plain text json as specified above. Following headers are included in the response:

    - x-obopay-cid      : as in the request
    - x-obopay-version  : as in the request
    - x-obopay-key      : base64(EncryptWithServerPrivateKey(
                          EncryptWithClientAesKey(randomAesKey)))
    - x-obopay-type     : normally application/json
                          // when missing assumed to be json
    - x-obopay-encoding : gzip / deflate / identity
                          // when missing assumed to be identity

    - transfer-encoding : chunked  
                          // or content-length to be given
    - content-type      : application/octet-stream 

As in the request body, it is mandatory to send body as encrypted binary body using the symmetric key. Compression, when used, is specified under 'x-obopay-encoding'

    MessageBody = EncryptWithSymmetricKey( 
                  OptionallyCompress(stringifiedJson))

## Protocol implementation verification

Obopay clients, should submit their protocol implementation code for review and certification by Obopay. This is done to reduce the protocol level error and conformance to Obopay Protocol. Once the implementation is approved, the clients should refrain from making changes to protocol code. In case of major changes, the protocol code should be resubmitted for verification.


