# Requisition Form and Tracking Page Documentation

Status: Current implementation reference
Last updated: April 4, 2026

## 1) Scope

This document describes the current behavior of:

- Requisition form page
- Tracking page
- Hidden client portal entry that uses the same requisition form component

Primary routes:

- /dashboard/requisition-form-testing
- /dashboard/tracking
- /dashboard/client-portal?access=TOKEN

## 2) Key Files

- Requisition form component: src/app/dashboard/requisition-form-testing/page.tsx
- Tracking page: src/app/dashboard/tracking/page.tsx
- Client portal gate: src/app/dashboard/client-portal/page.tsx
- Supabase client: src/lib/supabase.ts

## 3) Requisition Form

### 3.1 Purpose

The requisition page collects borrower or reservation requests and stores them in the requisitions table.

### 3.2 Component usage modes

The same form component supports both:

- Editable mode for new submissions
- Read-only embedded mode for viewing records inside tracking modal

Supported props for reuse:

- initialData
- initialSignatures
- initialDocumentCode
- initialSignatureDates
- readOnly
- hideToolbar
- hideSubmitButtons
- embedded
- onCancel

### 3.3 Data captured

Student and request details:

- Name
- Student number
- Program and section
- Course and code
- Room
- Purpose
- Instructor
- Time of use

Item rows:

- Item name
- Quantity
- Unit
- Date and time out
- Date and time in

Signatures and document metadata:

- requestedBy
- endorsedBy
- releasedBy
- approvedBy
- signature dates for each signature role
- document code fields (effective date, revision number, revision date)

### 3.4 Validation rules

Required fields before submit:

- Student name
- Student number
- Purpose
- Instructor
- At least one item with non-empty name and quantity greater than 0

Optional fields:

- Program and section
- Course and code
- Room
- Time of use

Additional rules:

- Student number is digits-only
- If quantity is 1, unit auto-sets to pc
- If quantity is greater than 1, unit auto-sets to pcs
- Item suggestions only show in-stock inventory and prevent duplicates across rows

### 3.5 Submission flow

1. User chooses Reservation or Borrow
2. Verification modal appears
3. Confirm Submit inserts into requisitions table

Inserted values include:

- id format: REQ-YYYY-####
- status: Reserved
- requisition_type: borrow or reservation
- date_out set to current timestamp
- date_in set to null
- signatures payload including signatureDates and documentCode

### 3.6 PDF export

After successful submission, the success modal includes a Download Copy action.

Implementation notes:

- Uses @react-pdf/renderer
- Renders from shared template component at src/components/pdf/RequisitionTemplate.tsx
- Maps data from the requisition form state and signatures payload

## 4) Tracking Page

### 4.1 Purpose

Tracking consolidates borrow and reservation records in a single page with tab-based filtering.

Tabs:

- Borrows
- Reservations

Tab selection maps to requisition_type filtering.

### 4.2 Data loading and processing

- Fetches all requisitions ordered by created_at descending
- Filters by active tab requisition_type
- Supports status filter
- Supports text search by student number, student name, room, and purpose
- Supports sorting by newest, room, and status

### 4.3 Status cards

Counts are shown for:

- Reserved
- Approved
- Released
- Completed
- Cancelled

Counts are scoped to the active tab type.

### 4.4 Row actions

Approve:

- For borrow records, performs inventory deduction before approving
- Updates requisition status to Approved
- Sets date_out to current timestamp

Decline:

- Updates status to Cancelled

Delete:

- Permanently deletes requisition row after confirmation

Returned (borrow tab only, when status is Approved):

- Updates status to Completed
- Sets date_in to current timestamp

View:

- Opens modal and renders the same requisition form component in read-only embedded mode

### 4.5 Inventory deduction behavior on Approve

For borrow approvals:

- Aggregates required quantities per item name across requisition rows
- Loads matching inventory rows by item_name
- Verifies enough total stock
- Deducts from highest-quantity rows first
- Recomputes stock_status after each update:
  - Out of Stock if quantity <= 0
  - Low Stock if quantity <= low_stock_threshold (or default 5)
  - In Stock otherwise

### 4.6 PDF export

Tracking View modal includes a Download PDF button.

Implementation notes:

- Uses the same shared template and download utility as the requisition form
- Maps selected requisition row data to PDF payload fields
- Outputs an A4 PDF copy of the official requisition layout

## 5) Client Portal Entry

Route:

- /dashboard/client-portal

Behavior:

- Requires query parameter access
- access must match server env variable CLIENT_PORTAL_QR_TOKEN
- If token is missing or invalid, page returns not found
- If valid, renders the same requisition form component

## 6) Requisitions Data Contract (Current)

Main columns used by current pages:

- id
- student_name
- student_number
- purpose
- instructor
- program_section
- course_code
- room
- time_of_use
- items (JSON)
- status
- requisition_type
- date_out
- date_in
- created_at
- signatures (JSON)

Expected signatures JSON shape in current flow:

- requestedBy
- endorsedBy
- releasedBy
- approvedBy
- signatureDates:
  - requestedBy
  - endorsedBy
  - releasedBy
  - approvedBy
- documentCode:
  - effectiveDate
  - revisionNo
  - revisionDate

## 7) Known Gaps and Notes

- PDF export for requisition and tracking is currently disabled by request.
- Tracking table container is hidden on small screens using hidden md:flex.
  - If mobile tracking list is required, add a separate mobile list/card renderer.
- Approve and inventory deduction logic relies on exact item_name matching between requisition items and inventory records.

## 8) Recommended Next Steps

1. Implement one new shared PDF service for requisition and tracking view modal.
2. Add mobile tracking list UI for screens below md.
3. Add audit log entries for approve, decline, return, and delete actions.
4. Add optional approval reason fields for declined requests.
5. Add tests for validation and borrow inventory deduction edge cases.
