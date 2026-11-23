
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';

import { CancellationRequestService } from '../cancellation-request.service';

import {
  CancellationRequest,
  ReviewCancellationRequest,
} from '../cancellation-request.models';

@Component({
  selector: 'app-cancellation-requests',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './cancellation-requests.html',
  styleUrl: './cancellation-requests.css',
})
export class CancellationRequests implements OnInit {

  private cancellationService = inject(CancellationRequestService);
  private cdr = inject(ChangeDetectorRef);

  requests: CancellationRequest[] = [];

  isLoading = false;
  isRefreshing = false;

  errorMessage = '';
  refreshError = '';

  // Review modal properties
  selectedRequest: CancellationRequest | null = null;
  reviewAction: 'approve' | 'reject' | null = null;

  adminRemarks = '';
  isSubmitting = false;
  reviewError = '';
  successMessage = '';

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {

    const isInitialLoad = this.requests.length === 0;

    if (isInitialLoad) {
      this.isLoading = true;
    } else {
      this.isRefreshing = true;
    }

    this.errorMessage = '';
    this.refreshError = '';

    this.cancellationService.getAll()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.isRefreshing = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.requests = response.items;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Cancellation requests loading failed:', error);

          if (isInitialLoad) {
            this.errorMessage =
              'Unable to load cancellation requests.';
          } else {
            this.refreshError =
              'Could not refresh requests. Showing previously loaded data.';
          }

          this.cdr.detectChanges();
        },
      });
  }

  statusLabel(status: number): string {
    switch (status) {
      case 0:
        return 'Pending';
      case 1:
        return 'Approved';
      case 2:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  openReviewModal(
    request: CancellationRequest,
    action: 'approve' | 'reject'
  ): void {

    if (request.status !== 0) {
      return;
    }

    this.selectedRequest = request;
    this.reviewAction = action;

    this.adminRemarks = '';
    this.reviewError = '';
    this.successMessage = '';
  }

  closeReviewModal(): void {

    if (this.isSubmitting) {
      return;
    }

    this.selectedRequest = null;
    this.reviewAction = null;
    this.adminRemarks = '';
    this.reviewError = '';
  }

  submitReview(): void {

    if (!this.selectedRequest || !this.reviewAction) {
      return;
    }

    const requestId =
      this.selectedRequest.cancellationRequestId;

    const reviewRequest: ReviewCancellationRequest = {
      adminRemarks: this.adminRemarks.trim() || null,
    };

    this.isSubmitting = true;
    this.reviewError = '';

    const reviewObservable =
      this.reviewAction === 'approve'
        ? this.cancellationService.approve(requestId, reviewRequest)
        : this.cancellationService.reject(requestId, reviewRequest);

    reviewObservable
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (updatedRequest) => {

          // Update the existing row without reloading the entire page.
          this.requests = this.requests.map(request =>
            request.cancellationRequestId === requestId
              ? updatedRequest
              : request
          );

          this.successMessage =
            this.reviewAction === 'approve'
              ? 'Cancellation request approved successfully.'
              : 'Cancellation request rejected successfully.';

          this.selectedRequest = null;
          this.reviewAction = null;
          this.adminRemarks = '';

          this.cdr.detectChanges();
        },

        error: (error) => {
          console.error('Cancellation review failed:', error);

          this.reviewError =
            error.error?.message ||
            'Unable to process this cancellation request. Please try again.';

          this.cdr.detectChanges();
        },
      });
  }
}
