package dashboard

import (
	"errors"
	"net/http"

	"github.com/kyves/kivu-advisory/backend/internal/accountant"
	"github.com/kyves/kivu-advisory/backend/internal/client"
	"github.com/kyves/kivu-advisory/backend/internal/consultation"
	"github.com/kyves/kivu-advisory/backend/internal/servicerequest"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

var serviceRequestStatuses = []string{
	"new",
	"pending",
	"in_review",
	"waiting_client",
	"in_progress",
	"completed",
	"cancelled",
}

var consultationStatuses = []string{
	"new",
	"contacted",
	"scheduled",
	"in_progress",
	"closed",
	"cancelled",
}

type Handler struct {
	serviceRequestService *servicerequest.Service
	consultationService   *consultation.Service
	clientService         *client.Service
	accountantService     *accountant.Service
}

func NewHandler(
	serviceRequestService *servicerequest.Service,
	consultationService *consultation.Service,
	clientService *client.Service,
	accountantService *accountant.Service,
) *Handler {
	return &Handler{
		serviceRequestService: serviceRequestService,
		consultationService:   consultationService,
		clientService:         clientService,
		accountantService:     accountantService,
	}
}

func (h *Handler) AdminStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	ctx := r.Context()

	requestCounts, err := h.serviceRequestService.CountByStatus(ctx)
	if err != nil {
		respondError(w, err)
		return
	}

	consultationCounts, err := h.consultationService.CountByStatus(ctx)
	if err != nil {
		respondError(w, err)
		return
	}

	_, totalClients, err := h.clientService.List(ctx, client.ListClientsFilter{PageSize: 1})
	if err != nil {
		respondError(w, err)
		return
	}

	_, totalAccountants, err := h.accountantService.ListAdmin(ctx, accountant.ListAccountantsFilter{PageSize: 1})
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "dashboard statistics retrieved successfully", map[string]any{
		"service_requests": map[string]any{
			"total":     sumCounts(requestCounts),
			"by_status": fillCounts(requestCounts, serviceRequestStatuses),
		},
		"consultations": map[string]any{
			"total":     sumCounts(consultationCounts),
			"by_status": fillCounts(consultationCounts, consultationStatuses),
		},
		"clients": map[string]any{
			"total": totalClients,
		},
		"accountants": map[string]any{
			"total": totalAccountants,
		},
	})
}

func sumCounts(counts map[string]int) int {
	total := 0

	for _, count := range counts {
		total += count
	}

	return total
}

func fillCounts(counts map[string]int, knownStatuses []string) map[string]int {
	result := make(map[string]int, len(knownStatuses))

	for _, status := range knownStatuses {
		result[status] = counts[status]
	}

	return result
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
