# End-to-End Test: Supplier PO Acknowledgment Workflow

## Test Suite: Epic 3 - Story 3-9 (Optional)

### Prerequisites
- [ ] Database migrations applied including po_acknowledgment_tokens table
- [ ] Edge functions deployed (generate-po-acknowledgment-token, acknowledge-purchase-order)
- [ ] Test purchase order with status 'sent'
- [ ] Test supplier email configured

---

## Test Case 1: Generate Acknowledgment Token

**Test ID**: E2E-ACK-001
**Priority**: High
**Estimated Duration**: 2 minutes

### Setup
1. Create test purchase order with status 'sent'
2. Login as project manager

### Test Steps

#### Step 1: Generate Token
1. Navigate to PO detail page `/purchase-orders/{poId}`
2. Click "Generate Acknowledgment Link" button (if UI implemented)
3. OR call edge function directly:
   ```javascript
   supabase.functions.invoke('generate-po-acknowledgment-token', {
     body: { purchase_order_id: '{poId}' }
   })
   ```
4. **Verify** response contains:
   - [ ] success: true
   - [ ] token (64 characters)
   - [ ] acknowledgment_url
   - [ ] expires_at (30 days from now)

### Backend Verification
1. Check `po_acknowledgment_tokens` table:
   - [ ] Record created
   - [ ] Token is unique
   - [ ] purchase_order_id matches
   - [ ] expires_at = created_at + 30 days
   - [ ] acknowledged_at is NULL
2. Check `project_activities`:
   - [ ] Activity log created
   - [ ] Type: 'po_acknowledgment_token_generated'

### Expected Results
- ✅ Token generated successfully
- ✅ URL format: `https://engproapp.com/po/acknowledge/{token}`
- ✅ Token stored securely

---

## Test Case 2: Supplier Acknowledges PO (Happy Path)

**Test ID**: E2E-ACK-002
**Priority**: Critical

### Test Steps

#### Step 1: Access Acknowledgment Page
1. Open generated URL in browser (no login required)
2. **Verify** page loads at `/po/acknowledge/{token}`
3. **Verify** loading state shown briefly
4. **Verify** page displays:
   - [ ] "Purchase Order Acknowledgment" heading
   - [ ] PO summary card with:
     - PO Number
     - Supplier name
     - Project name
     - Total amount
     - Expected delivery date
   - [ ] Notes textarea (optional)
   - [ ] "Confirm Receipt" button
   - [ ] "Request Changes" button

#### Step 2: Submit Acknowledgment
1. Add optional notes: "Materials ready for delivery as scheduled"
2. Click "Confirm Receipt" button
3. **Verify**:
   - [ ] Loading state shown
   - [ ] Button disabled during submission
   - [ ] Success toast appears
4. **Verify** success screen displays:
   - [ ] Green checkmark icon
   - [ ] "Thank You!" message
   - [ ] Confirmation details:
     - PM notified
     - Order status updated
     - Record saved

### Backend Verification
1. Check `po_acknowledgment_tokens` table:
   - [ ] acknowledged_at timestamp set
   - [ ] acknowledgment_method = 'link'
   - [ ] notes saved correctly
2. Check `purchase_orders` table:
   - [ ] Status updated to 'acknowledged'
   - [ ] acknowledged_at timestamp set
   - [ ] acknowledgment_method = 'email'
3. Check `project_activities`:
   - [ ] Activity created: 'po_acknowledged'
   - [ ] Contains supplier name and timestamp
   - [ ] metadata includes notes

### Expected Results
- ✅ Acknowledgment recorded
- ✅ PO status updated
- ✅ PM notified (check notifications)

---

## Test Case 3: Invalid Token

**Test ID**: E2E-ACK-003
**Priority**: High

### Test Steps
1. Navigate to `/po/acknowledge/invalid-token-12345`
2. **Verify** page shows:
   - [ ] Red X icon
   - [ ] "Invalid Link" heading
   - [ ] Error message explaining issue
   - [ ] Contact instructions
3. **Verify** no backend changes made

### Expected Results
- ✅ Clear error message
- ✅ User knows what to do next
- ✅ No data corruption

---

## Test Case 4: Expired Token

**Test ID**: E2E-ACK-004
**Priority**: High

### Setup
1. Create token
2. Manually update expires_at to past date in database:
   ```sql
   UPDATE po_acknowledgment_tokens
   SET expires_at = NOW() - INTERVAL '1 day'
   WHERE token = '{token}'
   ```

### Test Steps
1. Navigate to acknowledgment URL
2. **Verify** page shows:
   - [ ] Orange warning icon
   - [ ] "Link Expired" heading
   - [ ] Expiration explanation
   - [ ] Instructions to request new link
3. **Verify** backend:
   - [ ] accessed_at timestamp updated
   - [ ] acknowledged_at remains NULL

### Expected Results
- ✅ Expired state clearly communicated
- ✅ No acknowledgment recorded

---

## Test Case 5: Already Acknowledged

**Test ID**: E2E-ACK-005
**Priority**: High

### Setup
1. Complete Test Case 2 (acknowledge PO)
2. Copy the same acknowledgment URL

### Test Steps
1. Navigate to same URL again
2. **Verify** page shows:
   - [ ] Green checkmark
   - [ ] "Already Acknowledged" heading
   - [ ] Message: "This PO has already been acknowledged"
   - [ ] Thank you message
3. **Verify** backend:
   - [ ] No duplicate acknowledgment created
   - [ ] Original acknowledged_at unchanged
   - [ ] accessed_at timestamp NOT updated

### Expected Results
- ✅ Duplicate prevented
- ✅ Idempotent operation

---

## Test Case 6: Request Changes Flow

**Test ID**: E2E-ACK-006
**Priority**: Medium

### Test Steps
1. Navigate to valid acknowledgment page
2. Click "Request Changes" button
3. **Verify**:
   - [ ] Email client opens
   - [ ] To: support@engproapp.com (or configured email)
   - [ ] Subject: "PO {PO_NUMBER} - Request Changes"
   - [ ] No acknowledgment recorded in backend

### Expected Results
- ✅ Email composition works
- ✅ No data changed
- ✅ Clear communication channel

---

## Test Case 7: Multiple Tokens for Same PO

**Test ID**: E2E-ACK-007
**Priority**: Medium

### Test Steps
1. Generate token for PO
2. Immediately generate another token for same PO
3. **Verify** second request:
   - [ ] Returns existing token
   - [ ] Message: "Active token already exists"
   - [ ] Same URL returned
   - [ ] No duplicate token created
4. Acknowledge using first token
5. Generate new token for same PO
6. **Verify**:
   - [ ] New token generated (previous one acknowledged)
   - [ ] New expiration date
   - [ ] New URL

### Expected Results
- ✅ No duplicate active tokens
- ✅ Can regenerate after acknowledgment

---

## Test Case 8: Token Cleanup

**Test ID**: E2E-ACK-008
**Priority**: Low

### Test Steps
1. Create test tokens with various expiration dates:
   - Token A: Expired 100 days ago
   - Token B: Expired 50 days ago
   - Token C: Expired yesterday
   - Token D: Active (expires in future)
2. Call cleanup function:
   ```sql
   SELECT public.cleanup_expired_po_acknowledgment_tokens();
   ```
3. **Verify** result:
   - [ ] Function returns count = 2 (A and B deleted)
   - [ ] Token A deleted (>90 days)
   - [ ] Token B deleted (>90 days)
   - [ ] Token C remains (< 90 days)
   - [ ] Token D remains (active)

### Expected Results
- ✅ Old tokens cleaned up
- ✅ Recent tokens retained

---

## Test Case 9: RLS Policy Enforcement

**Test ID**: E2E-ACK-009
**Priority**: High

### Test Steps

#### Anonymous Access (Supplier)
1. Clear authentication (logout)
2. Access acknowledgment URL
3. **Verify**:
   - [ ] Page loads (public access)
   - [ ] Can view PO summary
   - [ ] Can acknowledge

#### PM Access
1. Login as project manager
2. Query tokens for their projects:
   ```javascript
   const { data } = await supabase
     .from('po_acknowledgment_tokens')
     .select('*')
   ```
3. **Verify**:
   - [ ] Can see own project tokens
   - [ ] Cannot see other project tokens

#### Unauthorized User
1. Login as different project manager
2. Try to access token data for other PM's project
3. **Verify**:
   - [ ] RLS prevents access
   - [ ] Empty result set or error

### Expected Results
- ✅ Public read access works
- ✅ Project isolation maintained
- ✅ Data security enforced

---

## Test Case 10: PO Status Integration

**Test ID**: E2E-ACK-010
**Priority**: High

### Test Steps
1. Create PO with status 'draft'
2. Try to generate acknowledgment token
3. **Verify**:
   - [ ] Error returned
   - [ ] Message: "PO must be in 'sent' status"
   - [ ] No token created
4. Update PO status to 'sent'
5. Generate token
6. **Verify**:
   - [ ] Token generated successfully
7. Acknowledge PO
8. **Verify** PO status:
   - [ ] Changed from 'sent' to 'acknowledged'
   - [ ] acknowledged_at timestamp set

### Expected Results
- ✅ Only sent POs can be acknowledged
- ✅ Status transitions correctly

---

## Test Case 11: Notes Field Validation

**Test ID**: E2E-ACK-011
**Priority**: Low

### Test Steps
1. Navigate to acknowledgment page
2. Add very long notes (>1000 characters)
3. Submit acknowledgment
4. **Verify**:
   - [ ] Submission succeeds
   - [ ] Full notes saved
5. Access page without notes
6. Submit acknowledgment
7. **Verify**:
   - [ ] Submission succeeds
   - [ ] notes field NULL in database

### Expected Results
- ✅ Notes optional
- ✅ Long notes handled

---

## Test Case 12: Mobile Responsiveness

**Test ID**: E2E-ACK-012
**Priority**: Medium

### Test Steps
1. Open acknowledgment URL on mobile device (or resize browser to 375px width)
2. **Verify** layout:
   - [ ] Single column layout
   - [ ] No horizontal scrolling
   - [ ] PO summary card readable
   - [ ] Buttons full-width
   - [ ] Touch targets ≥ 44px
   - [ ] Text size appropriate
3. Complete acknowledgment
4. **Verify**:
   - [ ] All interactions work on touch
   - [ ] Success page displays correctly

### Expected Results
- ✅ Fully mobile-responsive
- ✅ Good UX on small screens

---

## Integration Test: End-to-End with Email

**Test ID**: E2E-ACK-013
**Priority**: High

### Complete Flow
1. PM creates purchase order
2. PM sends PO email to supplier (includes acknowledgment link)
3. Supplier receives email
4. Supplier clicks acknowledgment link in email
5. Supplier reviews PO details
6. Supplier acknowledges receipt
7. PM receives acknowledgment notification
8. PM sees updated PO status

### Verify Each Step
- [ ] Email sent successfully
- [ ] Link embedded correctly in email
- [ ] Link works when clicked
- [ ] Acknowledgment recorded
- [ ] PM notification sent
- [ ] Dashboard updated

---

## Performance Benchmarks

### Target Metrics
- [ ] Token generation < 500ms
- [ ] Acknowledgment page load < 2 seconds
- [ ] Acknowledgment submission < 1 second
- [ ] Cleanup function < 5 seconds (1000 tokens)

---

## Security Checklist

- [ ] Tokens cryptographically secure (64 chars)
- [ ] Token brute-force protection (rate limiting)
- [ ] SQL injection prevention
- [ ] XSS prevention in notes field
- [ ] RLS policies prevent unauthorized access
- [ ] Expired tokens cannot be used
- [ ] Duplicate acknowledgments prevented

---

## Cleanup
- [ ] Delete test tokens
- [ ] Delete test purchase orders
- [ ] Remove test activity logs
- [ ] Verify no orphaned records
