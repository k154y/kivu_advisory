package assignment

import (
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

const (
	StatusAssigned   = "assigned"
	StatusAccepted   = "accepted"
	StatusInProgress = "in_progress"
	StatusCompleted  = "completed"
	StatusCancelled  = "cancelled"

	PriorityLow    = "low"
	PriorityNormal = "normal"
	PriorityHigh   = "high"
	PriorityUrgent = "urgent"
)

type Assignment struct {
	ID               string
	ServiceRequestID string
	AccountantUserID string
	AssignedByUserID string
	Status           string
	Priority         string
	DueDate          *time.Time
	StartedAt        *time.Time
	CompletedAt      *time.Time
	Notes            string
	InternalNotes    string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type PublicAssignment struct {
	ID               string     `json:"id"`
	ServiceRequestID string     `json:"service_request_id"`
	AccountantUserID string     `json:"accountant_user_id"`
	AssignedByUserID string     `json:"assigned_by_user_id,omitempty"`
	Status           string     `json:"status"`
	Priority         string     `json:"priority"`
	DueDate          *time.Time `json:"due_date,omitempty"`
	StartedAt        *time.Time `json:"started_at,omitempty"`
	CompletedAt      *time.Time `json:"completed_at,omitempty"`
	Notes            string     `json:"notes,omitempty"`
	InternalNotes    string     `json:"internal_notes,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type CreateAssignmentInput struct {
	ServiceRequestID string
	AccountantUserID string
	AssignedByUserID string
	Priority         string
	DueDate          *time.Time
	Notes            string
	InternalNotes    string
}

type UpdateAssignmentInput struct {
	AccountantUserID string
	Priority         string
	DueDate          *time.Time
	Notes            string
	InternalNotes    string
}

type UpdateStatusInput struct {
	Status        string
	Notes         string
	InternalNotes string
}

type ListAssignmentsFilter struct {
	ServiceRequestID string
	AccountantUserID string
	AssignedByUserID string
	Status           string
	Priority         string
	Page             int
	PageSize         int
}

func (a Assignment) Public() PublicAssignment {
	return PublicAssignment{
		ID:               a.ID,
		ServiceRequestID: a.ServiceRequestID,
		AccountantUserID: a.AccountantUserID,
		AssignedByUserID: a.AssignedByUserID,
		Status:           a.Status,
		Priority:         a.Priority,
		DueDate:          a.DueDate,
		StartedAt:        a.StartedAt,
		CompletedAt:      a.CompletedAt,
		Notes:            a.Notes,
		InternalNotes:    a.InternalNotes,
		CreatedAt:        a.CreatedAt,
		UpdatedAt:        a.UpdatedAt,
	}
}

func PublicAssignments(assignments []Assignment) []PublicAssignment {
	result := make([]PublicAssignment, 0, len(assignments))

	for _, item := range assignments {
		result = append(result, item.Public())
	}

	return result
}

func (i CreateAssignmentInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "service_request_id", i.ServiceRequestID, 1, 100, true)
	validator.ValidateStringLength(v, "accountant_user_id", i.AccountantUserID, 1, 100, true)
	validator.ValidateStringLength(v, "assigned_by_user_id", i.AssignedByUserID, 1, 100, true)
	validator.ValidateStringLength(v, "notes", i.Notes, 0, 5000, false)
	validator.ValidateStringLength(v, "internal_notes", i.InternalNotes, 0, 5000, false)

	if i.Priority != "" {
		v.Check(IsValidPriority(i.Priority), "priority", "priority must be low, normal, high, or urgent")
	}

	return v.Errors()
}

func (i UpdateAssignmentInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "accountant_user_id", i.AccountantUserID, 1, 100, true)
	validator.ValidateStringLength(v, "notes", i.Notes, 0, 5000, false)
	validator.ValidateStringLength(v, "internal_notes", i.InternalNotes, 0, 5000, false)

	if i.Priority != "" {
		v.Check(IsValidPriority(i.Priority), "priority", "priority must be low, normal, high, or urgent")
	}

	return v.Errors()
}

func (i UpdateStatusInput) Validate() validator.Errors {
	v := validator.New()

	v.Check(IsValidStatus(i.Status), "status", "status is invalid")
	validator.ValidateStringLength(v, "notes", i.Notes, 0, 5000, false)
	validator.ValidateStringLength(v, "internal_notes", i.InternalNotes, 0, 5000, false)

	return v.Errors()
}

func (f ListAssignmentsFilter) Normalize() ListAssignmentsFilter {
	f.ServiceRequestID = strings.TrimSpace(f.ServiceRequestID)
	f.AccountantUserID = strings.TrimSpace(f.AccountantUserID)
	f.AssignedByUserID = strings.TrimSpace(f.AssignedByUserID)
	f.Status = NormalizeStatus(f.Status)
	f.Priority = NormalizePriority(f.Priority)

	if f.Page <= 0 {
		f.Page = 1
	}

	if f.PageSize <= 0 {
		f.PageSize = 20
	}

	if f.PageSize > 100 {
		f.PageSize = 100
	}

	return f
}

func (f ListAssignmentsFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}

func NormalizeCreateInput(input CreateAssignmentInput) CreateAssignmentInput {
	input.ServiceRequestID = strings.TrimSpace(input.ServiceRequestID)
	input.AccountantUserID = strings.TrimSpace(input.AccountantUserID)
	input.AssignedByUserID = strings.TrimSpace(input.AssignedByUserID)
	input.Priority = NormalizePriority(input.Priority)
	input.Notes = strings.TrimSpace(input.Notes)
	input.InternalNotes = strings.TrimSpace(input.InternalNotes)

	if input.Priority == "" {
		input.Priority = PriorityNormal
	}

	return input
}

func NormalizeUpdateInput(input UpdateAssignmentInput) UpdateAssignmentInput {
	input.AccountantUserID = strings.TrimSpace(input.AccountantUserID)
	input.Priority = NormalizePriority(input.Priority)
	input.Notes = strings.TrimSpace(input.Notes)
	input.InternalNotes = strings.TrimSpace(input.InternalNotes)

	if input.Priority == "" {
		input.Priority = PriorityNormal
	}

	return input
}

func NormalizeStatus(status string) string {
	return strings.TrimSpace(strings.ToLower(status))
}

func NormalizePriority(priority string) string {
	return strings.TrimSpace(strings.ToLower(priority))
}

func IsValidStatus(status string) bool {
	switch NormalizeStatus(status) {
	case StatusAssigned, StatusAccepted, StatusInProgress, StatusCompleted, StatusCancelled:
		return true
	default:
		return false
	}
}

func IsValidPriority(priority string) bool {
	switch NormalizePriority(priority) {
	case PriorityLow, PriorityNormal, PriorityHigh, PriorityUrgent:
		return true
	default:
		return false
	}
}
