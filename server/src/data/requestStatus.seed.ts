import { RequestStatusMaster } from '../types/domain';
import { reserveIdRange } from '../utils/idGenerator';

const SEEDED_AT = '2026-01-01T00:00:00.000Z';
const audit = { createdAt: SEEDED_AT, updatedAt: SEEDED_AT, isActive: true };

/**
 * Table: request_status_master
 * The full formal buyback lifecycle. Ids 1 ("Request Created"), 2 ("Amount
 * Calculated"), 5 ("Buyback Accepted"), 6 ("Completed") and 7 ("Cancelled")
 * are wired into the live flow so far - see the `RequestStatusMaster` doc
 * comment in types/domain.ts. There is deliberately no separate "confirmed"
 * status: that concept is already covered by "Buyback Accepted" (set once
 * the customer's OTP verifies), so the final `/confirm` step goes straight
 * to "Completed" instead.
 */
export const requestStatuses: RequestStatusMaster[] = [
  { id: 1, name: 'Request Created', sequence: 1, ...audit },
  { id: 2, name: 'Amount Calculated', sequence: 2, ...audit },
  { id: 3, name: 'Diagnosis Initiated', sequence: 3, ...audit },
  { id: 4, name: 'Diagnosis Completed', sequence: 4, ...audit },
  { id: 5, name: 'Buyback Accepted', sequence: 5, ...audit },
  { id: 6, name: 'Completed', sequence: 6, ...audit },
  { id: 7, name: 'Cancelled', sequence: 7, ...audit },
  { id: 8, name: 'Rejected', sequence: 8, ...audit },
  { id: 9, name: 'Ready for pickup', sequence: 9, ...audit },
  { id: 10, name: 'Picked Up', sequence: 10, ...audit },
  { id: 11, name: 'Device Delivered to Vendor', sequence: 11, ...audit },
  { id: 12, name: 'Partner Payout Completed', sequence: 12, ...audit },
];
export const REQUEST_STATUS_CREATED_ID = 1;
export const REQUEST_STATUS_AMOUNT_CALCULATED_ID = 2;
export const REQUEST_STATUS_BUYBACK_ACCEPTED_ID = 5;
export const REQUEST_STATUS_COMPLETED_ID = 6;
export const REQUEST_STATUS_CANCELLED_ID = 7;

reserveIdRange('request_status_master', requestStatuses.length);
