# Obopay Payments: Integration via WebSDK

Obopay payments WebSDK provides seamless integration to business web-portals to offer Obopay payment services to it's customers.

Obopay offers payments service in compliance with RBI PPI (Prepaid Payment Instrument) rules and regulations. End users wishing to use Obopay payments, must complete the KYC process before availing payment services.

## Overview of integration 

1) Obopay provides SDK via Javascript based library. This library should be included on every html page that wishes to integrate with Obopay.

2) SDK is initialized with `businessRegistrationId` (issued by Obopay), `userMobileNo` and an `authKey`. Auth key is acquired by business web-client from their own servers. When 'business server' receives a request for auth key, it should call Obopay via provided 'server side library' to acquire an `auth key` on behalf of their web-clients.

>>'Auth key' is issued with expiry (typically 30 minutes). When key has expired, business web-server should request a fresh key and SDK should be reinitialized with the new key.

>> Obopay 'server side library' is provided for Java & Node.js. Businesses needing to integrate in other languages are provided specification for integration. A separate document is provided for the same.

1) All the user interface displayed by SDK, is presented as pop-up on the callers webpage. The pop-up can have `branding color`, `name` and `logo` of business for visual integration.


## Business registration with Obopay

There is one time business registration process. Following information is needed from the business

    kycStatusUpdateUrl: Obopay posts KYC check response at this url.
    publicKey         : A public RSA key that is used to encrypt response from Obopay. 
                        This key can be a self-signed RSA key-pair, where private key is 
                        adequately protected by business. This key-pair is also used when
                        business server needs to contact Obopay servers.

As part of registration, business is issued a `businessRegistrationId`. This id is used by Obopay to identify a business in it’s system.


## Obopayments.initialize: API to initialize SDK

On your web page, initialize SDK as following:

    Obopayments.initialize(businessRegistrationId, userMobileNo, authKey, 
                           businessName, businessLogoUrl, businessColorHex, callback)

    businessRegistrationId : As provided to business
    userMobileNo           : Country ISD prefix + 10 digit mobile number 
                             (Example +919876512345)
    authKey                : Acquired via server from Obopay 
                             (Details in server Api documentation)

    businessName           : Branding name that appears on the popup
    businessLogoUrl        : Branding icon that appears on the popup. 
                             Dimensions should be of 75px 
                             width & 75px height
    businessColorHex       : Business branding color (Hex format)
    callback               : Listen to initialization reponse 

    Possible Error codes : 

    1) SDK_AUTH_EXPIRED     : Auth key that you are using has exceeded its 
                              30 minutes validity window.
    2) SDK_AUTH_INVALID     : Auth key that you are using is invalid.
    3) INVALID_INIT_PARAMS  : Initialization params are not valid.  
    4) USER_NOT_ACTIVATED   : User is not activated on the platform being used. Perform either registration or login.

    
If your web portal has multiple pages, you may acquire the authKey once and store it in 'localStorage' along with expiry timestamp. You should reacquire access token in the event of expiry. Also, if you have user re-login / logout, you should again refresh the token.

At any stage if user id / mobile number changes OR you get a new authKey, you must reinitialize the SDK.

## Obopayments.activateUser: API to activate a new user

For activating new user with Obopay payments and card, you should pass all the user information that you already have available with your portal. Obopay SDK, will show UI to ask for additional information that is missed.

    Obopayments.activateUser(userDetails, callback)

    userDetails Object {
      firstName     : User's first name
      lastName      : User's last name
      dob           : Date of birth in yyyy/mm/dd format
      gender        : 'M' | 'F'
      email         : User email id
      minKycDocType : Minimum KYC document - Valid values are in next section
      minKycDocId   : Id/Number of minKycDocType
      kycDocuments  : Array of kycDocument, explained below
    }

    kycDocument Object {
        kycType       : 'MAJOR' | 'MINOR'
        category      : Address proof, id proof etc. CODES described in next section 
        type          : Depending on category, CODES described in next section 
        urls          : Object of urls (front and back) based on type of document. 
                        In case url access is protected, please embed url with 
                        access-token / session id in the url itself. Url should point to resources 
                        that are images. Images should be less than 500 KB in size. 
                        Example : {
                                     front: "https://business.com/access-token/id_name_front.jpeg",
                                     back : "https://business.com/access-token/id_name_back.jpeg"
                                  } 
    }

    
    The success response will be like 

    {
      code : 'SUCCESS'
    }
    

___User KYC___

Businesses doing user KYC themselves need to provide KYC documents for the user being registered. 

___For minor (less than 18 years of age), one of each document type:___
  
1. Address proof (PROOF_OF_ADDRESS)

   - Aadhaar Card of self (AADHAAR_CARD) : Front and Back
   - Driving License of parent (PARENTS_DRIVER_LICENSE) : Front and Back
   - Passport of self (PASSPORT) : Front and Back
   - Passport of Parent (PARENTS_PASSPORT) : Front and Back
   - Ration Card (RATION_CARD) : Front and Back
   - Voter's Id of Parent (PARENTS_VOTER_ID) : Front and Back


1. Self Identification (SELF_IDENTIFICATION)

    - Selfie (SELF_PHOTO) 


3. Identity proof (PROOF_OF_IDENTITY)

    - School/College Student Id (STUDENT_ID) : Front and Back


4. Age proof (AGE_PROOF) 

    - Birth Certificste (BIRTH_CERTIFICATE) : Front
    - SSLC Certificate (SSLC_CERTIFICATE) : Front


___For adult, one of each document type:___

1. Address proof (PROOF_OF_ADDRESS)  

    - Aadhaar Card of self (AADHAAR_CARD) : Front and Back
    - Driving License of self (DRIVER_LICENSE) : Front and Back
    - Passport of self (PASSPORT) : Front and Back
    - Ration Card (RATION_CARD) : Front and Back
    - Voter's Id (VOTER_ID) : Front and Back

2. Self Identification (SELF_IDENTIFICATION)

    - Selfie (SELF_PHOTO) 


3. Identity proof (PROOF_OF_IDENTITY)

    - PAN Card (PAN_CARD) : Front
    
It is important that business system remembers the status of user KYC. Status should have following values: 'UPLOADED', 'SUSPENDED' or 'APPROVED'. This field is updated via kycStatusUpdateUrl (Described in section below). Business should nudge user to fix SUSPENDED KYC based on this field.

## Callback to kycStatusUpdateUrl

Obopay manually verifies these documents as part of user administration. 
Business exposes a callback url kycStatusUpdateUrl for KYC status intimation by Obopay. KYC Status can be one of these - `APPROVED`, `SUSPENDED`

The kycStatusUpdateUrl url must be a https url. Obopay posts KYC status response at this url. Url is called with following http headers:

    POST [kycStatusUpdateUrl] HTTP/1.1
    Host              : [BusinessHost]
    Content-Type      : application/json
    Content-Length    : length of JSON string

The post body is a JSON in following format:
 
    {
      mobileNo  : User's mobile number (Country ISD prefix + 10 digit mobile number)
                  This field is encrypted with business public key.
      status    : 'APPROVED' | 'SUSPENDED'
      details   : KycStatus[]
    }

    KycStatus Object has following fields:
      category  : category of document
      type      : type of document
      reason    : rejection reason
    

Business must protect this url to be called from specific set of IP Addresses of Obopay.

It can happen that KYC is suspended for multiple document category and hence an array of KycStatus should be expected for a given status.


## Obopayments.updateUserDetails: API to update KYC details

 The business should request user to resubmit the KYC details in case of suspension.

If a user fails KYC check, he should be given option to correct KYC details in business portal. Once, KYC details are reacquired, Obopay SDK should be called to update user details. This API is allowed to be called, only for the users who have KYC check in SUSPENDED status.

    updateUserDetails(userDetails, callback)

    userDetails : Same structure as in 'Obopayments.activateUser'


## Obopayments.getKycStatus: API to check KYC status

    Obopayments.getKycStatus(callback)

    The success response is like  

    {
      code : 'SUCCESS'
      data : kycData
    }

    kycData Object {
      kycStatus : 'UPLOADED' | 'APPROVED' | 'SUSPENDED'
            }


## Obopayments.getBalance: API to check wallet balance

    Obopayments.getBalance(callback)

    The success response is like

    {
      code : 'SUCCESS'
      data : balanceData
    }

    balanceData Object {
      primaryBalance : balance // number,
      foodBalance    : balance // number
    }


## Obopayments.viewTransactionHistory: API to View Transaction History

For viewing transaction history you should pass the wallet type whose transaction history you want to view. Obopay will check that the wallet requested by the user is linked with the card or not.

After passing the params on click of the 'View Transactions' button on your UI, request history as following 

    Obopayments.viewTransactionHistory(viewTransactionParams, callback)

    viewTransactionParams Object { 
      walletType : Type of wallet - 'ALL' | 'DEFAULT' | 'FUEL' etc.
    }

    Type 'ALL' will show you the transactions of all wallets. Any other wallet type will show you the transaction from that particular wallet.

    Possible Error codes :

    1) INVALID_WALLET_ID : Requested wallet type does not exist for the user.
    2) WALLET_NOT_LINKED : Requested wallet is not linked with user's Obopay card.


The SDK shows wallet history and balance in a popup.

## Obopayments.selectTransactionHistory: API to Select Transaction History 

For selecting multiple transactions on a UI pop up window you should pass the wallet type whose transaction history you want to select. The response of the API is a JSON array of transactions.

On click of 'Select Transactions' button on your UI, request as follows

    Obopayments.selectTransactionHistory(selectTransactionParams, callback) 

    selectTransactionParams Object { 
      walletType : Type of wallet - 'ALL' | 'DEFAULT' | 'FUEL' etc.
    }

    The success response is like
    {
      code : 'SUCCESS'
      data : transaction[] // array of transaction
    }

    transaction Object {
      walletType        : Type of wallet 'ALL' | 'DEFAULT' | 'FUEL' etc.
      transactionDetail : Optional transaction message
      transactionAmount : Trasaction amount
      merchantName      : Name of payee
      transactionStatus : Status of transaction - 'COMPLETED' | 'REVERSED' | 
                          'PENDING' | 'FAILED' | 'TIMEOUT'
      transactionTS     : Transaction initiation timestamp milliseconds 
      closingBalance    : Wallet balance post transaction completion
      txnRefNo          : Transaction reference id
      drCr              : Transaction type debit or Credit - 'DR' | 'CR'
      tax              ?: Optional Tax amount
      netAmount        ?: Optional net amount
      amountFee        ?: Optional Fee amount
    }

    Possible Error codes : 

    1) INVALID_WALLET_ID : Requested wallet type does not exist for the user.
    2) WALLET_NOT_LINKED : Requested wallet is not linked with Obopay card.


## Obopayments.sendMoney: API to Send Money

To send money to any other Obopay user you should pass the mobile number of the Obopay user to whom user wishes to send money along with the amount in a JSON Format. You can also pass an optional transaction message.

 On click of the 'Send Money' button on your UI request the following:

    Obopayments.sendMoney(sendMoneyParams, callback) 

    sendMoneyParams = {
        mobileNo : Country ISD prefix + 10 digit mobile number (Example +919876512345)
        amount   : Amount to send
        transMsg : Optional transaction message
    }

    The success response is like 
    {
      code : 'SUCCESS'
      data : transaction
    }
        
    transaction Object {
      walletType        : Type of wallet 'ALL' | 'DEFAULT' | 'FUEL' etc.
      transactionDetail : Optional transaction message
      transactionAmount : Trasaction amount
      merchantName      : Name of payee
      transactionStatus : Status of transaction - 'COMPLETED' | 'REVERSED' | 
                          'PENDING' | 'FAILED' | 'TIMEOUT'
      transactionTS     : Transaction initiation timestamp milliseconds 
      closingBalance    : Wallet balance post transaction completion
      txnRefNo          : Transaction reference id
      drCr              : Transaction type debit or Credit - 'DR' | 'CR'
      tax              ?: Optional Tax amount
      netAmount        ?: Optional net amount
      amountFee        ?: Optional Fee amount
      }

      Possible Error codes:

      1) INVALID_IND_MOBILE_NUMBER : Mobile number passed is an invalid Indian mobile number.


Based on the transactionStatus of transaction object you can check whether it is completed or not

## Obopayments.addMoney: API to Add Money 

To Add Money you should pass the amount user wants to add in his/her DEFAULT (primary) wallet through UPI, Card/Net Banking, etc mediums.

On click of the 'Add Money' button on your UI request the following:

    Obopayments.addMoney(addMoneyParams, callback) 

    addMoneyParams Object {
        amount   : Amount to be added
    }

    The success response is like 
    {
      code  : 'SUCCESS'
      data ?: transaction // comes when add money is done by Card/Net Banking
    }
      
    transaction Object {
      walletType        : Type of wallet - 'ALL' | 'DEFAULT' | 'FUEL' etc.
      transactionDetail : Optional transaction message
      transactionAmount : Trasaction amount
      merchantName      : Name of payee
      transactionStatus : Status of transaction - 'COMPLETED' | 'REVERSED' | 
                          'PENDING' | 'FAILED' | 'TIMEOUT'
      transactionTS     : Transaction initiation timestamp milliseconds 
      closingBalance    : Wallet balance post transaction completion
      txnRefNo          : Transaction reference id
      drCr              : Transaction type debit or Credit - 'DR' | 'CR'
      tax              ?: Optional Tax amount
      netAmount        ?: Optional net amount
      amountFee        ?: Optional Fee amount
    }

Based on the transactionStatus of transaction object you can check whether it is completed or not

## Obopayments.requestMoney: API to Request Money

To request money for user from another Obopay user you should pass the mobile number of the Obopay user from whom the user wishes to request money along with the request amount (greater than 0) in a JSON Format

On click of the 'Request Money' button on your UI request the following:

    Obopayments.requestMoney(requestMoneyParams, callback) 

    requestMoneyParams Object {
      mobileNo : Country ISD prefix + 10 digit mobile number (Example +919876512345)
      amount   : Request amount
    }

    The success response is like 
    {
      code : 'SUCCESS'
    }

    Possible Error codes :

    1) USER_CANCELLED_REQUEST : User cancels the request.
    2) DEBIT_LIMIT_EXCEEDED   : A user can make only 5 debit transactions in a day. 
                                The transaction fails with this error code if thelimit exceeds.
    3) TRANSACTION_TIMED_OUT  : User fails to enter the OTP before transaction expiry time.
    4) OTP_LIMIT_EXCEEDED     : User fails to enter the correct OTP within 3 attempts 
                                to complete the transaction.


## Obopayments.collectRequest: API to Collect Request

To collect payment from a user in your Obopay wallet you should pass a unique context of purchase (order Id) for the transaction along with the amount. You can also pass an optional transaction message.

On click of the 'Collect Payment' button on your UI request the following

    Obopayments.collectRequest(collectRequestParams, callback) 

    collectRequestParams Object {
      paymentContextId : Unique context of purchase
      amount           : Collection amount
      message          : Optional message
    }

    The success response is like

    {
      code : 'SUCCESS'
      data : paymentDetails
    }

    paymentDetails Object {
      merchantId        : Your business id
      paymentContextId  : Id with which request was made
      amount            : Amount that customer paid for service
      message           : Transaction message
      oboTransactionId  : Internal transaction id in Obopay system
    }

    Possible Error codes : 

    1) TRANSACTION_TIMED_OUT : Time to complete the transaction is elapsed

## Obopayments.getCardStatus : API to get Card Status

On click of the 'Get Card Status' button on your UI request the following:

    Obopayments.getCardStatus(callback) 

    The success response is like
    {
      code : 'SUCCESS'
      data : cardStatus
    }

    cardStatus object {
      status : 'ACTIVE' | 'LOCK' | 'BLOCK' | 'PENDACTVN' | 'INACTIVE' | 'NOT_LINKED'
    }

## Obopayments.lockCard: API to Lock Card

On click of the 'Lock Card' button on your UI request the following:

    Obopayments.lockCard(callback) 

    The success response is like 
    {
      code : 'SUCCESS'
    }

    Possible Error codes:

    1) CARD_ALREADY_LOCKED : Requesting to lock a card which is already in locked state


## Obopayments.unlockCard : API to unlock a locked card

On click of the 'Unlock Card' button on your UI request the following:

    Obopayments.unlockCard(callback) 
    
    The success response is like 
    {
      code : 'SUCCESS'
    }

    Possible Error codes:

    1) CARD_ALREADY_UNLOCKED : Requesting to unlock a card which is already in unlocked state
 

## Obopayments.blockCard : API to block Card 

On click of the 'Block Card' button on your UI request the following:

    Obopayments.blockCard(callback) 
    
    The success response is like 
    {
      code : 'SUCCESS'
    }

    Possible Error codes:

    1) CARD_ALREADY_BLOCKED : Requesting to block a card which is already in blocked state

## Common failure response type

    Other than SUCCESS you can also get response like this 

     {
       code  : 'FAILURE' | 'USER_DISMISSED'
       data ?: // Object based on code 
     }

    For 'FAILURE', structure of data is like
      {
        errorCode     : string // possible error codes are defined in every APIs and in common error codes
        errorMessage ?: string //optional
      }  

    For 'USER_DISMISSED' no data is provided // when user dismissed the Obopay app
    

## Common error codes

    1) INVALID_PARAMS         : Request params provided are not the valid in context of the API 
                                being called.
    2) OPERATION_IN_PROGRESS  : While the SDK is showing a pop up UI for an API action and 
                                you request for another API action.
    3) USER_NOT_ACTIVATED     : Calling any SDK API without activating / logging in the user.

    4) NetworkNotPresent      : If there is a network related issue

    5) USER_DISMISSED         : If user dismisses the Obopay app
