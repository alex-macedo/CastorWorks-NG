# End-to-End Test: Delivery Confirmation Workflow

## Test Suite: Epic 4 - Delivery Confirmation & Payment Processing

### Prerequisites
- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Test supervisor account created
- [ ] Test purchase order with status 'sent'
- [ ] Camera/photo upload permissions granted

---

## Test Case 1: Complete Delivery Confirmation Flow (Happy Path)

**Test ID**: E2E-DEL-001
**Priority**: Critical
**Estimated Duration**: 5-7 minutes

### Setup
1. Create test purchase order with:
   - 3 line items
   - Status: 'sent'
   - Expected delivery date: today
2. Assign supervisor role to test user
3. Clear browser session storage

### Test Steps

#### Step 1: View Expected Deliveries
1. Navigate to `/supervisor/deliveries`
2. **Verify**:
   - [ ] Page loads without errors
   - [ ] Test PO appears in delivery list
   - [ ] "Today" badge is visible
   - [ ] PO details correctly displayed (number, supplier, amount)
   - [ ] "Confirm Delivery" button is visible

#### Step 2: Start Verification Checklist
1. Click "Confirm Delivery" button
2. **Verify**:
   - [ ] Redirected to `/supervisor/deliveries/{poId}/verify`
   - [ ] Progress indicator shows "Step 1 of 3"
   - [ ] All 3 line items displayed
   - [ ] Ordered quantities pre-filled
   - [ ] Received quantities default to ordered quantities
   - [ ] "Matches order" checkboxes are checked by default

#### Step 3: Complete Item Verification
1. For item 1: Leave as is (full delivery, no issues)
2. For item 2: Change received quantity to 80% of ordered
3. For item 3: Check "Items damaged" and enter damaged quantity of 5
4. Add general notes: "Delivery truck arrived 15 minutes late"
5. Click "Continue to Photos"
6. **Verify**:
   - [ ] Visual indicators updated (green/yellow/red)
   - [ ] Summary shows correct completion percentage
   - [ ] Form validation passes
   - [ ] Data saved to session storage

#### Step 4: Capture Delivery Photos
1. **Verify** page loads at `/supervisor/deliveries/{poId}/photos`
2. Click "Take Photo" button
3. Capture photo using camera
4. Add caption: "Materials delivered - general view"
5. Click "Take Photo" again
6. Capture second photo
7. Add caption: "Damaged items - close up"
8. Click "Continue to Signature"
9. **Verify**:
   - [ ] Progress indicator shows "Step 2 of 3"
   - [ ] Both photos appear in gallery
   - [ ] Captions saved correctly
   - [ ] Photos compressed (< 2MB each)
   - [ ] Upload progress indicator shown
   - [ ] Photos uploaded to Supabase Storage

#### Step 5: Digital Signature
1. **Verify** page loads at `/supervisor/deliveries/{poId}/signature`
2. **Verify** delivery summary displays:
   - [ ] Items verified count
   - [ ] Photos captured count
   - [ ] Items matched count
   - [ ] Issues found count
3. Draw signature on canvas
4. **Verify**:
   - [ ] Signature captured
   - [ ] "Complete Delivery Confirmation" button enabled
   - [ ] GPS location captured (if permitted)
5. Click "Complete Delivery Confirmation"
6. **Verify**:
   - [ ] Loading state shown
   - [ ] No errors during submission

#### Step 6: Success Confirmation
1. **Verify** redirected to `/supervisor/deliveries/{poId}/success`
2. **Verify** success screen shows:
   - [ ] Green checkmark icon
   - [ ] "Delivery Confirmed!" message
   - [ ] "What happens next" list
   - [ ] Auto-redirect countdown visible
3. Wait 5 seconds
4. **Verify**:
   - [ ] Redirected to `/supervisor/deliveries`
   - [ ] PO no longer in expected deliveries list

### Backend Verification
1. Check `delivery_confirmations` table:
   - [ ] Record created with correct PO ID
   - [ ] Signature data saved
   - [ ] GPS coordinates saved (if captured)
   - [ ] Checklist JSON contains all items
2. Check `delivery_photos` table:
   - [ ] 2 photos linked to delivery confirmation
   - [ ] Captions saved correctly
   - [ ] Storage paths valid
3. Check `payment_transactions` table:
   - [ ] Payment transaction auto-created
   - [ ] Amount calculated correctly (pro-rated for partial delivery)
   - [ ] Due date calculated from payment terms
   - [ ] Status: 'pending'
4. Check `purchase_orders` table:
   - [ ] Status updated to 'partially_delivered'
   - [ ] metadata contains delivery percentage
5. Check `project_activities` table:
   - [ ] Activity log created
   - [ ] Contains correct metadata

### Expected Results
- ✅ All verifications pass
- ✅ No console errors
- ✅ Complete workflow < 5 minutes
- ✅ Data integrity maintained
- ✅ Payment transaction created automatically

---

## Test Case 2: Full Delivery (All Items Match)

**Test ID**: E2E-DEL-002
**Priority**: High

### Test Steps
1. Complete Steps 1-2 from Test Case 1
2. For all items: Leave received quantity = ordered quantity
3. Check "Matches order" for all items
4. No damage checkboxes selected
5. Capture 1 photo minimum
6. Complete signature and submit
7. **Verify**:
   - [ ] PO status updated to 'delivered'
   - [ ] Payment amount = full PO amount
   - [ ] Payment transaction created

---

## Test Case 3: Rejected Delivery

**Test ID**: E2E-DEL-003
**Priority**: High

### Test Steps
1. Complete Steps 1-2 from Test Case 1
2. For all items: Set received quantity = 0
3. Uncheck "Matches order" for all items
4. Add notes: "Wrong materials delivered"
5. Capture photos of incorrect materials
6. Complete signature and submit
7. **Verify**:
   - [ ] PO status updated to 'delivery_rejected'
   - [ ] NO payment transaction created
   - [ ] Issue description saved

---

## Test Case 4: Photo Upload Limits

**Test ID**: E2E-DEL-004
**Priority**: Medium

### Test Steps
1. Navigate to photo capture screen
2. Attempt to upload 11 photos
3. **Verify**:
   - [ ] Only 10 photos accepted
   - [ ] Toast error shown for 11th photo
   - [ ] Error message: "Maximum photos reached"

---

## Test Case 5: Signature Required Validation

**Test ID**: E2E-DEL-005
**Priority**: High

### Test Steps
1. Navigate through verification and photos
2. Reach signature screen
3. Click "Complete Delivery Confirmation" without signing
4. **Verify**:
   - [ ] Error toast shown
   - [ ] Message: "Signature required"
   - [ ] Button disabled until signature drawn

---

## Test Case 6: Session Storage Persistence

**Test ID**: E2E-DEL-006
**Priority**: Medium

### Test Steps
1. Complete verification checklist
2. Navigate to photos screen
3. Refresh browser
4. **Verify**:
   - [ ] Verification data persists
   - [ ] User can continue workflow
5. Complete photos, navigate to signature
6. Go back to photos screen
7. **Verify**:
   - [ ] Photos still visible
   - [ ] Can navigate forward again

---

## Test Case 7: Network Error Handling

**Test ID**: E2E-DEL-007
**Priority**: High

### Test Steps
1. Complete entire workflow up to final submission
2. Disable network before clicking submit
3. Click "Complete Delivery Confirmation"
4. **Verify**:
   - [ ] Error message shown
   - [ ] "Retry" button available
   - [ ] Form data retained
   - [ ] Photos not lost
5. Re-enable network
6. Click "Retry"
7. **Verify**:
   - [ ] Submission succeeds
   - [ ] All data saved correctly

---

## Performance Benchmarks

### Target Metrics
- [ ] Page load time < 2 seconds
- [ ] Photo upload (2MB) < 3 seconds
- [ ] Final submission < 5 seconds
- [ ] Total workflow completion < 5 minutes

### Mobile Performance
- [ ] Touch targets ≥ 44px
- [ ] No horizontal scrolling required
- [ ] Camera launches within 1 second
- [ ] Signature canvas responsive to touch

---

## Accessibility Checklist

- [ ] All forms have proper labels
- [ ] Error messages are descriptive
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Safari (iOS)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iPhone)
- [ ] Mobile Chrome (Android)

---

## Cleanup
- [ ] Delete test purchase order
- [ ] Remove test delivery confirmation
- [ ] Delete uploaded photos from storage
- [ ] Remove test payment transaction
- [ ] Clear session storage
