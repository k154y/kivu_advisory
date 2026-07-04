package consultation

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

type publicConsultationRequest struct {
	FullName               string `json:"full_name"`
	Email                  string `json:"email"`
	Phone                  string `json:"phone"`
	WhatsApp               string `json:"whatsapp"`
	CompanyName            string `json:"company_name"`
	Subject                string `json:"subject"`
	Message                string `json:"message"`
	ConsultationType       string `json:"consultation_type"`
	PreferredContactMethod string `json:"preferred_contact_method"`
	PreferredDate          string `json:"preferred_date"`
	PreferredTime          string `json:"preferred_time"`
	Priority               string `json:"priority"`
}

type adminConsultationUpdateRequest struct {
	FullName               string `json:"full_name"`
	Email                  string `json:"email"`
	Phone                  string `json:"phone"`
	WhatsApp               string `json:"whatsapp"`
	CompanyName            string `json:"company_name"`
	Subject                string `json:"subject"`
	Message                string `json:"message"`
	ConsultationType       string `json:"consultation_type"`
	PreferredContactMethod string `json:"preferred_contact_method"`
	PreferredDate          string `json:"preferred_date"`
	PreferredTime          string `json:"preferred_time"`
	Priority               string `json:"priority"`
	AssignedToUserID       string `json:"assigned_to_user_id"`
	HandledByUserID        string `json:"handled_by_user_id"`
	AdminNotes             string `json:"admin_notes"`
	FollowUpNotes          string `json:"follow_up_notes"`
}

type consultationStatusRequest struct {
	Status           string `json:"status"`
	AssignedToUserID string `json:"assigned_to_user_id"`
	HandledByUserID  string `json:"handled_by_user_id"`
	AdminNotes        string `json:"admin_notes"`
	FollowUpNotes     string `json:"follow_up_notes"`
}

func (h *Handler) PublicConsultations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.MethodNotAllowed(w)
		return
	}

	var request publicConsultationRequest
	if err := readJSON(w, r, &request); err != nil {
		response.BadRequest(w, "invalid request body", map[string]string{
			"body": err.Error(),
		})
		return
	}

	input, err := request.toCreateInput()
	if err != nil {
		response.BadRequest(w, err.Error(), nil)
		return
	}

	createdConsultation, err := h.service.CreateWebsite(r.Context(), input)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "consultation request submitted successfully", createdConsultation)
}

func (h *Handler) AdminConsultations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	h.listAdminConsultations(w, r)
}

func (h *Handler) AdminConsultationDetail(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.getAdminConsultationByID(w, r)
	case http.MethodPut:
		h.updateAdminConsultation(w, r)
	case http.MethodDelete:
		h.deleteAdminConsultation(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) AdminConsultationStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		response.MethodNotAllowed(w)
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "consultation id is required", nil)
		return
	}

	var request consultationStatusRequest
	if err := readJSON(w, r, &request); err != nil {
		response.BadRequest(w, "invalid request body", map[string]string{
			"body": err.Error(),
		})
		return
	}

	updatedConsultation, err := h.service.UpdateStatusAdmin(r.Context(), id, UpdateStatusInput{
		Status:           request.Status,
		AssignedToUserID: request.AssignedToUserID,
		HandledByUserID:  request.HandledByUserID,
		AdminNotes:       request.AdminNotes,
		FollowUpNotes:    request.FollowUpNotes,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "consultation status updated successfully", updatedConsultation)
}

func (h *Handler) listAdminConsultations(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	filter := ListConsultationsFilter{
		Status:           query.Get("status"),
		Priority:         query.Get("priority"),
		ConsultationType: query.Get("consultation_type"),
		AssignedToUserID: query.Get("assigned_to_user_id"),
		HandledByUserID:  query.Get("handled_by_user_id"),
		Search:           query.Get("search"),
		Page:             parsePositiveInt(query.Get("page"), 1),
		PageSize:         parsePositiveInt(query.Get("page_size"), 20),
	}

	consultations, totalItems, err := h.service.ListAdmin(r.Context(), filter)
	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "consultations retrieved successfully", map[string]any{
		"items": consultations,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
		},
	})
}

func (h *Handler) getAdminConsultationByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "consultation id is required", nil)
		return
	}

	foundConsultation, err := h.service.GetAdminByID(r.Context(), id)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "consultation retrieved successfully", foundConsultation)
}

func (h *Handler) updateAdminConsultation(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "consultation id is required", nil)
		return
	}

	var request adminConsultationUpdateRequest
	if err := readJSON(w, r, &request); err != nil {
		response.BadRequest(w, "invalid request body", map[string]string{
			"body": err.Error(),
		})
		return
	}

	input, err := request.toUpdateInput()
	if err != nil {
		response.BadRequest(w, err.Error(), nil)
		return
	}

	updatedConsultation, err := h.service.UpdateAdmin(r.Context(), id, input)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "consultation updated successfully", updatedConsultation)
}

func (h *Handler) deleteAdminConsultation(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "consultation id is required", nil)
		return
	}

	if err := h.service.DeleteAdmin(r.Context(), id); err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "consultation deleted successfully", nil)
}

func (r publicConsultationRequest) toCreateInput() (CreateConsultationInput, error) {
	preferredDate, err := parseOptionalDate(r.PreferredDate)
	if err != nil {
		return CreateConsultationInput{}, err
	}

	return CreateConsultationInput{
		FullName:               r.FullName,
		Email:                  r.Email,
		Phone:                  r.Phone,
		WhatsApp:               r.WhatsApp,
		CompanyName:            r.CompanyName,
		Subject:                r.Subject,
		Message:                r.Message,
		ConsultationType:       r.ConsultationType,
		PreferredContactMethod: r.PreferredContactMethod,
		PreferredDate:          preferredDate,
		PreferredTime:          r.PreferredTime,
		Priority:               r.Priority,
	}, nil
}

func (r adminConsultationUpdateRequest) toUpdateInput() (UpdateConsultationInput, error) {
	preferredDate, err := parseOptionalDate(r.PreferredDate)
	if err != nil {
		return UpdateConsultationInput{}, err
	}

	return UpdateConsultationInput{
		FullName:               r.FullName,
		Email:                  r.Email,
		Phone:                  r.Phone,
		WhatsApp:               r.WhatsApp,
		CompanyName:            r.CompanyName,
		Subject:                r.Subject,
		Message:                r.Message,
		ConsultationType:       r.ConsultationType,
		PreferredContactMethod: r.PreferredContactMethod,
		PreferredDate:          preferredDate,
		PreferredTime:          r.PreferredTime,
		Priority:               r.Priority,
		AssignedToUserID:       r.AssignedToUserID,
		HandledByUserID:        r.HandledByUserID,
		AdminNotes:             r.AdminNotes,
		FollowUpNotes:          r.FollowUpNotes,
	}, nil
}

func parseOptionalDate(value string) (*time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}

	parsedDate, err := time.Parse("2006-01-02", value)
	if err != nil {
		return nil, errors.New("preferred_date must use format YYYY-MM-DD")
	}

	return &parsedDate, nil
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

func readJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	return decoder.Decode(destination)
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

	response.Error(w, http.StatusInternalServerError, "internal_error", "internal server error", nil)
}