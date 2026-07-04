package servicerequest

import (
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

const (
	StatusNew           = "new"
	StatusPending       = "pending"
	StatusInReview      = "in_review"
	StatusWaitingClient = "waiting_client"
	StatusInProgress    = "in_progress"
	StatusCompleted     = "completed"
	StatusCancelled     = "cancelled"

	PriorityLow    = "low"
	PriorityNormal = "normal"
	PriorityHigh   = "high"
	PriorityUrgent = "urgent"

	ContactMethodEmail    = "email"
	ContactMethodPhone    = "phone"
	ContactMethodWhatsApp = "whatsapp"

	SourceWebsite      = "website"
	SourceClientPortal = "client_portal"
	SourceAdmin        = "admin"
)

type ServiceRequest struct {
	ID                     string
	ReferenceNumber        string
	ClientID               string
	ServiceID              string
	RequesterName          string
	RequesterEmail         string
	RequesterPhone         string
	RequesterCompany       string
	Title                  string
	Description            string
	Status                 string
	Priority               string
	PreferredContactMethod string
	ExpectedDeadline       *time.Time
	Source                 string
	AdminNotes             string
	InternalNotes          string
	CreatedAt              time.Time
	UpdatedAt              time.Time
	SubmittedAt            time.Time
}

type PublicServiceRequest struct {
	ID                     string     `json:"id"`
	ReferenceNumber        string     `json:"reference_number"`
	ClientID               string     `json:"client_id,omitempty"`
	ServiceID              string     `json:"service_id,omitempty"`
	RequesterName          string     `json:"requester_name,omitempty"`
	RequesterEmail         string     `json:"requester_email,omitempty"`
	RequesterPhone         string     `json:"requester_phone,omitempty"`
	RequesterCompany       string     `json:"requester_company,omitempty"`
	Title                  string     `json:"title"`
	Description            string     `json:"description"`
	Status                 string     `json:"status"`
	Priority               string     `json:"priority"`
	PreferredContactMethod string     `json:"preferred_contact_method,omitempty"`
	ExpectedDeadline       *time.Time  `json:"expected_deadline,omitempty"`
	Source                 string     `json:"source"`
	AdminNotes             string     `json:"admin_notes,omitempty"`
	InternalNotes          string     `json:"internal_notes,omitempty"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
	SubmittedAt            time.Time  `json:"submitted_at"`
}

type CreateServiceRequestInput struct {
	ClientID               string
	ServiceID              string
	RequesterName          string
	RequesterEmail         string
	RequesterPhone         string
	RequesterCompany       string
	Title                  string
	Description            string
	Priority               string
	PreferredContactMethod string
	ExpectedDeadline       *time.Time
	Source                 string
}

type UpdateServiceRequestInput struct {
	ServiceID              string
	RequesterName          string
	RequesterEmail         string
	RequesterPhone         string
	RequesterCompany       string
	Title                  string
	Description            string
	Priority               string
	PreferredContactMethod string
	ExpectedDeadline       *time.Time
	AdminNotes             string
	InternalNotes          string
}

type UpdateStatusInput struct {
	Status        string
	AdminNotes    string
	InternalNotes string
}

type ListServiceRequestsFilter struct {
	ClientID  string
	ServiceID string
	Status    string
	Priority  string
	Source    string
	Search    string
	Page      int
	PageSize  int
}

func (r ServiceRequest) Public() PublicServiceRequest {
	return PublicServiceRequest{
		ID:                     r.ID,
		ReferenceNumber:        r.ReferenceNumber,
		ClientID:               r.ClientID,
		ServiceID:              r.ServiceID,
		RequesterName:          r.RequesterName,
		RequesterEmail:         r.RequesterEmail,
		RequesterPhone:         r.RequesterPhone,
		RequesterCompany:       r.RequesterCompany,
		Title:                  r.Title,
		Description:            r.Description,
		Status:                 r.Status,
		Priority:               r.Priority,
		PreferredContactMethod: r.PreferredContactMethod,
		ExpectedDeadline:       r.ExpectedDeadline,
		Source:                 r.Source,
		AdminNotes:             r.AdminNotes,
		InternalNotes:          r.InternalNotes,
		CreatedAt:              r.CreatedAt,
		UpdatedAt:              r.UpdatedAt,
		SubmittedAt:            r.SubmittedAt,
	}
}

func PublicServiceRequests(requests []ServiceRequest) []PublicServiceRequest {
	result := make([]PublicServiceRequest, 0, len(requests))

	for _, item := range requests {
		result = append(result, item.Public())
	}

	return result
}

func (i CreateServiceRequestInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "requester_name", i.RequesterName, 0, 150, false)
	validator.ValidateStringLength(v, "requester_company", i.RequesterCompany, 0, 150, false)
	validator.ValidateStringLength(v, "title", i.Title, 2, 200, true)
	validator.ValidateStringLength(v, "description", i.Description, 5, 5000, true)

	if strings.TrimSpace(i.RequesterEmail) != "" {
		validator.ValidateEmail(v, "requester_email", i.RequesterEmail)
	}

	validator.ValidatePhone(v, "requester_phone", i.RequesterPhone, false)

	v.Check(
		strings.TrimSpace(i.ClientID) != "" ||
			strings.TrimSpace(i.RequesterEmail) != "" ||
			strings.TrimSpace(i.RequesterPhone) != "",
		"requester_contact",
		"client id, requester email, or requester phone is required",
	)

	if i.Priority != "" {
		v.Check(IsValidPriority(i.Priority), "priority", "priority must be low, normal, high, or urgent")
	}

	if i.PreferredContactMethod != "" {
		v.Check(IsValidContactMethod(i.PreferredContactMethod), "preferred_contact_method", "preferred contact method must be email, phone, or whatsapp")
	}

	if i.Source != "" {
		v.Check(IsValidSource(i.Source), "source", "source must be website, client_portal, or admin")
	}

	return v.Errors()
}

func (i UpdateServiceRequestInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "requester_name", i.RequesterName, 0, 150, false)
	validator.ValidateStringLength(v, "requester_company", i.RequesterCompany, 0, 150, false)
	validator.ValidateStringLength(v, "title", i.Title, 2, 200, true)
	validator.ValidateStringLength(v, "description", i.Description, 5, 5000, true)
	validator.ValidateStringLength(v, "admin_notes", i.AdminNotes, 0, 5000, false)
	validator.ValidateStringLength(v, "internal_notes", i.InternalNotes, 0, 5000, false)

	if strings.TrimSpace(i.RequesterEmail) != "" {
		validator.ValidateEmail(v, "requester_email", i.RequesterEmail)
	}

	validator.ValidatePhone(v, "requester_phone", i.RequesterPhone, false)

	if i.Priority != "" {
		v.Check(IsValidPriority(i.Priority), "priority", "priority must be low, normal, high, or urgent")
	}

	if i.PreferredContactMethod != "" {
		v.Check(IsValidContactMethod(i.PreferredContactMethod), "preferred_contact_method", "preferred contact method must be email, phone, or whatsapp")
	}

	return v.Errors()
}

func (i UpdateStatusInput) Validate() validator.Errors {
	v := validator.New()

	v.Check(IsValidStatus(i.Status), "status", "status is invalid")
	validator.ValidateStringLength(v, "admin_notes", i.AdminNotes, 0, 5000, false)
	validator.ValidateStringLength(v, "internal_notes", i.InternalNotes, 0, 5000, false)

	return v.Errors()
}

func (f ListServiceRequestsFilter) Normalize() ListServiceRequestsFilter {
	f.ClientID = strings.TrimSpace(f.ClientID)
	f.ServiceID = strings.TrimSpace(f.ServiceID)
	f.Status = NormalizeStatus(f.Status)
	f.Priority = NormalizePriority(f.Priority)
	f.Source = NormalizeSource(f.Source)
	f.Search = strings.TrimSpace(f.Search)

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

func (f ListServiceRequestsFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}

func NormalizeCreateInput(input CreateServiceRequestInput) CreateServiceRequestInput {
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.ServiceID = strings.TrimSpace(input.ServiceID)
	input.RequesterName = strings.TrimSpace(input.RequesterName)
	input.RequesterEmail = validator.NormalizeEmail(input.RequesterEmail)
	input.RequesterPhone = strings.TrimSpace(input.RequesterPhone)
	input.RequesterCompany = strings.TrimSpace(input.RequesterCompany)
	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	input.Priority = NormalizePriority(input.Priority)
	input.PreferredContactMethod = NormalizeContactMethod(input.PreferredContactMethod)
	input.Source = NormalizeSource(input.Source)

	if input.Priority == "" {
		input.Priority = PriorityNormal
	}

	if input.Source == "" {
		input.Source = SourceWebsite
	}

	return input
}

func NormalizeUpdateInput(input UpdateServiceRequestInput) UpdateServiceRequestInput {
	input.ServiceID = strings.TrimSpace(input.ServiceID)
	input.RequesterName = strings.TrimSpace(input.RequesterName)
	input.RequesterEmail = validator.NormalizeEmail(input.RequesterEmail)
	input.RequesterPhone = strings.TrimSpace(input.RequesterPhone)
	input.RequesterCompany = strings.TrimSpace(input.RequesterCompany)
	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	input.Priority = NormalizePriority(input.Priority)
	input.PreferredContactMethod = NormalizeContactMethod(input.PreferredContactMethod)
	input.AdminNotes = strings.TrimSpace(input.AdminNotes)
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

func NormalizeContactMethod(method string) string {
	return strings.TrimSpace(strings.ToLower(method))
}

func NormalizeSource(source string) string {
	return strings.TrimSpace(strings.ToLower(source))
}

func IsValidStatus(status string) bool {
	switch NormalizeStatus(status) {
	case StatusNew, StatusPending, StatusInReview, StatusWaitingClient, StatusInProgress, StatusCompleted, StatusCancelled:
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

func IsValidContactMethod(method string) bool {
	switch NormalizeContactMethod(method) {
	case ContactMethodEmail, ContactMethodPhone, ContactMethodWhatsApp:
		return true
	default:
		return false
	}
}

func IsValidSource(source string) bool {
	switch NormalizeSource(source) {
	case SourceWebsite, SourceClientPortal, SourceAdmin:
		return true
	default:
		return false
	}
}