# End-to-End Test: Payment Processing Workflow

## Test Suite: Epic 4 - Payment Management

### Prerequisites
- [ ] Database migrations applied
- [ ] Admin/accountant test account created
- [ ] Test delivery confirmation exists
- [ ] Payment transaction auto-created from delivery

---

## Test Case 1: Payment Dashboard Overview

**Test ID**: E2E-PAY-001
**Priority**: Critical
**Estimated Duration**: 2-3 minutes

### Setup
1. Create 5 test payment transactions:
   - 1 overdue (due date < today)
   - 2 due this week
   - 1 due next month
   - 1 completed
2. Login as admin user

### Test Steps

#### Step 1: Access Payment Dashboard
1. Navigate to `/payments`
2. **Verify**:
   - [ ] Page loads without errors
   - [ ] Summary stats cards displayed
   - [ ] Correct counts in each card:
     - Total Pending
     - Overdue (red)
     - Due This Week (orange)
     - On Track (green)

#### Step 2: Filter Payments
1. Click "Overdue" tab
2. **Verify**:
   - [ ] Only 1 payment displayed
   - [ ] Alert level badge is red
   - [ ] "Overdue" badge visible
3. Click "Due This Week" tab
4. **Verify**:
   - [ ] 2 payments displayed
   - [ ] Alert levels: orange or yellow
5. Click "Completed" tab
6. **Verify**:
   - [ ] 1 payment displayed
   - [ ] Green completion badge
   - [ ] No "Pay" button visible
7. Click "All" tab
8. **Verify**:
   - [ ] All 5 payments displayed
   - [ ] Sorted by due date (ascending)

#### Step 3: Payment Table Verification
1. **Verify** table columns:
   - [ ] PO Number (clickable)
   - [ ] Supplier name
   - [ ] Project name
   - [ ] Amount (formatted with currency)
   - [ ] Due Date (formatted)
   - [ ] Days until due / overdue
   - [ ] Alert badge
   - [ ] Status badge
   - [ ] Actions (Pay button for pending)

### Expected Results
- ✅ All filters work correctly
- ✅ Statistics accurate
- ✅ No console errors

---

## Test Case 2: Initiate Payment (Happy Path)

**Test ID**: E2E-PAY-002
**Priority**: Critical

### Test Steps

#### Step 1: Start Payment Initiation
1. From payment dashboard, find pending payment
2. Click "Pay" button on overdue payment
3. **Verify**:
   - [ ] Navigated to `/payments/{paymentId}/process`
   - [ ] Payment details loaded
   - [ ] Supplier information displayed
   - [ ] Project information displayed
   - [ ] Timeline shows correct stages

#### Step 2: Initiate Payment
1. Click "Initiate Payment" button
2. **Verify** modal opens with:
   - [ ] Payment summary (amount, supplier, PO number)
   - [ ] Payment method dropdown
   - [ ] Transaction reference field
   - [ ] Notes textarea
   - [ ] Confirmation checkbox
3. Select payment method: "Bank Transfer"
4. Enter transaction reference: "TXN-20251108-001"
5. Add notes: "Q4 supplier payment batch 1"
6. Check confirmation checkbox
7. Click "Initiate Payment"
8. **Verify**:
   - [ ] Loading state shown
   - [ ] Modal closes
   - [ ] Success toast displayed
   - [ ] Payment status updated to "processing"
   - [ ] Timeline updated with initiation timestamp

### Backend Verification
1. Check `payment_transactions` table:
   - [ ] Status = 'processing'
   - [ ] payment_method = 'Bank Transfer'
   - [ ] transaction_reference = 'TXN-20251108-001'
   - [ ] notes saved correctly
   - [ ] updated_at timestamp updated
2. Check `project_activities`:
   - [ ] Activity log created
   - [ ] Type: 'payment_initiated'
   - [ ] Contains payment details

### Expected Results
- ✅ Payment status changed to processing
- ✅ Data persisted correctly
- ✅ UI updates immediately (optimistic)

---

## Test Case 3: Complete Payment

**Test ID**: E2E-PAY-003
**Priority**: Critical

### Test Steps

#### Step 1: Navigate to Processing Payment
1. From dashboard, click on payment with status "processing"
2. Navigate to detail page
3. **Verify**:
   - [ ] Status badge shows "Processing"
   - [ ] "Mark as Completed" button visible
   - [ ] Timeline shows initiation step

#### Step 2: Mark as Completed
1. Click "Mark as Completed" button
2. **Verify** modal opens with:
   - [ ] Payment amount highlighted
   - [ ] Transaction reference field (required)
   - [ ] Payment date field (defaults to today)
   - [ ] Receipt URL field (optional)
   - [ ] Notes field
3. Fill form:
   - Transaction reference: "CONF-20251108-001"
   - Payment date: (leave as today)
   - Receipt URL: "https://example.com/receipt/001"
   - Notes: "Payment processed via online banking"
4. Click "Mark as Completed"
5. **Verify**:
   - [ ] Loading state shown
   - [ ] Modal closes
   - [ ] Success toast: "Payment completed"
   - [ ] Status badge turns green
   - [ ] Timeline updated with completion timestamp
   - [ ] "View Receipt" button appears

### Backend Verification
1. Check `payment_transactions` table:
   - [ ] Status = 'completed'
   - [ ] paid_at timestamp set
   - [ ] receipt_url saved
   - [ ] All fields populated correctly

### Expected Results
- ✅ Payment marked as completed
- ✅ No longer appears in "Due This Week" filter
- ✅ Appears in "Completed" filter

---

## Test Case 4: Payment Due Date Alerts

**Test ID**: E2E-PAY-004
**Priority**: High

### Test Data Setup
Create payments with specific due dates:
- Payment A: Due yesterday (overdue)
- Payment B: Due tomorrow (due soon)
- Payment C: Due in 5 days (this week)
- Payment D: Due in 30 days (on track)

### Test Steps
1. Navigate to payment dashboard
2. **Verify** alert badges:
   - [ ] Payment A: Red "Overdue" badge
   - [ ] Payment B: Orange "Due Soon" badge
   - [ ] Payment C: Yellow "This Week" badge
   - [ ] Payment D: Green "On Time" or no badge
3. **Verify** days calculation:
   - [ ] Payment A shows "X days overdue"
   - [ ] Payment B shows "in 1 days"
   - [ ] Payment C shows "in 5 days"
   - [ ] Payment D shows "in 30 days"

### Expected Results
- ✅ Alert levels correct based on proximity to due date
- ✅ Color coding matches severity

---

## Test Case 5: Payment Statistics Accuracy

**Test ID**: E2E-PAY-005
**Priority**: High

### Test Steps
1. Count payments manually:
   - Overdue: X payments
   - Due this week: Y payments
   - Total pending: Z payments
2. Navigate to `/payments`
3. **Verify** summary cards match:
   - [ ] Total Pending = Z
   - [ ] Overdue = X
   - [ ] Due This Week = Y
   - [ ] On Track = Z - X - Y
4. **Verify** total amounts:
   - [ ] Total amount due displayed
   - [ ] Overdue amount calculated correctly

### Expected Results
- ✅ Statistics match actual data
- ✅ Amounts calculated correctly

---

## Test Case 6: Validation Tests

**Test ID**: E2E-PAY-006
**Priority**: Medium

### Test 6.1: Initiate Without Confirmation
1. Open initiate payment modal
2. Fill all fields except confirmation checkbox
3. Try to submit
4. **Verify**:
   - [ ] Error message shown
   - [ ] Submit button disabled or shows error
   - [ ] Form does not submit

### Test 6.2: Complete Without Transaction Reference
1. Open complete payment modal
2. Leave transaction reference empty
3. Try to submit
4. **Verify**:
   - [ ] Field validation error shown
   - [ ] Required field indicator
   - [ ] Cannot submit

### Test 6.3: Invalid Receipt URL
1. Open complete payment modal
2. Enter invalid URL: "not-a-url"
3. Try to submit
4. **Verify**:
   - [ ] URL validation error
   - [ ] Error message clear
   - [ ] Form does not submit

---

## Test Case 7: Concurrent Payment Updates

**Test ID**: E2E-PAY-007
**Priority**: Medium

### Test Steps
1. Open payment detail page in two browser tabs
2. In Tab 1: Initiate payment
3. In Tab 2: Refresh page
4. **Verify**:
   - [ ] Tab 2 shows updated status
   - [ ] No stale data displayed
   - [ ] Real-time updates work

---

## Test Case 8: Payment Timeline Visualization

**Test ID**: E2E-PAY-008
**Priority**: Medium

### Test Steps
1. Navigate to completed payment detail page
2. **Verify** timeline shows:
   - [ ] Created (timestamp, checkmark)
   - [ ] Delivery Confirmed (timestamp, checkmark)
   - [ ] Due Date (date, status indicator)
   - [ ] Payment Completed (timestamp, checkmark)
3. **Verify** visual indicators:
   - [ ] Green checkmarks for completed stages
   - [ ] Blue icon for due date
   - [ ] Connecting lines between stages

### For Overdue Payment
1. Navigate to overdue payment
2. **Verify** due date indicator:
   - [ ] Red background
   - [ ] "Overdue" badge visible
   - [ ] Days overdue shown

---

## Test Case 9: Role-Based Access Control

**Test ID**: E2E-PAY-009
**Priority**: High

### Test Steps

#### As Non-Admin User
1. Login as project manager (not admin/accountant)
2. Try to navigate to `/payments`
3. **Verify**:
   - [ ] Access denied or redirected
   - [ ] OR can only see own project payments

#### As Admin
1. Login as admin
2. Navigate to `/payments`
3. **Verify**:
   - [ ] Can see all payments
   - [ ] Can initiate payments
   - [ ] Can complete payments

---

## Test Case 10: Search and Pagination (If Implemented)

**Test ID**: E2E-PAY-010
**Priority**: Low

### Test Steps
1. Create 20+ test payments
2. Navigate to payment dashboard
3. **Verify**:
   - [ ] Pagination controls visible
   - [ ] Can navigate between pages
   - [ ] Payment count accurate per page
4. If search implemented:
   - [ ] Search by PO number works
   - [ ] Search by supplier name works
   - [ ] Results update in real-time

---

## Performance Benchmarks

### Target Metrics
- [ ] Dashboard load time < 2 seconds
- [ ] Payment detail page < 1.5 seconds
- [ ] Modal opens instantly (< 100ms)
- [ ] Optimistic UI update < 50ms
- [ ] Backend update confirmation < 2 seconds

---

## Accessibility Checklist

- [ ] All modals keyboard accessible (ESC to close)
- [ ] Tab navigation works correctly
- [ ] Form labels properly associated
- [ ] Error messages announced
- [ ] Focus management in modals
- [ ] Color not only indicator (icons + text)

---

## Edge Cases

### Edge Case 1: Same Payment, Multiple Tabs
- [ ] Open same payment in 2 tabs
- [ ] Initiate in Tab 1
- [ ] Verify Tab 2 updates or prevents duplicate action

### Edge Case 2: Network Timeout
- [ ] Simulate slow network
- [ ] Attempt payment initiation
- [ ] Verify loading state, timeout handling
- [ ] Retry functionality works

### Edge Case 3: Very Large Amounts
- [ ] Create payment for $1,000,000+
- [ ] Verify number formatting correct
- [ ] No overflow issues

---

## Cleanup
- [ ] Delete all test payment transactions
- [ ] Delete associated delivery confirmations
- [ ] Delete test purchase orders
- [ ] Verify no orphaned records
