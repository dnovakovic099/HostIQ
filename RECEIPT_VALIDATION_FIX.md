# Receipt Validation Error 21002 Fix

## Issue
Receipt validation is failing with error 21002: "The receipt data is not valid."

## Error 21002 Meaning
Apple error code 21002 means: **"The data in the receipt-data property was malformed or missing."**

## Common Causes

### 1. StoreKit Configuration Testing Receipts
When using **StoreKit Configuration** for local testing, the receipts are **test receipts** that:
- Are generated locally by Xcode
- May have a different format than production receipts
- Need to be validated against Apple's **sandbox** environment, not production

### 2. Backend Validation Environment
The backend must use the **sandbox URL** for testing:
- **Sandbox URL**: `https://sandbox.itunes.apple.com/verifyReceipt`
- **Production URL**: `https://buy.itunes.apple.com/verifyReceipt`

For StoreKit Configuration testing, always use the **sandbox URL**.

### 3. Receipt Format
The receipt should be:
- Base64 encoded string
- Sent as-is (react-native-iap already provides it encoded)
- Not double-encoded

## Fixes Applied

### 1. Enhanced Error Handling
- Added validation for purchase object before finishing transaction
- Added detailed logging for debugging
- Safe transaction finishing (won't crash if purchase is invalid)

### 2. Improved Receipt Retrieval
- Multiple fallback methods to get receipt data
- Better error messages
- Logging to help debug receipt issues

### 3. Transaction Finishing
- Validates purchase object has `transactionId` before finishing
- Handles errors gracefully
- Won't crash if transaction finishing fails

## Backend Requirements

For StoreKit Configuration testing, ensure your backend:

1. **Uses Sandbox URL for Testing**
   ```javascript
   const validationURL = isProduction 
     ? 'https://buy.itunes.apple.com/verifyReceipt'
     : 'https://sandbox.itunes.apple.com/verifyReceipt';
   ```

2. **Handles Test Receipts**
   - StoreKit Configuration receipts are test receipts
   - Must validate against sandbox, not production
   - May need to retry with sandbox if production validation fails

3. **Error Handling**
   - Status 21002: Malformed receipt - check receipt format
   - Status 21007: Test receipt sent to production - retry with sandbox
   - Status 21008: Production receipt sent to sandbox - retry with production

## Testing Checklist

- [ ] Backend uses sandbox URL for StoreKit Configuration testing
- [ ] Receipt is base64 encoded (react-native-iap handles this)
- [ ] Receipt data is not empty or null
- [ ] Backend handles error 21007 (test receipt in production)
- [ ] Transaction finishing doesn't crash on errors

## Next Steps

1. **Check Backend Logs**
   - Verify which validation URL is being used
   - Check if receipt data is being received correctly

2. **Verify Receipt Format**
   - Receipt should be a base64 string
   - Should start with receipt-like data (not empty)

3. **Test with Sandbox**
   - Ensure backend retries with sandbox if production fails
   - StoreKit Configuration always generates sandbox receipts

## Additional Notes

- StoreKit Configuration is for **local testing only**
- For production testing, use **TestFlight** with sandbox accounts
- Production receipts can only be validated in production environment
- Sandbox receipts can only be validated in sandbox environment


