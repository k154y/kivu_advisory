package staff

import (
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

const (
	DefaultPageSize = 20
	MaxPageSize     = 100
)

type StaffMember struct {
	ID                         string
	FullName                   string
	Slug                       string
	RoleTitle                  string
	ShortDescription           string
	Bio                        string
	EducationBackground        string
	WorkExperience             string
	ProfessionalCertifications string
	Email                      string
	Phone                      string
	PhotoURL                   string
	ShowOnWebsite              bool
	ShowOnHomepage             bool
	ShowBio                    bool
	ShowEducation              bool
	ShowWorkExperience         bool
	ShowCertifications         bool
	ShowContact                bool
	DisplayOrder               int
	IsActive                   bool
	CreatedByUserID            string
	UpdatedByUserID            string
	CreatedAt                  time.Time
	UpdatedAt                  time.Time
}

type PublicStaffMember struct {
	ID                         string    `json:"id"`
	FullName                   string    `json:"full_name"`
	Slug                       string    `json:"slug"`
	RoleTitle                  string    `json:"role_title"`
	ShortDescription           string    `json:"short_description,omitempty"`
	Bio                        string    `json:"bio,omitempty"`
	EducationBackground        string    `json:"education_background,omitempty"`
	WorkExperience             string    `json:"work_experience,omitempty"`
	ProfessionalCertifications string    `json:"professional_certifications,omitempty"`
	Email                      string    `json:"email,omitempty"`
	Phone                      string    `json:"phone,omitempty"`
	PhotoURL                   string    `json:"photo_url,omitempty"`
	DisplayOrder               int       `json:"display_order"`
	CreatedAt                  time.Time `json:"created_at"`
	UpdatedAt                  time.Time `json:"updated_at"`
}

type AdminStaffMember struct {
	ID                         string    `json:"id"`
	FullName                   string    `json:"full_name"`
	Slug                       string    `json:"slug"`
	RoleTitle                  string    `json:"role_title"`
	ShortDescription           string    `json:"short_description,omitempty"`
	Bio                        string    `json:"bio,omitempty"`
	EducationBackground        string    `json:"education_background,omitempty"`
	WorkExperience             string    `json:"work_experience,omitempty"`
	ProfessionalCertifications string    `json:"professional_certifications,omitempty"`
	Email                      string    `json:"email,omitempty"`
	Phone                      string    `json:"phone,omitempty"`
	PhotoURL                   string    `json:"photo_url,omitempty"`
	ShowOnWebsite              bool      `json:"show_on_website"`
	ShowOnHomepage             bool      `json:"show_on_homepage"`
	ShowBio                    bool      `json:"show_bio"`
	ShowEducation              bool      `json:"show_education"`
	ShowWorkExperience         bool      `json:"show_work_experience"`
	ShowCertifications         bool      `json:"show_certifications"`
	ShowContact                bool      `json:"show_contact"`
	DisplayOrder               int       `json:"display_order"`
	IsActive                   bool      `json:"is_active"`
	CreatedByUserID            string    `json:"created_by_user_id,omitempty"`
	UpdatedByUserID            string    `json:"updated_by_user_id,omitempty"`
	CreatedAt                  time.Time `json:"created_at"`
	UpdatedAt                  time.Time `json:"updated_at"`
}

type CreateStaffMemberInput struct {
	FullName                   string
	Slug                       string
	RoleTitle                  string
	ShortDescription           string
	Bio                        string
	EducationBackground        string
	WorkExperience             string
	ProfessionalCertifications string
	Email                      string
	Phone                      string
	PhotoURL                   string
	ShowOnWebsite              bool
	ShowOnHomepage             bool
	ShowBio                    bool
	ShowEducation              bool
	ShowWorkExperience         bool
	ShowCertifications         bool
	ShowContact                bool
	DisplayOrder               int
	IsActive                   bool
	CreatedByUserID            string
}

type UpdateStaffMemberInput struct {
	FullName                   string
	Slug                       string
	RoleTitle                  string
	ShortDescription           string
	Bio                        string
	EducationBackground        string
	WorkExperience             string
	ProfessionalCertifications string
	Email                      string
	Phone                      string
	PhotoURL                   string
	ShowOnWebsite              bool
	ShowOnHomepage             bool
	ShowBio                    bool
	ShowEducation              bool
	ShowWorkExperience         bool
	ShowCertifications         bool
	ShowContact                bool
	DisplayOrder               int
	IsActive                   bool
	UpdatedByUserID            string
}

type UpdateStatusInput struct {
	IsActive      bool `json:"is_active"`
	ShowOnWebsite bool `json:"show_on_website"`
	ShowOnHomepage bool `json:"show_on_homepage"`
}

type ListStaffMembersFilter struct {
	Search         string
	ShowOnWebsite  *bool
	ShowOnHomepage *bool
	IsActive       *bool
	Page           int
	PageSize       int
}

func (s StaffMember) Public() PublicStaffMember {
	item := PublicStaffMember{
		ID:               s.ID,
		FullName:         s.FullName,
		Slug:             s.Slug,
		RoleTitle:        s.RoleTitle,
		ShortDescription: s.ShortDescription,
		PhotoURL:         s.PhotoURL,
		DisplayOrder:     s.DisplayOrder,
		CreatedAt:        s.CreatedAt,
		UpdatedAt:        s.UpdatedAt,
	}

	if s.ShowBio {
		item.Bio = s.Bio
	}

	if s.ShowEducation {
		item.EducationBackground = s.EducationBackground
	}

	if s.ShowWorkExperience {
		item.WorkExperience = s.WorkExperience
	}

	if s.ShowCertifications {
		item.ProfessionalCertifications = s.ProfessionalCertifications
	}

	if s.ShowContact {
		item.Email = s.Email
		item.Phone = s.Phone
	}

	return item
}

func (s StaffMember) Admin() AdminStaffMember {
	return AdminStaffMember{
		ID:                         s.ID,
		FullName:                   s.FullName,
		Slug:                       s.Slug,
		RoleTitle:                  s.RoleTitle,
		ShortDescription:           s.ShortDescription,
		Bio:                        s.Bio,
		EducationBackground:        s.EducationBackground,
		WorkExperience:             s.WorkExperience,
		ProfessionalCertifications: s.ProfessionalCertifications,
		Email:                      s.Email,
		Phone:                      s.Phone,
		PhotoURL:                   s.PhotoURL,
		ShowOnWebsite:              s.ShowOnWebsite,
		ShowOnHomepage:             s.ShowOnHomepage,
		ShowBio:                    s.ShowBio,
		ShowEducation:              s.ShowEducation,
		ShowWorkExperience:         s.ShowWorkExperience,
		ShowCertifications:         s.ShowCertifications,
		ShowContact:                s.ShowContact,
		DisplayOrder:               s.DisplayOrder,
		IsActive:                   s.IsActive,
		CreatedByUserID:            s.CreatedByUserID,
		UpdatedByUserID:            s.UpdatedByUserID,
		CreatedAt:                  s.CreatedAt,
		UpdatedAt:                  s.UpdatedAt,
	}
}

func PublicStaffMembers(items []StaffMember) []PublicStaffMember {
	result := make([]PublicStaffMember, 0, len(items))

	for _, item := range items {
		result = append(result, item.Public())
	}

	return result
}

func AdminStaffMembers(items []StaffMember) []AdminStaffMember {
	result := make([]AdminStaffMember, 0, len(items))

	for _, item := range items {
		result = append(result, item.Admin())
	}

	return result
}

func (i CreateStaffMemberInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "full_name", i.FullName, 2, 150, true)
	validator.ValidateSlug(v, "slug", i.Slug, true)
	validator.ValidateStringLength(v, "role_title", i.RoleTitle, 2, 150, true)
	validator.ValidateStringLength(v, "short_description", i.ShortDescription, 0, 300, false)
	validator.ValidateStringLength(v, "bio", i.Bio, 0, 10000, false)
	validator.ValidateStringLength(v, "education_background", i.EducationBackground, 0, 10000, false)
	validator.ValidateStringLength(v, "work_experience", i.WorkExperience, 0, 10000, false)
	validator.ValidateStringLength(v, "professional_certifications", i.ProfessionalCertifications, 0, 10000, false)
	validator.ValidateStringLength(v, "email", i.Email, 0, 255, false)
	validator.ValidateStringLength(v, "phone", i.Phone, 0, 50, false)
	validator.ValidateStringLength(v, "photo_url", i.PhotoURL, 0, 1000, false)

	if i.Email != "" {
		validator.ValidateEmail(v, "email", i.Email)
	}

	v.Check(i.DisplayOrder >= 0, "display_order", "display order must be zero or greater")

	return v.Errors()
}

func (i UpdateStaffMemberInput) Validate() validator.Errors {
	return CreateStaffMemberInput{
		FullName:                   i.FullName,
		Slug:                       i.Slug,
		RoleTitle:                  i.RoleTitle,
		ShortDescription:           i.ShortDescription,
		Bio:                        i.Bio,
		EducationBackground:        i.EducationBackground,
		WorkExperience:             i.WorkExperience,
		ProfessionalCertifications: i.ProfessionalCertifications,
		Email:                      i.Email,
		Phone:                      i.Phone,
		PhotoURL:                   i.PhotoURL,
		DisplayOrder:               i.DisplayOrder,
	}.Validate()
}

func NormalizeCreateInput(input CreateStaffMemberInput) CreateStaffMemberInput {
	input.FullName = strings.TrimSpace(input.FullName)
	input.Slug = validator.NormalizeSlug(input.Slug)
	input.RoleTitle = strings.TrimSpace(input.RoleTitle)
	input.ShortDescription = strings.TrimSpace(input.ShortDescription)
	input.Bio = strings.TrimSpace(input.Bio)
	input.EducationBackground = strings.TrimSpace(input.EducationBackground)
	input.WorkExperience = strings.TrimSpace(input.WorkExperience)
	input.ProfessionalCertifications = strings.TrimSpace(input.ProfessionalCertifications)
	input.Email = strings.TrimSpace(strings.ToLower(input.Email))
	input.Phone = strings.TrimSpace(input.Phone)
	input.PhotoURL = strings.TrimSpace(input.PhotoURL)
	input.CreatedByUserID = strings.TrimSpace(input.CreatedByUserID)

	if input.Slug == "" {
		input.Slug = validator.NormalizeSlug(input.FullName)
	}

	return input
}

func NormalizeUpdateInput(input UpdateStaffMemberInput) UpdateStaffMemberInput {
	input.FullName = strings.TrimSpace(input.FullName)
	input.Slug = validator.NormalizeSlug(input.Slug)
	input.RoleTitle = strings.TrimSpace(input.RoleTitle)
	input.ShortDescription = strings.TrimSpace(input.ShortDescription)
	input.Bio = strings.TrimSpace(input.Bio)
	input.EducationBackground = strings.TrimSpace(input.EducationBackground)
	input.WorkExperience = strings.TrimSpace(input.WorkExperience)
	input.ProfessionalCertifications = strings.TrimSpace(input.ProfessionalCertifications)
	input.Email = strings.TrimSpace(strings.ToLower(input.Email))
	input.Phone = strings.TrimSpace(input.Phone)
	input.PhotoURL = strings.TrimSpace(input.PhotoURL)
	input.UpdatedByUserID = strings.TrimSpace(input.UpdatedByUserID)

	if input.Slug == "" {
		input.Slug = validator.NormalizeSlug(input.FullName)
	}

	return input
}

func (f ListStaffMembersFilter) Normalize() ListStaffMembersFilter {
	f.Search = strings.TrimSpace(f.Search)

	if f.Page <= 0 {
		f.Page = 1
	}

	if f.PageSize <= 0 {
		f.PageSize = DefaultPageSize
	}

	if f.PageSize > MaxPageSize {
		f.PageSize = MaxPageSize
	}

	return f
}

func (f ListStaffMembersFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}