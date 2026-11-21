import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CourseService } from '../course.service';
import { CourseResponse, SaveCourseRequest } from '../course.models';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course-list.html',
  styleUrl: './course-list.css',
})
export class CourseListComponent implements OnInit {
  private courseService = inject(CourseService);

  // Courses
  courses = signal<CourseResponse[]>([]);

  isLoading = signal(false);
  errorMessage = signal('');

  pageNumber = signal(1);
  pageSize = signal(10);

  totalRecords = signal(0);
  totalPages = signal(0);

  // Add Course modal
  showAddCourseForm = signal(false);

  isAddingCourse = signal(false);

  addCourseError = signal('');

  addCourseSuccess = signal('');

  // Form values
  newCourse: SaveCourseRequest = {
    courseName: '',
    duration: '',
    fees: 0,
    capacity: 30,
    isActive: true,
  };

  ngOnInit(): void {
    this.loadCourses();
  }

  // Load courses from backend
  loadCourses(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.courseService
      .getCourses(this.pageNumber(), this.pageSize())
      .subscribe({
        next: (response) => {
          this.courses.set(response.items);

          this.totalRecords.set(response.totalRecords);
          this.totalPages.set(response.totalPages);

          this.isLoading.set(false);
        },

        error: (error) => {
          console.error('Error loading courses:', error);

          this.errorMessage.set(
            error?.error?.message ||
            error?.error?.detail ||
            'Unable to load courses.',
          );

          this.isLoading.set(false);
        },
      });
  }

  // Open Add Course form
  openAddCourseForm(): void {
    this.resetCourseForm();

    this.addCourseError.set('');
    this.addCourseSuccess.set('');

    this.showAddCourseForm.set(true);
  }

  // Close Add Course form
  closeAddCourseForm(): void {
    if (this.isAddingCourse()) {
      return;
    }

    this.showAddCourseForm.set(false);
    this.addCourseError.set('');
  }

  // Create course
  addCourse(): void {
    this.addCourseError.set('');
    this.addCourseSuccess.set('');

    // Basic frontend validation
    if (!this.newCourse.courseName.trim()) {
      this.addCourseError.set('Course name is required.');
      return;
    }

    if (!this.newCourse.duration.trim()) {
      this.addCourseError.set('Duration is required.');
      return;
    }

    if (this.newCourse.fees < 0) {
      this.addCourseError.set('Fees cannot be negative.');
      return;
    }

    if (this.newCourse.capacity < 1) {
      this.addCourseError.set('Capacity must be at least 1.');
      return;
    }

    const request: SaveCourseRequest = {
      courseName: this.newCourse.courseName.trim(),
      duration: this.newCourse.duration.trim(),
      fees: Number(this.newCourse.fees),
      capacity: Number(this.newCourse.capacity),
      isActive: this.newCourse.isActive,
    };

    this.isAddingCourse.set(true);

    this.courseService.createCourse(request).subscribe({
      next: (course) => {
        console.log('Course created:', course);

        this.isAddingCourse.set(false);

        this.addCourseSuccess.set(
          `${course.courseName} was added successfully.`,
        );

        // Close the modal after successful creation
        this.showAddCourseForm.set(false);

        // Go back to first page so the new course can be seen
        this.pageNumber.set(1);

        // Reload course list
        this.loadCourses();

        // Reset form
        this.resetCourseForm();
      },

      error: (error) => {
        console.error('Error creating course:', error);

        this.isAddingCourse.set(false);

        this.addCourseError.set(
          error?.error?.message ||
          error?.error?.detail ||
          error?.error?.title ||
          'Unable to create course.',
        );
      },
    });
  }

  // Reset form
  resetCourseForm(): void {
    this.newCourse = {
      courseName: '',
      duration: '',
      fees: 0,
      capacity: 30,
      isActive: true,
    };
  }

  // Navigate to next page
  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);

      this.loadCourses();
    }
  }

  // Navigate to previous page
  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);

      this.loadCourses();
    }
  }
}