package staff

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

const maxStaffRequestBodyBytes = 1 << 20

type Handler struct {
	service *Service
}

type staffMemberRequest struct {
	FullName                   string `json:"full_name"`
	Slug                       string `json:"slug"`
	RoleTitle                  string `json:"role_title"`
	ShortDescription           string `json:"short_description"`
	Bio                        string `json:"bio"`
	EducationBackground        string `json:"education_background"`
	WorkExperience             string `json:"work_experience"`
	ProfessionalCertifications string `json:"professional_certifications"`
	Email                      string `json:"email"`
	Phone                      string `json:"phone"`
	PhotoURL                   string `json:"photo_url"`
	ShowOnWebsite              bool   `json:"show_on_website"`
	ShowOnHomepage             bool   `json:"show_on_homepage"`
	ShowBio                    bool   `json:"show_bio"`
	ShowEducation              bool   `json:"show_education"`
	ShowWorkExperience         bool   `json:"show_work_experience"`
	ShowCertifications         bool   `json:"show_certifications"`
	ShowContact                bool   `json:"show_contact"`
	DisplayOrder               int    `json:"display_order"`
	IsActive                   bool   `json:"is_active"`
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) PublicStaff(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	query := r.URL.Query()

	filter := ListStaffMembersFilter{
		Search:   query.Get("search"),
		Page:     parsePositiveInt(query.Get("page"), 1),
		PageSize: parsePositiveInt(query.Get("page_size"), DefaultPageSize),
	}

	homepageOnly := parseBoolDefault(query.Get("homepage"), false)

	var (
		items      []PublicStaffMember
		totalItems int
		err        error
	)

	if homepageOnly {
		items, totalItems, err = h.service.ListHomepage(r.Context(), filter)
	} else {
		items, totalItems, err = h.service.ListPublic(r.Context(), filter)
	}

	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "staff members retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) PublicStaffDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	slug := strings.TrimSpace(r.URL.Query().Get("slug"))
	if slug == "" {
		response.BadRequest(w, "staff member slug is required", nil)
		return
	}

	item, err := h.service.GetPublicBySlug(r.Context(), slug)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "staff member retrieved successfully", item)
}

func (h *Handler) AdminStaff(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.listAdminStaff(w, r)
	case http.MethodPost:
		h.createAdminStaff(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) AdminStaffDetail(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.getAdminStaffByID(w, r)
	case http.MethodPut:
		h.updateAdminStaff(w, r)
	case http.MethodDelete:
		h.deleteAdminStaff(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) AdminStaffStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		response.MethodNotAllowed(w)
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "staff member id is required", nil)
		return
	}

	var request UpdateStatusInput
	if err := readJSON(w, r, &request); err != nil {
		respondError(w, err)
		return
	}

	item, err := h.service.UpdateStatusAdmin(r.Context(), id, request)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "staff member status updated successfully", item)
}

func (h *Handler) listAdminStaff(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	filter := ListStaffMembersFilter{
		Search:         query.Get("search"),
		ShowOnWebsite:  parseOptionalBool(query.Get("show_on_website")),
		ShowOnHomepage: parseOptionalBool(query.Get("show_on_homepage")),
		IsActive:       parseOptionalBool(query.Get("is_active")),
		Page:           parsePositiveInt(query.Get("page"), 1),
		PageSize:       parsePositiveInt(query.Get("page_size"), DefaultPageSize),
	}

	items, totalItems, err := h.service.ListAdmin(r.Context(), filter)
	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "admin staff members retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) createAdminStaff(w http.ResponseWriter, r *http.Request) {
	var request staffMemberRequest
	if err := readJSON(w, r, &request); err != nil {
		respondError(w, err)
		return
	}

	userID := middleware.UserIDFromContext(r.Context())

	item, err := h.service.CreateAdmin(r.Context(), CreateStaffMemberInput{
		FullName:                   request.FullName,
		Slug:                       request.Slug,
		RoleTitle:                  request.RoleTitle,
		ShortDescription:           request.ShortDescription,
		Bio:                        request.Bio,
		EducationBackground:        request.EducationBackground,
		WorkExperience:             request.WorkExperience,
		ProfessionalCertifications: request.ProfessionalCertifications,
		Email:                      request.Email,
		Phone:                      request.Phone,
		PhotoURL:                   request.PhotoURL,
		ShowOnWebsite:              request.ShowOnWebsite,
		ShowOnHomepage:             request.ShowOnHomepage,
		ShowBio:                    request.ShowBio,
		ShowEducation:              request.ShowEducation,
		ShowWorkExperience:         request.ShowWorkExperience,
		ShowCertifications:         request.ShowCertifications,
		ShowContact:                request.ShowContact,
		DisplayOrder:               request.DisplayOrder,
		IsActive:                   request.IsActive,
		CreatedByUserID:            userID,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	response.Created(w, "staff member created successfully", item)
}

func (h *Handler) getAdminStaffByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "staff member id is required", nil)
		return
	}

	item, err := h.service.GetAdminByID(r.Context(), id)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "staff member retrieved successfully", item)
}

func (h *Handler) updateAdminStaff(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "staff member id is required", nil)
		return
	}

	var request staffMemberRequest
	if err := readJSON(w, r, &request); err != nil {
		respondError(w, err)
		return
	}

	userID := middleware.UserIDFromContext(r.Context())

	item, err := h.service.UpdateAdmin(r.Context(), id, UpdateStaffMemberInput{
		FullName:                   request.FullName,
		Slug:                       request.Slug,
		RoleTitle:                  request.RoleTitle,
		ShortDescription:           request.ShortDescription,
		Bio:                        request.Bio,
		EducationBackground:        request.EducationBackground,
		WorkExperience:             request.WorkExperience,
		ProfessionalCertifications: request.ProfessionalCertifications,
		Email:                      request.Email,
		Phone:                      request.Phone,
		PhotoURL:                   request.PhotoURL,
		ShowOnWebsite:              request.ShowOnWebsite,
		ShowOnHomepage:             request.ShowOnHomepage,
		ShowBio:                    request.ShowBio,
		ShowEducation:              request.ShowEducation,
		ShowWorkExperience:         request.ShowWorkExperience,
		ShowCertifications:         request.ShowCertifications,
		ShowContact:                request.ShowContact,
		DisplayOrder:               request.DisplayOrder,
		IsActive:                   request.IsActive,
		UpdatedByUserID:            userID,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "staff member updated successfully", item)
}

func (h *Handler) deleteAdminStaff(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "staff member id is required", nil)
		return
	}

	if err := h.service.DeleteAdmin(r.Context(), id); err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "staff member deleted successfully", map[string]string{
		"id": id,
	})
}

func readJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxStaffRequestBodyBytes)
	defer r.Body.Close()

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(destination); err != nil {
		if errors.Is(err, io.EOF) {
			return apperrors.InvalidInput("request body is required")
		}

		return apperrors.InvalidInput("invalid request body")
	}

	return nil
}

func parsePositiveInt(value string, fallback int) int {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}

	parsedValue, err := strconv.Atoi(value)
	if err != nil || parsedValue <= 0 {
		return fallback
	}

	return parsedValue
}

func parseOptionalBool(value string) *bool {
	value = strings.TrimSpace(strings.ToLower(value))
	if value == "" {
		return nil
	}

	parsed := value == "true" || value == "1" || value == "yes"

	return &parsed
}

func parseBoolDefault(value string, fallback bool) bool {
	value = strings.TrimSpace(strings.ToLower(value))
	if value == "" {
		return fallback
	}

	return value == "true" || value == "1" || value == "yes"
}

func totalPages(totalItems int, pageSize int) int {
	if pageSize <= 0 || totalItems <= 0 {
		return 0
	}

	return (totalItems + pageSize - 1) / pageSize
}

func respondError(w http.ResponseWriter, err error) {
	if err == nil {
		return
	}

	var appErr *apperrors.AppError
	if errors.As(err, &appErr) {
		response.Error(w, appErr.StatusCode, appErr.Code, appErr.Message, appErr.Details)
		return
	}

	response.InternalServerError(w)
}
