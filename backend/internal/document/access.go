package document

import (
	"context"
	"strings"

	assignmentpkg "github.com/kyves/kivu-advisory/backend/internal/assignment"
	servicerequestpkg "github.com/kyves/kivu-advisory/backend/internal/servicerequest"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type AccessChecker struct {
	serviceRequests servicerequestpkg.Repository
	assignments     assignmentpkg.Repository
}

func NewAccessChecker(
	serviceRequests servicerequestpkg.Repository,
	assignments assignmentpkg.Repository,
) *AccessChecker {
	return &AccessChecker{
		serviceRequests: serviceRequests,
		assignments:     assignments,
	}
}

func (c *AccessChecker) ClientCanAccessServiceRequest(ctx context.Context, clientID string, serviceRequestID string) (bool, error) {
	if c == nil || c.serviceRequests == nil {
		return false, apperrors.Internal("document access checker is not initialized")
	}

	clientID = strings.TrimSpace(clientID)
	serviceRequestID = strings.TrimSpace(serviceRequestID)

	if clientID == "" {
		return false, apperrors.InvalidInput("client id is required")
	}

	if serviceRequestID == "" {
		return false, apperrors.InvalidInput("service request id is required")
	}

	foundRequest, err := c.serviceRequests.FindByID(ctx, serviceRequestID)
	if err != nil {
		return false, err
	}

	return strings.TrimSpace(foundRequest.ClientID) == clientID, nil
}

func (c *AccessChecker) AccountantCanAccessServiceRequest(ctx context.Context, accountantUserID string, serviceRequestID string) (bool, error) {
	if c == nil || c.serviceRequests == nil || c.assignments == nil {
		return false, apperrors.Internal("document access checker is not initialized")
	}

	accountantUserID = strings.TrimSpace(accountantUserID)
	serviceRequestID = strings.TrimSpace(serviceRequestID)

	if accountantUserID == "" {
		return false, apperrors.InvalidInput("accountant user id is required")
	}

	if serviceRequestID == "" {
		return false, apperrors.InvalidInput("service request id is required")
	}

	if _, err := c.serviceRequests.FindByID(ctx, serviceRequestID); err != nil {
		return false, err
	}

	assignments, _, err := c.assignments.List(ctx, assignmentpkg.ListAssignmentsFilter{
		ServiceRequestID: serviceRequestID,
		AccountantUserID: accountantUserID,
		Page:             1,
		PageSize:         100,
	})
	if err != nil {
		return false, err
	}

	for _, item := range assignments {
		if strings.TrimSpace(item.AccountantUserID) != accountantUserID {
			continue
		}

		if strings.TrimSpace(item.ServiceRequestID) != serviceRequestID {
			continue
		}

		if assignmentpkg.NormalizeStatus(item.Status) == assignmentpkg.StatusCancelled {
			continue
		}

		return true, nil
	}

	return false, nil
}
