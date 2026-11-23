
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
  CancellationRequest,
  CancellationRequestPagedResult,
  ReviewCancellationRequest,
} from './cancellation-request.models';

@Injectable({
  providedIn: 'root',
})
export class CancellationRequestService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/cancellation-requests`;

  getAll(
    pageNumber = 1,
    pageSize = 10,
    status?: number,
  ): Observable<CancellationRequestPagedResult> {

    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    if (status !== undefined) {
      params = params.set('status', status);
    }

    return this.http.get<CancellationRequestPagedResult>(
      this.apiUrl,
      { params },
    );
  }

  approve(
    requestId: number,
    request: ReviewCancellationRequest,
  ): Observable<CancellationRequest> {
    return this.http.put<CancellationRequest>(
      `${this.apiUrl}/${requestId}/approve`,
      request,
    );
  }

  reject(
    requestId: number,
    request: ReviewCancellationRequest,
  ): Observable<CancellationRequest> {
    return this.http.put<CancellationRequest>(
      `${this.apiUrl}/${requestId}/reject`,
      request,
    );
  }
}
