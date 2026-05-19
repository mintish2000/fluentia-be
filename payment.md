# Payment API — Backend Contract

This document describes the three endpoints the backend must expose to support the PayPal checkout flow.  
The frontend never touches the PayPal secret key — all PayPal server-to-server calls are made here.

---

## Flow overview

```
User clicks "Buy Now"
  │
  ▼
POST /payments/orders           ← frontend asks backend to create a PayPal order
  │  backend calls PayPal API with secret key
  │  returns { orderId }
  │
  ▼
PayPal Smart Button shown to user
  │  user approves in PayPal popup
  │
  ▼
POST /payments/orders/:orderId/capture   ← frontend asks backend to capture
  │  backend calls PayPal API with secret key
  │  verifies captured amount matches plan price
  │  returns { providerReference, amount, currency }
  │
  ▼
POST /payments/my               ← frontend records the payment in your DB
  │  sends { providerReference, amount, currency }
  │  returns the saved Payment object
  ▼
Done — student subscription activated
```

---

## 1. Create PayPal Order

**`POST /api/v1/payments/orders`**  
Protected: yes (authenticated student)

### Request body

```json
{
  "planId": "group-1m"
}
```

| Field    | Type   | Description                                      |
|----------|--------|--------------------------------------------------|
| `planId` | string | One of the pricing plan identifiers (e.g. `group-1m`, `group-3m`, `group-6m`) |

### What the backend should do

1. Validate `planId` against your plan catalogue and resolve the `amount` + `currency`.
2. Call PayPal Orders API **server-to-server**:
   ```
   POST https://api-m.paypal.com/v2/checkout/orders
   Authorization: Bearer <access_token_from_secret>
   ```
   Body:
   ```json
   {
     "intent": "CAPTURE",
     "purchase_units": [{
       "amount": { "currency_code": "USD", "value": "100.00" },
       "description": "Group English Classes – 1 Month",
       "custom_id": "group-1m"
     }]
   }
   ```
3. Return the PayPal order ID to the frontend.

### Response `200 OK`

```json
{
  "orderId": "5O190127TN364715T"
}
```

### Error responses

| Status | When |
|--------|------|
| `400`  | Unknown or invalid `planId` |
| `401`  | Unauthenticated request |
| `502`  | PayPal API call failed |

---

## 2. Capture PayPal Order

**`POST /api/v1/payments/orders/:orderId/capture`**  
Protected: yes (authenticated student)

### URL parameter

| Param     | Description                              |
|-----------|------------------------------------------|
| `orderId` | The PayPal order ID returned in step 1   |

### No request body

### What the backend should do

1. Call PayPal Orders API **server-to-server**:
   ```
   POST https://api-m.paypal.com/v2/checkout/orders/{orderId}/capture
   Authorization: Bearer <access_token_from_secret>
   ```
2. Read the capture result and extract:
   - `purchase_units[0].payments.captures[0].id` → `providerReference`
   - `purchase_units[0].payments.captures[0].amount.value` → `amount`
   - `purchase_units[0].payments.captures[0].amount.currency_code` → `currency`
3. **Verify** the captured `amount` matches the expected plan price (prevents price-tampering).
4. Return the confirmed values to the frontend.

### Response `200 OK`

```json
{
  "providerReference": "3C679366HH908081L",
  "amount": 100,
  "currency": "USD"
}
```

### Error responses

| Status | When |
|--------|------|
| `400`  | Order not found or already captured |
| `401`  | Unauthenticated request |
| `422`  | Captured amount does not match expected plan price |
| `502`  | PayPal API call failed |

---

## 3. Record Payment (already exists)

**`POST /api/v1/payments/my`**  
Protected: yes (authenticated student)

Called by the frontend after a successful capture to persist the payment record.  
No backend changes required for this endpoint.

### Request body

```json
{
  "providerReference": "3C679366HH908081L",
  "amount": 100,
  "currency": "USD"
}
```

### Response `201 Created`

Returns the saved `Payment` object.

---

## Security checklist

- [ ] PayPal **Client Secret** is stored only in backend environment variables — never sent to the browser.
- [ ] **Rotate** the sandbox secret at https://developer.paypal.com (it was previously exposed in frontend source).
- [ ] **Rotate** the live secret on the PayPal dashboard.
- [ ] Capture endpoint verifies the PayPal-confirmed amount against your plan catalogue before saving.
- [ ] All three endpoints require an authenticated session (`Authorization: Bearer <jwt>`).
- [ ] Use PayPal **sandbox** credentials for development and **live** credentials for production — never mix them.
