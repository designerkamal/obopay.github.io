

> Obopay Payments for Android - Quickstart

The Obopay Payments SDK for Android enables consumers to make payments to your app using the Obopay Wallets. The SDK seemlessly manages the payment flow so that you can focus more on providing service and less on payment intricacies.

Follow the steps below to add Obopay Payments SDK into your app.

### 1. Integrate the Obopay Payments SDK

To use the Obopay Payments SDK in your app, make it a dependency in Maven.

1. In your project, open **your_project > Gradle Scripts > build.gradle (Project)** and make sure to add the following

``` 
buildscript {
  repositories {
    jcenter{}
  }
}
```

2. In your project, open **your_project > Gradle Scripts > build.gradle(Module:app)** and add the following implementation statement to `dependencies` section depending the latest version of the SDK always.

```
implementation 'com.obopay.android:payments:[1,2)'
```

3. Build your project

### 2. Set SDK key 

Your server must make a call to Obopay server to get the Merchant key (development and release) with which SDK will be initialized.
This should not be stored on the client app.

In your Application class, initialise Obopay Payments SDK with the Merchant Id, Merchant key and Merchant name.
```
OboPaymentSdk.getInstance().setKey(key)

```

### 3. Add the Obopay Payment Button

In order to make payments using Obopay, the simplest way is to use the `OboPaymentButton` from the SDK. The `OboPaymentButton` is a UI element which must be added in the layout xml. 

```
<com.obopay.payment.widget.OboPaymentButton
    android:id="@+id/obopayment_button"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:layout_marginTop="25dp"
    android:layout_marginBottom="25dp" /> 
```

In your Activity's onCreate() or Fragment's onCreatView(), set the transaction details of the `OboPaymentButton`.

```
OboTransaction trans = new OboTransaction(transactionId, amount, message);

    transactionId : Unique ID generated for each transaction. 
                    Response will be generated on this Id.
    amount        : Amount for which transaction has been 
                    initiated 
                    (shown on My Obopay App). 
    message       : Optional message / reason for which 
                    transaction has been initiated 
                    (shown on My Obopay App).

```

With the transaction details, now create a `OboPaymentListener` to listen to Payment initiation status and register with `OboPaymentButton`


```

oboPaymentButton = (OboPaymentButton) findViewById(R.id.obopayment_button);
oboPaymentButton.requestPayment(trans, new OboPaymentListener() {
  
  @Override
  public void onPaymentComplete() {
    // Request payment status from server and display result on UI
  }

  @Override
  public void onPaymentError(PaymentError erroCode) {
    // Display Payment error on UI
  }

  @Override
  public void onPaymentFailed()() {
    // Display Payment failure on UI
  }

  @Override
  public void onPaymentDeclined() {
    // Display on UI payment declined by user
  }

});

```
Use the Obopay Payment Button where your UI is showing a single service to the user that can be purchased from the screen.

`OboPaymentListener` callbacks:

1. `onPaymentComplete()` : Transaction completed. Request your server for transaction status check. The SDK only tells the App that the request has completed.

2. `onInitiationResult(ReultCode code)` : Initiation result codes
  - NO_OP
  - UNSUPPORTED_SDK_VERSION
  - NETWORK_UNHEALTHY
  - REQUEST_TRANSACTION_ID_INVALID
  - REQUEST_AMOUNT_INVALID
  - REQUEST_MESSAGE_INVALID
  - REQUEST_DECLINED 
  - REQUEST_TIMED_OUT

3. `onPaymentFailed()` : Payment could not go through. 
 
### 4 Using a Payment Manager

Another way of requesting a payment is by using the `OboPaymentManager`.
In order to make payments using the manager - 

1. On click of your "Make Payment" button to the following

```
OboPaymentManager oboPayMgr = OboPaymentManager.getInstance()
oboPayMgr.requestPayment(trans, new OboPaymentListener() {
  
  @Override
  public void onPaymentComplete() {
    // Request payment status from server and display result on UI
  }

  @Override
  public void onPaymentError(PaymentError erroCode) {
    // Display Payment error on UI
  }

  @Override
  public void onPaymentFailed()() {
    // Display Payment failure on UI
  }

  @Override
  public void onPaymentDeclined() {
    // Display on UI payment declined by user
  }

});

Use the Obopay Payment Manager where the UI shows multiple services that the user can purchase separately from the same screen.
```

### 5. Initiating a Payment

When someone clicks on the button, the Payment process is initiated with the transaction details set in the `OboPaymentButton` in the following steps - 

1. Before initiating a payment request, the SDK verifies that the user is authenticated and registered on the **My Obopay** app to make a payment through hisObopay  wallet. If this step fails, onInitiationResult() returns  code NO_OP.

2. Once Step 1 is verified, the SDK directs the payment request to **My Obopay** app where user is shown the request details along with mPIN login.

3. If in between the transaction, on the `OboPaymentActivity`, the user presses back or on the **My Obopay** app the user declines the request, transaction is cancelled. onInitiationResult() result code REQUEST_DECLINED.

### 6. Check transaction status

On getting the Payment complete callback, the app will request for the transaction status from its server using Obopay transaction status check API.

### Next Steps
You have successfully added Obopay Payment to your Android App. For more information, do check out our documentation pages on Maven.
