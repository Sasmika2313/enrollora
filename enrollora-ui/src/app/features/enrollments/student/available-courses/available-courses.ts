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
  CourseResponse,
  CourseFilter,
} from '../../../admin/courses/course.models';

import { CourseService } from '../../../admin/courses/course.service';

import { EnrollmentService } from '../../enrollment.service';

@Component({
  selector: 'app-available-courses',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './available-courses.css',
  templateUrl: './available-courses.html',
})
export class AvailableCourses implements OnInit {

  private readonly courseService =
    inject(CourseService);

  private readonly enrollmentService =
    inject(EnrollmentService);


  courses =
    signal<CourseResponse[]>([]);

  selectedCourse =
    signal<CourseResponse | null>(null);

  isLoading =
    signal(false);

  errorMessage =
    signal('');

  successMessage =
    signal('');

  enrollmentError =
    signal('');

  processingCourseId =
    signal<number | null>(null);

  searchText =
    signal('');

  pageNumber =
    signal(1);

  pageSize =
    signal(9);

  totalRecords =
    signal(0);

  totalPages =
    signal(0);


  ngOnInit(): void {

    this.loadCourses();

  }


  loadCourses(): void {

    this.isLoading.set(true);

    this.errorMessage.set('');

    const filters: CourseFilter = {

      isActive: true,

      availability: 'available',

      search:
        this.searchText().trim() || undefined,

    };


    this.courseService
      .getCourses(
        this.pageNumber(),
        this.pageSize(),
        filters,
      )
      .subscribe({

        next: (response) => {

          this.courses.set(
            response.items,
          );

          this.totalRecords.set(
            response.totalRecords,
          );

          this.totalPages.set(
            response.totalPages,
          );

          this.isLoading.set(false);

        },

        error: (error: HttpErrorResponse) => {

          this.errorMessage.set(
            this.getErrorMessage(
              error,
              'Unable to load courses.',
            ),
          );

          this.isLoading.set(false);

        },

      });

  }


  onSearchChange(
    value: string,
  ): void {

    this.searchText.set(value);

    this.pageNumber.set(1);

    this.loadCourses();

  }


  clearSearch(): void {

    this.searchText.set('');

    this.pageNumber.set(1);

    this.loadCourses();

  }


  viewDetails(
    course: CourseResponse,
  ): void {

    this.selectedCourse.set(course);

  }


  closeDetails(): void {

    this.selectedCourse.set(null);

  }


  enroll(
    course: CourseResponse,
  ): void {

    if (
      this.processingCourseId() !== null ||
      course.availableSeats <= 0
    ) {

      return;

    }


    this.processingCourseId.set(
      course.courseId,
    );

    this.successMessage.set('');

    this.enrollmentError.set('');


    this.enrollmentService
      .createEnrollment({
        courseId: course.courseId,
      })
      .subscribe({

        next: () => {

          this.processingCourseId.set(null);

          this.selectedCourse.set(null);

          this.successMessage.set(
            `You have successfully enrolled in ${course.courseName}.`,
          );

          this.loadCourses();

        },

        error: (error: HttpErrorResponse) => {

          this.processingCourseId.set(null);

          this.enrollmentError.set(
            this.getErrorMessage(
              error,
              'Unable to enroll in this course.',
            ),
          );

        },

      });

  }


  previousPage(): void {

    if (this.pageNumber() > 1) {

      this.pageNumber.update(
        page => page - 1,
      );

      this.loadCourses();

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

      this.loadCourses();

    }

  }


  private getErrorMessage(
    error: HttpErrorResponse,
    fallback: string,
  ): string {

    const body = error.error;


    if (
      typeof body === 'string' &&
      body.trim()
    ) {

      return body;

    }


    if (body?.detail) {

      return body.detail;

    }


    if (body?.message) {

      return body.message;

    }


    if (body?.title) {

      return body.title;

    }


    if (body?.errors) {

      const messages =
        Object.values(body.errors).flat();

      if (messages.length > 0) {

        return messages
          .map(message => String(message))
          .join(' ');

      }

    }


    return fallback;

  }

}