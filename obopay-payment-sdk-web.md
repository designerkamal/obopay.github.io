# Obopay Payments: Integration via WebSDK


>> THIS DOCUMENT IS A DRAFT VERSION AND IT WILL GET UPDATED PERIODICALLY TILL WE RELEASE THE SOFTWARE. WE WILL KEEP DEVELOPERS UPDATED ON CHANGES TO THIS DOCUMENT.

Obopay payments WebSDK provides seamless integration to business web-portals to offer Obopay payment services to it's customers.

Obopay offers payments service in compliance with RBI PPI (Prepaid Payment Instrument) rules and regulations. End users wishing to use Obopay payments, must complete the KYC process before availing payment services.

## Overview of integration 

1) Obopay provides SDK via Javascript based library. This library should be included on every html page that wishes to integrate with Obopay.

1) SDK is initialized with `businessRegistrationId` (issued by Obopay), `userMobileNo` and an `authKey`. Auth key is acquired by business web-client from their own servers. When 'business server' receives a request for auth key, it should call Obopay via provided 'server side library' to acquire an `auth key` on behalf of their web-clients.

>>'Auth key' is issued with expiry (typically 30 minutes), When key has expired, business web-server should request a fresh key and SDK should be reinitialized with the new key. 

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


## Obopayments.initialize: API to initializes SDK

On your web page, initialize SDK as following:

    Obopayments.initialize(businessRegistrationId, userMobileNo, authKey, businessName, 
                           businessLogoUrl, callback)

    businessRegistrationId : As provided to business
    userMobileNo           : Country ISD prefix + 10 digit mobile number (Example +919876512345)
    authKey                : Acquired via server from Obopay 
                             (Details in server Api documentation)

    businessName           : Branding name that appears on the popup
    businessLogoUrl        : Branding icon that appears on the popup. Dimensions should be of 150px 
                             width & 100px height
    callback               : Listen to initialization reponse 
    
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
        emailId       : User email id
        minKycDocType : Minimum KYC document - Valid values are in next section
        minKycDocId   : Id/Number of minKycDocType
        kycDocuments  : Array of kycDocument, explained below

    }, callback       : function cb(status) {

        `status` can be 'CANCELED' | 'SUCCESS' | 'ALREADY_REGISTERED' 
        // you should use this callback update your user interface with registration status
    }

    kycDocument Object has following fields:
    {
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
    

___User KYC___

Businesses doing user KYC themselves need to provide KYC documents for the user being registered. 

___For minor (less than 18 years of age), one of each document type:___
  
1. Address proof (PROOF_OF_ADDRESS)

   - Driving License of self (DRIVER_LICENSE) : Front and Back
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
Business exposes a callback url kycStatusUpdateUrl for KYC status intimation by Obopay. KYC Status can be one of these - `APPROVED`, `SUSPENDED`.

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

    userDetails : Same structure as in `Obopayments.registerUser`


## Obopayments.getKycStatus: API to check KYC status

    Obopayments.getKycStatus(callback) returns 'UPLOADED' | 'APPROVED' | 'SUSPENDED'


## Obopayments.getBalance: API to check wallet balance

    Obopayments.getBalance(callback) returns `user balance`


## Transaction History and Balance Check

For viewing transaction history and wallet balance of user, display appropriate UI on your web page and on click of the 'View' button request history as following:

    Obopayments.viewTransactions(callback)

The SDK shows wallet history and balance in a popup.