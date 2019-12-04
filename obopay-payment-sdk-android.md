# Obopay Payments: Integration via Android Sdk

Obopay payments AndroidSDK provides seamless integration to business android-apps to offer Obopay payment services to it's customers.

Obopay offers payments service in compliance with RBI PPI (Prepaid Payment Instrument) rules and regulations. End users wishing to use Obopay payments, must complete the KYC process before availing payment services.

## Overview of integration 

1) Obopay provides Android SDK hosted in maven. This SDK should be declared as a dependency in the Application's app module's build.gradle Please follow the steps below to integrate with Obopay Payments SDK.

### Setup repository

In your project, open **your_project > Gradle Scripts > build.gradle (Project)** and make sure to add the following  

    buildscript {
      repositories {
        jcenter{}
      }
    }

### Add ObopayPayments SDK as dependency

In your project, open `your_project > Gradle Scripts > build.gradle(Module:app)` and add the following implementation statement to `dependencies` section pointing to the latest revision of the SDK.

    implementation 'com.obopay.android:paymentscore:[1,2)'

2) SDK is initialized with `businessId` (issued by Obopay), `userMobileNo` and an `authKey`. Auth key is acquired by business app-clients from their own servers. When 'business server' receives a request for auth key, it should call Obopay via provided 'server side library' to acquire an `auth key` on behalf of their app-clients.

>>'Auth key' is issued with expiry (typically 1 day). When key has expired, business web-server should request a fresh key and SDK should be reinitialized with the new key.

>> Obopay 'server side library' is provided for Java & Node.js. Businesses needing to integrate in other languages are provided specification for integration. A separate document is provided for the same.

3) The SDK does not display any UI for APIs other than authentication (MPIN key-in). The authentication page can have `name` and `logo` of business for visual integration.

4) Post business registration with Obopay, business will be given a web portal wherein they can onboard their users using the bulk onboarding feature. The SDK returns error if the requesting user is not onboarded within Obopay system.

## Business registration with Obopay

There is one time business registration process. Following information is needed from the business

    kycStatusUpdateUrl: Obopay posts KYC check response at this url.
    publicKey         : A public RSA key that is used to encrypt response from Obopay. 
                        This key can be a self-signed RSA key-pair, where private key is 
                        adequately protected by business. This key-pair is also used when
                        business server needs to contact Obopay servers.

As part of registration, business is issued a `businessId`. This id is used by Obopay to identify a business in it’s system.

The following API documentation is written in Kotlin.


## Obopayments.initialize: API to initialize SDK

In your Application's OnCreate() or on your launcher activity, initialize SDK as following:

    Obopayments.initialize(context: Context, businessId: String, userMobileNo: String, 
                           authKey: String, businessName: String, businessLogoUrl: String)

    context                : Application context
    businessId             : As provided to business
    userMobileNo           : Country ISD prefix + 10 digit mobile number 
                             (Example +919876512345)
    authKey                : Acquired via server from Obopay 
                             (Details in server Api documentation)

    businessName           : Branding name that appears on the authentication page
    businessLogoUrl        : Branding icon that appears on the authentication page
                             Dimensions should be of 75px 
                             width & 75px height

    Possible Error codes : 

    1) SDK_AUTH_EXPIRED     : Auth key that you are using has exceeded its 
                              1 day validity window.
    2) SDK_AUTH_INVALID     : Auth key that you are using is invalid.
    3) INVALID_INIT_PARAMS  : Initialization params are not valid.  
    4) USER_NOT_ACTIVATED   : User is not activated on the platform being used. Perform activation.

    
It is advised that once you acquire the authKey, you should store it in 'Shared Preferences' along with expiry timestamp. You should reacquire an access token in the event of expiry. Also, if you have user re-login / logout, you should again refresh the token.

At any stage if user id / mobile number changes OR you get a new authKey, you must reinitialize the SDK.


## SDK response to an API request

Response for each API is received in the calling activity's onActivityResult callback like:

      onActivityResult(int requestCode, int resultCode, Intent data)

      requestCode : set to OboPayments.PAYMENT_REQUEST
      resultCode  : is zero when request is successfully submitted to the Obopay server, 
                    otherwise it is set to one of the client error codes listed below.
      data        : Receives fields with request and response details


## Obopayments.activateUser: API to activate a user

ActivateUser API must be called when SDK initilize returns error 'USER_NOT_ACTIVATED'. For activating new user with Obopay payments, it is mandatory that user is pre-registered by the business within Obopay system. For a new user, Obopay SDK will show UI asking user to set his MPIN and activate his card (if provisioned). For an exisiting user, accessing from a new device, Obopay SDK will show UI asking user to authenticate with MPIN.

    Obopayments.activateUser(activity: Activity)

    activity          : Activity from which API is requested
    

## Obopayments.getKycStatus: API to check KYC status

    Obopayments.getKycStatus(activity: Activity)
    
    activity          : Activity from which API is requested
    
    The success response is like  

    {
      code : 'SUCCESS'
      data : kycData
    }

    kycData Object {
      kycStatus : 'UPLOADED' | 'APPROVED' | 'SUSPENDED'
            }


## Obopayments.getBalance: API to check wallet balance

    Obopayments.getBalance(activity: Activity)

    activity          : Activity from which API is requested
    
    The success response is like

    {
      code : 'SUCCESS'
      data : balanceData
    }

    balanceData Object {
      primaryBalance : 1100,
      foodBalance    : 500
    }


## Obopayments.getTransactionHistory: API to get Transaction History

For getting transaction history you should pass the wallet type. Obopay will check if the wallet requested by the user is linked with the user account or not. If linked, then transaction history is returned for that wallet type.

    Obopayments.getTransactionHistory(activity: Activity, params: TransactionHistoryParams)

    activity          : Activity from which API is requested

    params Object { 
      walletType : Type of wallet - 'ALL' | 'DEFAULT' | 'FOOD' etc.
      dateRange : {
        from : Starting date for filtering in 'yyyy-mm-dd' format
        to   : End date for filtering in 'yyyy-mm-dd' format
      }
    }

    Type 'ALL' will return the transactions of all wallets. Any other wallet type will show you the transactions from that particular wallet.

    The success response is like
    {
      code : 'SUCCESS'
      data : Transaction[] // array of transactions
    }

    Transaction Object {
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
    2) WALLET_NOT_LINKED : Requested wallet is not linked with user's Obopay account.


## Obopayments.sendMoney: API to Send Money

To send money to any other Obopay user you should pass the mobile number of the Obopay user to whom money is to be sent along with the amount. You can also pass an optional transaction message. On API invocation, the SDK opens an authentication page where user is asked to enter his/her MPIN. Post authentication, API is requested.

    Obopayments.sendMoney(activity: Activity, params: SendMoneyParams) 

    activity          : Activity from which API is requested

    params Object {
        mobileNo : Country ISD prefix + 10 digit mobile number (Example +919876512345)
        amount   : Amount to send
        transMsg : Optional transaction message
    }

    The success response is like 
    {
      code : 'SUCCESS'
      data : Transaction
    }
        
    Transaction Object {
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

    Obopayments.addMoney(activity: Activity, params: AddMoneyParams) 

    activity          : Activity from which API is requested

    params Object {
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

To request money for user from another Obopay user you should pass the mobile number of the Obopay user from whom user is requesting money along with the request amount (greater than 0) in a JSON Format. On API invocation, the SDK opens an authentication page where user is asked to enter his/her MPIN. Post authentication, API is requested.

On click of the 'Request Money' button on your UI request the following:

    Obopayments.requestMoney(activity: Activity, params: RequestMoneyParams) 

    activity          : Activity from which API is requested

    params Object {
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


## Obopayments.getCardStatus : API to get Card Status

On click of the 'Get Card Status' button on your UI request the following:

    Obopayments.getCardStatus(activity: Activity) 

    activity          : Activity from which API is requested

    The success response is like
    {
      code : 'SUCCESS'
      data : cardStatus
    }

    cardStatus object {
      status : 'ACTIVE' | 'LOCK' | 'BLOCK' | 'PENDACTVN' | 'INACTIVE' | 'NOT_LINKED'
    }

## Obopayments.lockCard: API to Lock Card

On API invocation, the SDK opens an authentication page where user is asked to enter his/her MPIN. Post authentication, API is requested.

On click of the 'Lock Card' button on your UI request the following:

    Obopayments.lockCard(activity: Activity) 

    activity          : Activity from which API is requested

    The success response is like 
    {
      code : 'SUCCESS'
    }

    Possible Error codes:

    1) CARD_ALREADY_LOCKED : Requesting to lock a card which is already in locked state


## Obopayments.unlockCard : API to unlock a locked card

On click of the 'Unlock Card' button on your UI request the following:

    Obopayments.unlockCard(activity: Activity) 
    
    activity          : Activity from which API is requested

    The success response is like 
    {
      code : 'SUCCESS'
    }

    Possible Error codes:

    1) CARD_ALREADY_UNLOCKED : Requesting to unlock a card which is already in unlocked state
 

## Obopayments.blockCard : API to block Card 

On API invocation, the SDK opens an authentication page where user is asked to enter his/her MPIN. Post authentication, API is requested.

On click of the 'Block Card' button on your UI request the following:

    Obopayments.blockCard(activity: Activity) 
    
    activity          : Activity from which API is requested

    The success response is like 
    {
      code : 'SUCCESS'
    }

    Possible Error codes:

    1) CARD_ALREADY_BLOCKED : Requesting to block a card which is already in blocked state


## Appendix

### User KYC

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

### Callback to kycStatusUpdateUrl

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


### Common failure response type

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
    

### Common error codes

    1) INVALID_PARAMS         : Request params provided are not the valid in context of the API 
                                being called.
    2) OPERATION_IN_PROGRESS  : While the SDK is showing a pop up UI for an API action and 
                                you request for another API action.
    3) USER_NOT_ACTIVATED     : Calling any SDK API without activating / logging in the user.

    4) NETWORK_NOT_PRESENT    : If there is a network related issue

    5) USER_DISMISSED         : If user dismisses the Obopay app
