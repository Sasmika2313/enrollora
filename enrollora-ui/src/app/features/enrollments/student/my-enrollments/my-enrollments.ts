
import { CommonModule } from '@angular/common';

import {
  HttpErrorResponse,
} from '@angular/common/http';

import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import {
  CancellationResponse,
  CreateCancellationRequest,
  EnrollmentResponse,
} from '../../enrollment.models';

import { EnrollmentService } from '../../enrollment.service';

@Component({
  selector: 'app-my-enrollments',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './my-enrollments.css',
  templateUrl: './my-enrollments.html',
})
export class MyEnrollments implements OnInit {

  private readonly enrollmentService =
    inject(EnrollmentService);

  enrollments =
    signal<EnrollmentResponse[]>([]);

  cancellationRequests =
    signal<CancellationResponse[]>([]);

  isLoading =
    signal(false);

  errorMessage =
    signal('');

  pageNumber =
    signal(1);

  pageSize =
    signal(10);

  totalRecords =
    signal(0);

  totalPages =
    signal(0);


  // Cancellation request state
  selectedEnrollment =
    signal<EnrollmentResponse | null>(null);

  cancellationReason =
    signal('');

  isSubmittingCancellation =
    signal(false);

  cancellationMessage =
    signal('');

  cancellationError =
    signal('');


  ngOnInit(): void {
    this.loadEnrollments();
  }


  loadEnrollments(): void {

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.enrollmentService
      .getMyEnrollments(
        this.pageNumber(),
        this.pageSize(),
      )
      .subscribe({

        next: (response) => {

          this.enrollments.set(response.items);

          this.totalRecords.set(response.totalRecords);

          this.totalPages.set(response.totalPages);

          this.isLoading.set(false);

          // Load cancellation history after enrollments load.
          this.loadCancellationRequests();
        },

        error: (error: HttpErrorResponse) => {

          const body = error.error;

          this.errorMessage.set(
            body?.detail ||
            body?.message ||
            body?.title ||
            'Unable to load your enrollments.',
          );

          this.isLoading.set(false);
        },
      });
  }


  loadCancellationRequests(): void {

    this.enrollmentService
      .getMyCancellationRequests()
      .subscribe({

        next: (response) => {
          this.cancellationRequests.set(response.items);
        },

        error: (error: HttpErrorResponse) => {
          console.error(
            'Unable to load cancellation requests:',
            error,
          );
        },
      });
  }


  // Find the latest cancellation request for an enrollment.
  cancellationFor(
    enrollmentId: number,
  ): CancellationResponse | undefined {

    return this.cancellationRequests().find(
      request => request.enrollmentId === enrollmentId,
    );
  }


  statusLabel(status: number): string {

    if (status === 0) {
      return 'Active';
    }

    return 'Cancelled';
  }


  cancellationStatusLabel(status: number): string {

    switch (status) {
      case 0:
        return 'Cancellation Pending';

      case 1:
        return 'Cancellation Approved';

      case 2:
        return 'Cancellation Rejected';

      default:
        return 'Unknown';
    }
  }


  // A new request is allowed only when the enrollment is active
  // and its latest cancellation request is not pending or approved.
  canRequestCancellation(
    enrollment: EnrollmentResponse,
  ): boolean {

    if (enrollment.status !== 0) {
      return false;
    }

    const request = this.cancellationFor(
      enrollment.enrollmentId,
    );

    return !request || request.status === 2;
  }


  openCancellationForm(
    enrollment: EnrollmentResponse,
  ): void {

    if (!this.canRequestCancellation(enrollment)) {
      return;
    }

    this.selectedEnrollment.set(enrollment);
    this.cancellationReason.set('');
    this.cancellationMessage.set('');
    this.cancellationError.set('');
  }


  closeCancellationForm(): void {

    if (this.isSubmittingCancellation()) {
      return;
    }

    this.selectedEnrollment.set(null);
    this.cancellationReason.set('');
    this.cancellationMessage.set('');
    this.cancellationError.set('');
  }


  submitCancellationRequest(): void {

    const enrollment = this.selectedEnrollment();

    const reason = this.cancellationReason().trim();

    if (!enrollment) {
      return;
    }

    // Prevent duplicate submissions while a request is pending.
    if (!this.canRequestCancellation(enrollment)) {
      this.cancellationError.set(
        'A cancellation request is already pending or has been approved.',
      );
      return;
    }

    if (!reason) {
      this.cancellationError.set(
        'Please enter a reason for cancellation.',
      );
      return;
    }

    this.isSubmittingCancellation.set(true);
    this.cancellationError.set('');
    this.cancellationMessage.set('');

    const request: CreateCancellationRequest = {
      reason,
    };

    this.enrollmentService
      .createCancellationRequest(
        enrollment.enrollmentId,
        request,
      )
      .subscribe({

        next: (response) => {

          this.isSubmittingCancellation.set(false);

          // Update the cancellation history immediately.
          this.cancellationRequests.update(requests => [
            response,
            ...requests.filter(
              item => item.enrollmentId !== response.enrollmentId,
            ),
          ]);

          this.cancellationMessage.set(
            'Cancellation request submitted successfully.',
          );

          this.cancellationReason.set('');
        },

        error: (error: HttpErrorResponse) => {

          const body = error.error;

          this.cancellationError.set(
            body?.detail ||
            body?.message ||
            body?.title ||
            'Unable to submit cancellation request.',
          );

          this.isSubmittingCancellation.set(false);

          // Refresh history in case the server already has a pending request.
          this.loadCancellationRequests();
        },
      });
  }


  previousPage(): void {

    if (this.pageNumber() > 1) {

      this.pageNumber.update(
        page => page - 1,
      );

      this.loadEnrollments();
    }
  }


  nextPage(): void {

    if (
      this.pageNumber() <
      this.totalPages()
    ) {

      this.pageNumber.update(
        page => page + 1,
      );

      this.loadEnrollments();
    }
  }
}
