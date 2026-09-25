# Flutterwave Test-Mode Configuration

ShadowNode uses Flutterwave Standard hosted checkout through the server-side v3 API.

Required server-only variables:

```text
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
FLUTTERWAVE_SECRET_HASH=<test-webhook-secret-hash>
```

Optional validation-only variable:

```text
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-...
```

The public key is not sent to the browser or required by the server-side Standard Checkout request. When supplied, it must be a test key. Live keys are rejected by the application while this integration remains test-only.

Configure the Flutterwave test webhook URL as:

```text
https://<trusted-application-origin>/api/client/payments/flutterwave/webhook
```

The dashboard webhook secret hash must exactly match `FLUTTERWAVE_SECRET_HASH`. Do not place real credentials in source control.
