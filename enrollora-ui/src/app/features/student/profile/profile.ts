
import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface StudentProfile {
  studentId: number;
  name: string;
  email: string;
  department: string;
  age: number;
  cgpa: number;
  status: number;
  registeredAt: string;
  reviewedAt: string | null;
}

interface UpdateStudentRequest {
  name: string;
  department: string;
  age: number;
  cgpa: number;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {

  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  private apiUrl = `${environment.apiUrl}/students`;

  profile: StudentProfile = {
    studentId: 0,
    name: '',
    email: '',
    department: '',
    age: 0,
    cgpa: 0,
    status: 0,
    registeredAt: '',
    reviewedAt: null,
  };

  isLoading = true;
  isSaving = false;

  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<StudentProfile>(`${this.apiUrl}/me`)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          console.log('PROFILE RESPONSE:', response);
          this.profile = response;
        },
        error: (error) => {
          console.error('PROFILE LOAD ERROR:', error);

          this.errorMessage =
            error.error?.detail ||
            error.error?.message ||
            `Unable to load profile. HTTP ${error.status}`;
        }
      });
  }

  saveProfile(): void {

    console.log('SAVE BUTTON CLICKED');

    this.successMessage = '';
    this.errorMessage = '';

    if (
      !this.profile.name.trim() ||
      !this.profile.department.trim() ||
      this.profile.age < 17 ||
      this.profile.age > 60 ||
      this.profile.cgpa < 0 ||
      this.profile.cgpa > 10
    ) {
      this.errorMessage = 'Please enter valid profile details.';
      return;
    }

    const request: UpdateStudentRequest = {
      name: this.profile.name.trim(),
      department: this.profile.department.trim(),
      age: this.profile.age,
      cgpa: this.profile.cgpa,
    };

    console.log('UPDATE REQUEST:', request);

    this.isSaving = true;

    this.http.put<StudentProfile>(
      `${this.apiUrl}/me`,
      request
    )
    .pipe(
      finalize(() => {
        // TEMPORARY DEBUG CODE - START
        console.log('SAVE REQUEST FINISHED');
        // TEMPORARY DEBUG CODE - END

        this.isSaving = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({

      next: (response) => {
        console.log('UPDATE RESPONSE:', response);

        if (response) {
          this.profile = response;
        }

        this.successMessage = 'Profile updated successfully.';

        // Refresh profile in case the API returns HTTP 204.
        if (!response) {
          this.loadProfile();
        }
      },

      error: (error) => {
        console.error('PROFILE UPDATE ERROR:', error);

        this.errorMessage =
          error.error?.detail ||
          error.error?.message ||
          `Unable to update profile. HTTP ${error.status}`;
      }

    });
  }
}
