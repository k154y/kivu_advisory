package consultation

import (
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

const (
	TypeGeneral          = "general"
	TypeAccounting       = "accounting"
	TypeTax              = "tax"
	TypeAudit            = "audit"
	TypeBusinessAdvisory = "business_advisory"
	TypeLegal            = "legal"
	TypeOther            = "other"

	StatusNew        = "new"
	StatusContacted  = "contacted"
	StatusScheduled  = "scheduled"
	StatusInProgress = "in_progress"
	StatusClosed     = "closed"
	StatusCancelled  = "cancelled"

	PriorityLow    = "low"
	PriorityNormal = "normal"
	PriorityHigh   = "high"
	PriorityUrgent = "urgent"

	ContactMethodEmail    = "email"
	ContactMethodPhone    = "phone"
	ContactMethodWhatsApp = "whatsapp"
)

type Consultation struct {
	ID                     string
	FullName               string
	Email                  string
	Phone                  string
	WhatsApp               string
	CompanyName            string
	Subject                string
	Message                string
	ConsultationType       string
	PreferredContactMethod string
	PreferredDate          *time.Time
	PreferredTime          string
	Status                 string
	Priority               string
	AssignedToUserID       string
	HandledByUserID        string
	AdminNotes             string
	FollowUpNotes          string
	ContactedAt            *time.Time
	ClosedAt               *time.Time
	CreatedAt              time.Time
	UpdatedAt              time.Time
}

type PublicConsultation struct {
	ID                     string     `json:"id"`
	FullName               string     `json:"full_name"`
	Email                  string     `json:"email,omitempty"`
	Phone                  string     `json:"phone,omitempty"`
	WhatsApp               string     `json:"whatsapp,omitempty"`
	CompanyName            string     `json:"company_name,omitempty"`
	Subject                string     `json:"subject"`
	Message                string     `json:"message"`
	ConsultationType       string     `json:"consultation_type"`
	PreferredContactMethod string     `json:"preferred_contact_method"`
	PreferredDate          *time.Time `json:"preferred_date,omitempty"`
	PreferredTime          string     `json:"preferred_time,omitempty"`
	Status                 string     `json:"status"`
	Priority               string     `json:"priority"`
	AssignedToUserID       string     `json:"assigned_to_user_id,omitempty"`
	HandledByUserID        string     `json:"handled_by_user_id,omitempty"`
	AdminNotes             string     `json:"admin_notes,omitempty"`
	FollowUpNotes          string     `json:"follow_up_notes,omitempty"`
	ContactedAt            *time.Time `json:"contacted_at,omitempty"`
	ClosedAt               *time.Time `json:"closed_at,omitempty"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

type CreateConsultationInput struct {
	FullName               string
	Email                  string
	Phone                  string
	WhatsApp               string
	CompanyName            string
	Subject                string
	Message                string
	ConsultationType       string
	PreferredContactMethod string
	PreferredDate          *time.Time
	PreferredTime          string
	Priority               string
}

type UpdateConsultationInput struct {
	FullName               string
	Email                  string
	Phone                  string
	WhatsApp               string
	CompanyName            string
	Subject                string
	Message                string
	ConsultationType       string
	PreferredContactMethod string
	PreferredDate          *time.Time
	PreferredTime          string
	Priority               string
	AssignedToUserID       string
	HandledByUserID        string
	AdminNotes             string
	FollowUpNotes          string
}

type UpdateStatusInput struct {
	Status           string
	AssignedToUserID string
	HandledByUserID  string
	AdminNotes       string
	FollowUpNotes    string
}

type ListConsultationsFilter struct {
	Status           string
	Priority         string
	ConsultationType string
	AssignedToUserID string
	HandledByUserID  string
	Search           string
	Page             int
	PageSize         int
}

func (c Consultation) Public() PublicConsultation {
	return PublicConsultation{
		ID:                     c.ID,
		FullName:               c.FullName,
		Email:                  c.Email,
		Phone:                  c.Phone,
		WhatsApp:               c.WhatsApp,
		CompanyName:            c.CompanyName,
		Subject:                c.Subject,
		Message:                c.Message,
		ConsultationType:       c.ConsultationType,
		PreferredContactMethod: c.PreferredContactMethod,
		PreferredDate:          c.PreferredDate,
		PreferredTime:          c.PreferredTime,
		Status:                 c.Status,
		Priority:               c.Priority,
		AssignedToUserID:       c.AssignedToUserID,
		HandledByUserID:        c.HandledByUserID,
		AdminNotes:             c.AdminNotes,
		FollowUpNotes:          c.FollowUpNotes,
		ContactedAt:            c.ContactedAt,
		ClosedAt:               c.ClosedAt,
		CreatedAt:              c.CreatedAt,
		UpdatedAt:              c.UpdatedAt,
	}
}

func PublicConsultations(items []Consultation) []PublicConsultation {
	result := make([]PublicConsultation, 0, len(items))

	for _, item := range items {
		result = append(result, item.Public())
	}

	return result
}

func (i CreateConsultationInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "full_name", i.FullName, 2, 150, true)
	validator.ValidateStringLength(v, "company_name", i.CompanyName, 0, 150, false)
	validator.ValidateStringLength(v, "subject", i.Subject, 2, 200, true)
	validator.ValidateStringLength(v, "message", i.Message, 5, 5000, true)
	validator.ValidateStringLength(v, "preferred_time", i.PreferredTime, 0, 50, false)

	if strings.TrimSpace(i.Email) != "" {
		validator.ValidateEmail(v, "email", i.Email)
	}

	validator.ValidatePhone(v, "phone", i.Phone, false)
	validator.ValidatePhone(v, "whatsapp", i.WhatsApp, false)

	v.Check(
		strings.TrimSpace(i.Email) != "" ||
			strings.TrimSpace(i.Phone) != "" ||
			strings.TrimSpace(i.WhatsApp) != "",
		"contact",
		"email, phone, or whatsapp is required",
	)

	if i.ConsultationType != "" {
		v.Check(IsValidType(i.ConsultationType), "consultation_type", "consultation type is invalid")
	}

	if i.PreferredContactMethod != "" {
		v.Check(IsValidContactMethod(i.PreferredContactMethod), "preferred_contact_method", "preferred contact method must be email, phone, or whatsapp")
	}

	if i.Priority != "" {
		v.Check(IsValidPriority(i.Priority), "priority", "priority must be low, normal, high, or urgent")
	}

	return v.Errors()
}

func (i UpdateConsultationInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "full_name", i.FullName, 2, 150, true)
	validator.ValidateStringLength(v, "company_name", i.CompanyName, 0, 150, false)
	validator.ValidateStringLength(v, "subject", i.Subject, 2, 200, true)
	validator.ValidateStringLength(v, "message", i.Message, 5, 5000, true)
	validator.ValidateStringLength(v, "preferred_time", i.PreferredTime, 0, 50, false)
	validator.ValidateStringLength(v, "assigned_to_user_id", i.AssignedToUserID, 0, 100, false)
	validator.ValidateStringLength(v, "handled_by_user_id", i.HandledByUserID, 0, 100, false)
	validator.ValidateStringLength(v, "admin_notes", i.AdminNotes, 0, 5000, false)
	validator.ValidateStringLength(v, "follow_up_notes", i.FollowUpNotes, 0, 5000, false)

	if strings.TrimSpace(i.Email) != "" {
		validator.ValidateEmail(v, "email", i.Email)
	}

	validator.ValidatePhone(v, "phone", i.Phone, false)
	validator.ValidatePhone(v, "whatsapp", i.WhatsApp, false)

	v.Check(
		strings.TrimSpace(i.Email) != "" ||
			strings.TrimSpace(i.Phone) != "" ||
			strings.TrimSpace(i.WhatsApp) != "",
		"contact",
		"email, phone, or whatsapp is required",
	)

	if i.ConsultationType != "" {
		v.Check(IsValidType(i.ConsultationType), "consultation_type", "consultation type is invalid")
	}

	if i.PreferredContactMethod != "" {
		v.Check(IsValidContactMethod(i.PreferredContactMethod), "preferred_contact_method", "preferred contact method must be email, phone, or whatsapp")
	}

	if i.Priority != "" {
		v.Check(IsValidPriority(i.Priority), "priority", "priority must be low, normal, high, or urgent")
	}

	return v.Errors()
}

func (i UpdateStatusInput) Validate() validator.Errors {
	v := validator.New()

	v.Check(IsValidStatus(i.Status), "status", "status is invalid")
	validator.ValidateStringLength(v, "assigned_to_user_id", i.AssignedToUserID, 0, 100, false)
	validator.ValidateStringLength(v, "handled_by_user_id", i.HandledByUserID, 0, 100, false)
	validator.ValidateStringLength(v, "admin_notes", i.AdminNotes, 0, 5000, false)
	validator.ValidateStringLength(v, "follow_up_notes", i.FollowUpNotes, 0, 5000, false)

	return v.Errors()
}

func (f ListConsultationsFilter) Normalize() ListConsultationsFilter {
	f.Status = NormalizeStatus(f.Status)
	f.Priority = NormalizePriority(f.Priority)
	f.ConsultationType = NormalizeType(f.ConsultationType)
	f.AssignedToUserID = strings.TrimSpace(f.AssignedToUserID)
	f.HandledByUserID = strings.TrimSpace(f.HandledByUserID)
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

func (f ListConsultationsFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}

func NormalizeCreateInput(input CreateConsultationInput) CreateConsultationInput {
	input.FullName = strings.TrimSpace(input.FullName)
	input.Email = validator.NormalizeEmail(input.Email)
	input.Phone = strings.TrimSpace(input.Phone)
	input.WhatsApp = strings.TrimSpace(input.WhatsApp)
	input.CompanyName = strings.TrimSpace(input.CompanyName)
	input.Subject = strings.TrimSpace(input.Subject)
	input.Message = strings.TrimSpace(input.Message)
	input.ConsultationType = NormalizeType(input.ConsultationType)
	input.PreferredContactMethod = NormalizeContactMethod(input.PreferredContactMethod)
	input.PreferredTime = strings.TrimSpace(input.PreferredTime)
	input.Priority = NormalizePriority(input.Priority)

	if input.ConsultationType == "" {
		input.ConsultationType = TypeGeneral
	}

	if input.PreferredContactMethod == "" {
		input.PreferredContactMethod = ContactMethodPhone
	}

	if input.Priority == "" {
		input.Priority = PriorityNormal
	}

	return input
}

func NormalizeUpdateInput(input UpdateConsultationInput) UpdateConsultationInput {
	input.FullName = strings.TrimSpace(input.FullName)
	input.Email = validator.NormalizeEmail(input.Email)
	input.Phone = strings.TrimSpace(input.Phone)
	input.WhatsApp = strings.TrimSpace(input.WhatsApp)
	input.CompanyName = strings.TrimSpace(input.CompanyName)
	input.Subject = strings.TrimSpace(input.Subject)
	input.Message = strings.TrimSpace(input.Message)
	input.ConsultationType = NormalizeType(input.ConsultationType)
	input.PreferredContactMethod = NormalizeContactMethod(input.PreferredContactMethod)
	input.PreferredTime = strings.TrimSpace(input.PreferredTime)
	input.Priority = NormalizePriority(input.Priority)
	input.AssignedToUserID = strings.TrimSpace(input.AssignedToUserID)
	input.HandledByUserID = strings.TrimSpace(input.HandledByUserID)
	input.AdminNotes = strings.TrimSpace(input.AdminNotes)
	input.FollowUpNotes = strings.TrimSpace(input.FollowUpNotes)

	if input.ConsultationType == "" {
		input.ConsultationType = TypeGeneral
	}

	if input.PreferredContactMethod == "" {
		input.PreferredContactMethod = ContactMethodPhone
	}

	if input.Priority == "" {
		input.Priority = PriorityNormal
	}

	return input
}

func NormalizeType(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func NormalizeStatus(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func NormalizePriority(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func NormalizeContactMethod(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func IsValidType(value string) bool {
	switch NormalizeType(value) {
	case TypeGeneral,
		TypeAccounting,
		TypeTax,
		TypeAudit,
		TypeBusinessAdvisory,
		TypeLegal,
		TypeOther:
		return true
	default:
		return false
	}
}

func IsValidStatus(value string) bool {
	switch NormalizeStatus(value) {
	case StatusNew,
		StatusContacted,
		StatusScheduled,
		StatusInProgress,
		StatusClosed,
		StatusCancelled:
		return true
	default:
		return false
	}
}

func IsValidPriority(value string) bool {
	switch NormalizePriority(value) {
	case PriorityLow, PriorityNormal, PriorityHigh, PriorityUrgent:
		return true
	default:
		return false
	}
}

func IsValidContactMethod(value string) bool {
	switch NormalizeContactMethod(value) {
	case ContactMethodEmail, ContactMethodPhone, ContactMethodWhatsApp:
		return true
	default:
		return false
	}
}
