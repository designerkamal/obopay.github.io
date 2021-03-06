# Payments Integration for Businesses

Obopay offers payments service in compliance with RBI PPI (Prepaid Payment Instrument) rules and regulations. End users wishing to make payments via Obopay, must complete the KYC process before availing payment services. 

Businesses can integrate directly with Obopay payments system via an SDK on following channels:

- iOS
- Android
- Web 

For each channel, Payments SDK provides native technology paradigm to enable simpler integration for well-known common payments flow. In case, you need to integrate new flows that are not offered by the SDK, please contact sdk@obopay.com with your request. 

This document currently covers details of Android SDK. Web & iOS details are WIP.

## End user payments flow

1) When a user wishes to make a purchase on business app / website, business invokes the request via payments SDK. 

2) On Web-channel, Obopay Payments SDK displays a QR Code that can be directly scanned by the user through Obopay app. On App-channels, the payment request is securely passed to Obopay (without any user intervention)

3) User verifies the payment details (amount, beneficiary) and keys in hir m-pin on the Obopay app to approve of payment.

4) On successful authentication and balance check, Obopay executes the transfer of funds from user's account to the business account and invokes a pre-configured callback url of the business server with result. In case of any failure, same url is called back with failed status.

## Business registration with Obopay

There is one time business registration process. Following information is needed from the business

    callbackUrl : Url that is called back on payment requests.
    publicKey   : A public RSA key that is used to encrypt response from Obopay. 
                  This key can be a self-signed RSA key-pair, where private key 
                  is adequately protected by business.

As part of registration, business is issued a `business registration id`. This id is used by Obopay to identify a business in it's system.

## Integration Steps on Android

The Android SDK seamlessly manages the payment flow so that you can focus more on providing service and less on payment intricacies.

Please follow the steps below to integrate with Obopay Payments SDK.

### Setup repository

In your project, open **your_project > Gradle Scripts > build.gradle (Project)** and make sure to add the following  

    buildscript {
      repositories {
        jcenter{}
      }
    }

### Add ObopayPayments SDK as dependency

In your project, open `your_project > Gradle Scripts > build.gradle(Module:app)` and add the following implementation statement to `dependencies` section pointing to the latest revision of the SDK.

    implementation 'com.obopay.android:obopaypayments:[1,2)'

### Initialize SDK

On the application OnCreate() or on your launcher activity, initialize the SDK as following:

    OboPayments.initialize(businessRegistrationId)


### Create a payment request

When user wishes to make a payment, call your server to allocate a `PaymentContextId`. [Payment Context Id](#payment-context-id) is described in detail in the later section of this document. With the PaymentContextId, create a payment request as following:

    OboPayments.requestPayment(callingActivity, PaymentContextId, amount, message);

      callingActivity   : Activity that launches the payment request
      PaymentContextId  : Unique context from step above
      amount            : Amount for which transaction has been initiated 
      message           : Optional message / reason (shown on My Obopay App)

### SDK response to a payment request

Response is received in the calling activity's onActivityResult callback like:

      onActivityResult(int requestCode, int resultCode, Intent data)

      requestCode : set to OboPayments.PAYMENT_REQUEST
      resultCode  : is zero when request is successfully submitted to the Obopay server, 
                    otherwise it is set to one of the client error codes listed below.
      data        : Receives fields with request and response details

  Client error codes:

      OboPayments.UNSUPPORTED_SDK(1)   - You need to upgrade bundled SDK
      OboPayments.AMOUNT_INVALID(2)    - Invalid amount (negative or above max)
      OboPayments.MESSAGE_INVALID(3)   - Invalid message (invalid length of message)
      OboPayments.USER_CANCELED(4)     - User pressed cancel
      OboPayments.NETWORK_UNHEALTHY(6) - Unhealthy network
      Obopayments.DUPLICATE_ORDER(7)   - Order is initiated with duplicate payment context ID
      OboPayments.INVALID_STATE(5)     - Multiple reasons like: 
                                        - Obopay SDK missing
                                        - Not enough balance
                                        - Device Not authenticated
      OboPayments.NO_OPERATION(-5)     - Do nothing                                  

You ideally do nothing when result code is non-zeros. The error codes are provided just for information. If the result code is set to zero, you should call your server to check request status.

### Check request status with your server

On getting the onActivityResult callback with result code zero, the app should request it's server for the payment status. Obopay server sends the result of the payment to business server on registered [callback](#callback-url) URL. This is done to ensure that payment response is not lost in case of connectivity failure between client and server. 

## Payment Context Id

`PaymentContextId` represents unique context of purchase across all users. Obopay allows only single payment to a business under a PaymentContextId. PaymentContextId helps solve duplicate payment problem from a user, while providing a context to business systems to query status of a payment request.

PaymentContextId is generated by Business server. Here are few examples on how to generate PaymentContextId:

### For Business system that allow checkout of shopping card

  These flows should ideally use the 'order number' as PaymentContextId. This will help ensure single payment from user against an order. Orders that are abandoned by the users for payment can be retried with same order number.

### Payment against an invoice (bill)

similar to 'shopping cart checkout' should use invoice number / bill number as PaymentContextId

### Direct purchase of an item 

If the item cannot be repurchased, itemId can be used as the PaymentContextId. If item can be repurchased after few days, PaymentContextId can be set to concatenation of `dateOfPurchase` and `itemId`

### Ad hoc payments

This option is not recommended and should be used in rare situation. For ad hoc payment, PaymentContextId can be uniquely generated by concatenation of `request timestamp` and `userId`. This solution is strictly undesirable, you should endeavour to avoid this.

## Callback url

Business provides a callback url at the time of business setup with Obopay. This url must be a https url. Obopay posts success / failure response of the request at this url. Url is called with following http headers:

    POST [BusinessUrl] HTTP/1.1
    Host              : [BusinessHost]
    Content-Type      : application/json
    Content-Length    : length of JSON string

The post body is a JSON in following format: 

    {
      paymentContextId  : Id with which request was made
      amount            : Amount that customer paid for service
      responseCode      : Response code encrypted with public key of business
      oboTransactionId  : Internal transaction id in Obopay system
    }

Business must protect this url to be called from specific set of IP Addresses of Obopay. 




