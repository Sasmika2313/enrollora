using Enrollora.Api.Data;
using Enrollora.Api.DTOs;
using Enrollora.Api.Models;
using Enrollora.Api.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Enrollora.Api.Services;

public sealed class EnrollmentService(
    ApplicationDbContext db,
    IRepository<Enrollment> enrollments,
    IRepository<Student> students,
    IRepository<Course> courses) : IEnrollmentService
{
    public Task<PagedResult<EnrollmentResponse>> GetAllAsync(
        EnrollmentQuery query,
        CancellationToken ct) =>
        GetPageAsync(
            enrollments.Query()
                .Include(x => x.Student)
                .Include(x => x.Course),
            query,
            ct);

    public Task<PagedResult<EnrollmentResponse>> GetMineAsync(
        int studentId,
        EnrollmentQuery query,
        CancellationToken ct) =>
        GetPageAsync(
            enrollments.Query()
                .Include(x => x.Student)
                .Include(x => x.Course)
                .Where(x => x.StudentId == studentId),
            query,
            ct);

    public Task<PagedResult<EnrollmentResponse>> GetForStudentAsync(
        int studentId,
        EnrollmentQuery query,
        CancellationToken ct) =>
        GetPageAsync(
            enrollments.Query()
                .Include(x => x.Student)
                .Include(x => x.Course)
                .Where(x => x.StudentId == studentId),
            query,
            ct);

    public Task<PagedResult<EnrollmentResponse>> GetForCourseAsync(
        int courseId,
        EnrollmentQuery query,
        CancellationToken ct) =>
        GetPageAsync(
            enrollments.Query()
                .Include(x => x.Student)
                .Include(x => x.Course)
                .Where(x => x.CourseId == courseId),
            query,
            ct);

    public async Task<EnrollmentResponse> CreateAsync(
        int studentId,
        int courseId,
        CancellationToken ct)
    {
        await using var transaction =
            await db.Database.BeginTransactionAsync(
                System.Data.IsolationLevel.Serializable,
                ct);

        // 1. Find student
        var student = await students
            .Query()
            .FirstOrDefaultAsync(
                x => x.StudentId == studentId,
                ct);

        if (student is null)
        {
            throw new KeyNotFoundException(
                "Student was not found.");
        }

        // 2. Student must be approved
        if (student.Status != StudentStatus.Approved)
        {
            throw new InvalidOperationException(
                "Only approved students can enroll.");
        }

        // 3. Find course
        var course = await courses
            .Query(true)
            .FirstOrDefaultAsync(
                x => x.CourseId == courseId,
                ct);

        if (course is null)
        {
            throw new KeyNotFoundException(
                "Course was not found.");
        }

        // 4. Course must be active
        if (!course.IsActive)
        {
            throw new InvalidOperationException(
                "This course is not available for enrollment.");
        }

        // 5. Prevent duplicate active enrollment
        var alreadyEnrolled = await enrollments
            .Query()
            .AnyAsync(
                x =>
                    x.StudentId == studentId &&
                    x.CourseId == courseId &&
                    x.Status == EnrollmentStatus.Active,
                ct);

        if (alreadyEnrolled)
        {
            throw new InvalidOperationException(
                "You already have an active enrollment in this course.");
        }

        // 6. Check course capacity
        var activeEnrollmentCount = await enrollments
            .Query()
            .CountAsync(
                x =>
                    x.CourseId == courseId &&
                    x.Status == EnrollmentStatus.Active,
                ct);

        if (activeEnrollmentCount >= course.Capacity)
        {
            throw new InvalidOperationException(
                "This course has reached its enrollment capacity.");
        }

        // 7. Create enrollment
        var enrollment = new Enrollment
        {
            StudentId = studentId,
            CourseId = courseId,
            EnrolledAt = DateTime.UtcNow,
            Status = EnrollmentStatus.Active
        };

        await enrollments.AddAsync(
            enrollment,
            ct);

        // 8. Save
        await enrollments.SaveChangesAsync(ct);

        // 9. Commit transaction
        await transaction.CommitAsync(ct);

        // 10. Return response
        return new EnrollmentResponse(
            enrollment.EnrollmentId,
            student.StudentId,
            student.Name,
            student.Email,
            course.CourseId,
            course.CourseName,
            enrollment.EnrolledAt,
            enrollment.Status);
    }

    private async Task<PagedResult<EnrollmentResponse>> GetPageAsync(
        IQueryable<Enrollment> query,
        EnrollmentQuery request,
        CancellationToken ct)
    {
        request.Normalize();

        // Search student name/email
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();

            query = query.Where(
                x =>
                    x.Student.Name.Contains(term) ||
                    x.Student.Email.Contains(term));
        }

        // Course filter
        if (request.CourseId.HasValue)
        {
            query = query.Where(
                x => x.CourseId == request.CourseId.Value);
        }

        // Status filter
        if (request.Status.HasValue)
        {
            query = query.Where(
                x => x.Status == request.Status.Value);
        }

        // From date
        if (request.FromDate.HasValue)
        {
            query = query.Where(
                x => x.EnrolledAt >= request.FromDate.Value);
        }

        // To date
        if (request.ToDate.HasValue)
        {
            query = query.Where(
                x => x.EnrolledAt <= request.ToDate.Value);
        }

        // Sorting
        query = request.SortBy?.ToLowerInvariant() switch
        {
            "student" =>
                request.SortOrder == "desc"
                    ? query.OrderByDescending(x => x.Student.Name)
                    : query.OrderBy(x => x.Student.Name),

            "course" =>
                request.SortOrder == "desc"
                    ? query.OrderByDescending(x => x.Course.CourseName)
                    : query.OrderBy(x => x.Course.CourseName),

            _ =>
                request.SortOrder == "desc"
                    ? query.OrderByDescending(x => x.EnrolledAt)
                    : query.OrderBy(x => x.EnrolledAt)
        };

        // Total count
        var total = await query.CountAsync(ct);

        // Pagination
        var items = await query
            .Skip(
                (request.PageNumber - 1) *
                request.PageSize)
            .Take(request.PageSize)
            .Select(
                x => new EnrollmentResponse(
                    x.EnrollmentId,
                    x.StudentId,
                    x.Student.Name,
                    x.Student.Email,
                    x.CourseId,
                    x.Course.CourseName,
                    x.EnrolledAt,
                    x.Status))
            .ToListAsync(ct);

        var totalPages =
            (int)Math.Ceiling(
                total / (double)request.PageSize);

        return new PagedResult<EnrollmentResponse>(
            items,
            request.PageNumber,
            request.PageSize,
            total,
            totalPages);
    }
}