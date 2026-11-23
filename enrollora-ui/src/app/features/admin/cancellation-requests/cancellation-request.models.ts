
import { PagedResult } from '../../../shared/models/paged-result.model';

export interface CancellationRequest {
  cancellationRequestId: number;
  enrollmentId: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  courseName: string;
  reason: string;
  status: number;
  requestedAt: string;
  reviewedAt: string | null;
  adminRemarks: string | null;
}

export interface ReviewCancellationRequest {
  adminRemarks?: string | null;
}

export type CancellationRequestPagedResult =
  PagedResult<CancellationRequest>;
