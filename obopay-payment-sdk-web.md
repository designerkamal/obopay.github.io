# Payments Integration for Merchants

Obopay offers payments service in compliance with RBI PPI (Prepaid Payment Instrument) rules and regulations. End users wishing to make payments via Obopay, must complete the KYC process before availing payment services.
Obopay payments web app can be integrated seemlessly with a merchant portal using the web SDK.

## End user activation flow
 
1) When an unregistered user wishes to register for an Obopay Card on the merchant portal, the merchant invokes the request via payments SDK. For activating this user, merchant passes user registration details required by Obopay.

2) While registration, if a user is found already activated in Obopay system then the registration does not go through with the requested Obopay Kit number and the user is shown an appropriate message on the invoked Obopay portal.

3) Merchants doing user KYC themselves need to provide KYC documents for the user being registered. For this the merchant will expose an API for getting KYC documents.

4) Merchant also exposes a Callback url for KYC status intimation by Obopay. Using this callback, Obopay submits list of all documents that are pending submission for the user or documents that got rejected during KYC verification.

5) For submitting any updates to user details post user activation from the backend, merchant invokes an Obopay API to update user details of activated user.

6) Post activation, merchant shows UI for several card related actions. Each action is exposed as an SDK API. The SDK in turn shows a page for each action.

## Merchant registration with Obopay

There is one time merchant registration process. Following information is needed from the merchant

    KYC documents API        : API to get KYC documents of the user.
    KYC failure Callback Url : Obopay posts KYC failure response at this url.
    publicKey                : A public RSA key that is used to encrypt              
                               response from Obopay. This key can be a 
                               self-signed RSA key-pair, where private key is 
                               adequately protected by merchant.

As part of registration, merchant is issued a merchant registration id. This id is used by Obopay to identify a merchant in it’s system.

## Integration Steps

### Installtion

Install obopay payment-sdk-web using the following command in your node project.

    npm install git+https://github.com/obopay/payment-sdk-web.git

### Initailize SDK

On your web page, initialize SDK as following:

    Obopayments.initialize(merchantRegistrationId, displayDiv)

    displayDiv : HTML div tag where Obopay UI will be shown. 
                 This area must be reserved for Obopay UI
    

### Activate user

For activating user for an Obopay card, display appropriate UI on your web page and on click of the 'Activate' button request activation as following:

    Obopayments.activateUser(userDetails)

    Fields of userDetails are as follows : 
    1. User mobile number (Country ISD prefix + 10 digit mobile number)
    2. First Name 
    3. Last Name
    4. Date of Birth (dd/mm/yyyy)
    5. Gender
    6. Email Id
    7. Minimum KYC document type - PAN Card, Passport, Driving License or 
                                   Voters ID Card
    8. Minimum KYC document id - Corresponding Id for type selected
    9. KYC Documents (Adult/Minor)
    10. Obopay Kit number
    11. Card last four digits
    12. Card expiry date
    13. Card PIN

  Note : Any of these details, if missing, will be filled by the user during activation via Obopay UI. For verification, an OTP will be sent to user's mobile number. On successful verification, user will be activated.

For submitting any updates to user details post user activation from the backend, merchant invokes an Obopay API. The API is defined as following:

    API Name : updateUserDetails(userDetails)

    Fields of userDetails are defined above

### User KYC

Merchants doing user KYC themselves need to provide KYC documents for the user being registered. For this merchant will expose an API for getting KYC documents in the form of category - type - document urls. An authentication key will be provided by the merchant to access the documents on their server. This key goes as part of url pointing to the document. Obopay then verifies these documents on the backend. 

Merchant should also expose a callback url for KYC status intimation by Obopay. Status can be one of these - approved, suspended or pending. For suspended and pending, Obopay will also respond with list of category - kyc document type - reason. The merchant can then re submit the suspended or pending KYC details from the backend using Obopay KYC resubmission API. 
Following are the API/Calback for KYC -

 #### 1) Get the KYC documents of the user (provided by merchant) 
 Obopay will call this API to get KYC documents of the user.
    
    Api Name : getKycDocuments(mobileNo)
    mobileNo : User's mobile number 
               (Country ISD prefix + 10 digit mobile number)

    Response is received like:
    userType : 'ADULT' or 'MINOR' (less than 18 years of age)
    kycDocs  : KycDocument[]

    In above a KycDocument is like:
    category : string
    type     : string
    docUrl   : string

Below is the list of required KYC documents to be submitted for an Adult/Minor user. For each category atleast one document type is needed -

  For minor :
  
- Address proof (PROOF_OF_ADDRESS) 
   
   - Driving License of self (DRIVER_LICENSE) : Front and Back
   
   - Driving License of parent (PARENTS_DRIVER_LICENSE) : Front and Back
   
   - Passport of self (PASSPORT) : Front and Back
   
   - Passport of Parent (PARENTS_PASSPORT) : Front and Back
   
   - Ration Card (RATION_CARD) : Front and Back
   
   - Voter's Id of Parent (PARENTS_VOTER) : Front and Back

- Self Identification (SELF_IDENTIFICATION)
    - Selfie (SELF_PHOTO) 

- Identity proof (PROOF_OF_IDENTITY)
    - School/College Student Id (STUDENT_ID) : Front and Back

- Age proof (AGE_PROOF) 
    - Birth Certificste (BIRTH_CERTIFICATE) : Front
    - SSLC Certificate (SSLC_CERTIFICATE) : Front

For adult :

- Address proof (PROOF_OF_ADDRESS)  
    - Driving License of self (DRIVER_LICENSE) : Front and Back
    - Passport of self (PASSPORT) : Front and Back
    - Ration Card (RATION_CARD) : Front and Back
    - Voter's Id (VOTER) : Front and Back

- Self Identification (SELF_IDENTIFICATION)
    - Selfie (SELF_PHOTO) 

- Identity proof (PROOF_OF_IDENTITY)
    - PAN Card (PAN_CARD) : Front

#### 2) KYC failure Callback url (provided by merchant)
Merchant provides a callback url at the time of business setup with Obopay. This url must be a https url. Obopay posts KYC failure response at this url. Url is called with following http headers:

    POST [MerchantUrl] HTTP/1.1
    Host              : [MerchantHost]
    Content-Type      : application/json
    Content-Length    : length of JSON string

The post body is a JSON in following format:
 
    {
      mobileNo  : User's mobile number 
                  (Country ISD prefix + 10 digit mobile number)
      kycStatus : KycStatus[]
    }
    
    In above a KycStatus is like:
    status   : 'PENDING' | 'SUSPENDED'
    document : KycDocument[] (described in getKycDocuments API)

Merchant must protect this url to be called from specific set of IP Addresses of Obopay.

It can happen that KYC is suspended or pending for multiple document category and hence an array of KycDocument should be expected for a given status. If KYC for a user is approved then intimation is not done to merchant.

#### 3) Re submit KYC documents (provided by Obopay)
Merchant will call this API to re-submit any pending or suspended documents fromt the backend to Obopay.

    Api Name  : resubmitKycDocuments(mobileNo, kycInfo)
    mobileNo  : User's mobile number 
                (Country ISD prefix + 10 digit mobile number)
    kycInfo   : KycInfo

    Response is received like:
    success : boolean

    In above KycInfo is like:
    userType : 'ADULT' or 'MINOR' (less than 18 years of age)
    kycDocs  : KycDocument[] (described in getKycDocuments API)

### Transaction History and Balance Check

For viewing transaction history and wallet balance of user, display appropriate UI on your web page and on click of the 'View' button request history as following:

    Obopayments.viewBalanceAndWalletHistory()

The SDK shows wallet history and balance inside the div it is registered with.