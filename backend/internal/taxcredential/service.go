package taxcredential

import (
	"context"
	"net/http"
	"strings"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type Service struct {
	systemRepo     SystemRepository
	credentialRepo CredentialRepository
	encryptor       Encryptor
}

func NewService(
	systemRepo SystemRepository,
	credentialRepo CredentialRepository,
	encryptor Encryptor,
) *Service {
	return &Service{
		systemRepo:     systemRepo,
		credentialRepo: credentialRepo,
		encryptor:       encryptor,
	}
}

/*
SYSTEMS

Admin creates and manages the official systems:
- RRA Tax Portal
- RRA EBM
- other external tax-related systems

Client and accountant only read active systems.
*/

func (s *Service) ListPublicSystems(ctx context.Context, filter ListCredentialSystemsFilter) ([]PublicCredentialSystem, int, error) {
	if s == nil || s.systemRepo == nil {
		return nil, 0, apperrors.Internal("tax credential service is not initialized")
	}

	trueValue := true
	filter.IsActive = &trueValue

	items, totalItems, err := s.systemRepo.ListSystems(ctx, filter.Normalize())
	if err != nil {
		return nil, 0, err
	}

	return PublicCredentialSystems(items), totalItems, nil
}

func (s *Service) ListAdminSystems(ctx context.Context, filter ListCredentialSystemsFilter) ([]AdminCredentialSystem, int, error) {
	if s == nil || s.systemRepo == nil {
		return nil, 0, apperrors.Internal("tax credential service is not initialized")
	}

	items, totalItems, err := s.systemRepo.ListSystems(ctx, filter.Normalize())
	if err != nil {
		return nil, 0, err
	}

	return AdminCredentialSystems(items), totalItems, nil
}

func (s *Service) GetAdminSystemByID(ctx context.Context, id string) (*AdminCredentialSystem, error) {
	if s == nil || s.systemRepo == nil {
		return nil, apperrors.Internal("tax credential service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("tax credential system id is required")
	}

	item, err := s.systemRepo.FindSystemByID(ctx, id)
	if err != nil {
		return nil, err
	}

	adminItem := item.Admin()

	return &adminItem, nil
}

func (s *Service) CreateAdminSystem(ctx context.Context, input CreateCredentialSystemInput) (*AdminCredentialSystem, error) {
	if s == nil || s.systemRepo == nil {
		return nil, apperrors.Internal("tax credential service is not initialized")
	}

	input = NormalizeCreateSystemInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	item, err := s.systemRepo.CreateSystem(ctx, input)
	if err != nil {
		return nil, err
	}

	adminItem := item.Admin()

	return &adminItem, nil
}

func (s *Service) UpdateAdminSystem(ctx context.Context, id string, input UpdateCredentialSystemInput) (*AdminCredentialSystem, error) {
	if s == nil || s.systemRepo == nil {
		return nil, apperrors.Internal("tax credential service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("tax credential system id is required")
	}

	input = NormalizeUpdateSystemInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	item, err := s.systemRepo.UpdateSystem(ctx, id, input)
	if err != nil {
		return nil, err
	}

	adminItem := item.Admin()

	return &adminItem, nil
}

func (s *Service) UpdateAdminSystemStatus(ctx context.Context, id string, input UpdateSystemStatusInput) (*AdminCredentialSystem, error) {
	if s == nil || s.systemRepo == nil {
		return nil, apperrors.Internal("tax credential service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("tax credential system id is required")
	}

	item, err := s.systemRepo.UpdateSystemStatus(ctx, id, input)
	if err != nil {
		return nil, err
	}

	adminItem := item.Admin()

	return &adminItem, nil
}

func (s *Service) DeleteAdminSystem(ctx context.Context, id string) error {
	if s == nil || s.systemRepo == nil {
		return apperrors.Internal("tax credential service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("tax credential system id is required")
	}

	return s.systemRepo.DeleteSystem(ctx, id)
}

/*
CLIENT CREDENTIALS

Client creates credentials for systems created by admin.
The password is encrypted before saving.
The password is not returned in normal list/detail responses.
*/

func (s *Service) ListClientCredentials(ctx context.Context, clientUserID string, filter ListClientCredentialsFilter) ([]PublicClientTaxCredential, int, error) {
	if s == nil || s.credentialRepo == nil {
		return nil, 0, apperrors.Internal("tax credential service is not initialized")
	}

	clientID, err := s.clientIDFromUserID(ctx, clientUserID)
	if err != nil {
		return nil, 0, err
	}

	filter = filter.Normalize()
	filter.ClientID = clientID

	items, totalItems, err := s.credentialRepo.ListCredentials(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return PublicClientCredentials(items), totalItems, nil
}

func (s *Service) GetClientCredentialByID(ctx context.Context, clientUserID string, id string) (*PublicClientTaxCredential, error) {
	if s == nil || s.credentialRepo == nil {
		return nil, apperrors.Internal("tax credential service is not initialized")
	}

	clientID, err := s.clientIDFromUserID(ctx, clientUserID)
	if err != nil {
		return nil, err
	}

	item, err := s.credentialRepo.FindCredentialByID(ctx, strings.TrimSpace(id))
	if err != nil {
		return nil, err
	}

	if item.ClientID != clientID {
		return nil, forbidden("you do not have permission to access this credential")
	}

	publicItem := item.Public()

	return &publicItem, nil
}

func (s *Service) CreateClientCredential(ctx context.Context, clientUserID string, input CreateClientCredentialInput) (*PublicClientTaxCredential, error) {
	if s == nil || s.credentialRepo == nil || s.encryptor == nil {
		return nil, apperrors.Internal("tax credential service is not initialized")
	}

	clientID, err := s.clientIDFromUserID(ctx, clientUserID)
	if err != nil {
		return nil, err
	}

	input = NormalizeCreateCredentialInput(input)
	input.ClientID = clientID
	input.CreatedByUserID = strings.TrimSpace(clientUserID)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	encryptedPassword, err := s.encryptor.Encrypt(input.Password)
	if err != nil {
		return nil, apperrors.InternalWrap(err, "failed to encrypt credential password")
	}

	item, err := s.credentialRepo.CreateCredential(ctx, input, encryptedPassword)
	if err != nil {
		return nil, err
	}

	publicItem := item.Public()

	return &publicItem, nil
}

func (s *Service) UpdateClientCredential(ctx context.Context, clientUserID string, id string, input UpdateClientCredentialInput) (*PublicClientTaxCredential, error) {
	if s == nil || s.credentialRepo == nil || s.encryptor == nil {
		return nil, apperrors.Internal("tax credential service is not initialized")
	}

	clientID, err := s.clientIDFromUserID(ctx, clientUserID)
	if err != nil {
		return nil, err
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("client tax credential id is required")
	}

	existingCredential, err := s.credentialRepo.FindCredentialByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if existingCredential.ClientID != clientID {
		return nil, forbidden("you do not have permission to update this credential")
	}

	input = NormalizeUpdateCredentialInput(input)
	input.UpdatedByUserID = strings.TrimSpace(clientUserID)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	encryptedPassword := ""
	if strings.TrimSpace(input.Password) != "" {
		encryptedPassword, err = s.encryptor.Encrypt(input.Password)
		if err != nil {
			return nil, apperrors.InternalWrap(err, "failed to encrypt credential password")
		}
	}

	item, err := s.credentialRepo.UpdateCredential(ctx, id, input, encryptedPassword)
	if err != nil {
		return nil, err
	}

	publicItem := item.Public()

	return &publicItem, nil
}

func (s *Service) DeleteClientCredential(ctx context.Context, clientUserID string, id string) error {
	if s == nil || s.credentialRepo == nil {
		return apperrors.Internal("tax credential service is not initialized")
	}

	clientID, err := s.clientIDFromUserID(ctx, clientUserID)
	if err != nil {
		return err
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("client tax credential id is required")
	}

	existingCredential, err := s.credentialRepo.FindCredentialByID(ctx, id)
	if err != nil {
		return err
	}

	if existingCredential.ClientID != clientID {
		return forbidden("you do not have permission to delete this credential")
	}

	return s.credentialRepo.DeleteCredential(ctx, id)
}

func (s *Service) RevealClientCredential(ctx context.Context, clientUserID string, id string) (*RevealedCredential, error) {
	if s == nil || s.credentialRepo == nil || s.encryptor == nil {
		return nil, apperrors.Internal("tax credential service is not initialized")
	}

	clientID, err := s.clientIDFromUserID(ctx, clientUserID)
	if err != nil {
		return nil, err
	}

	item, err := s.credentialRepo.FindCredentialByID(ctx, strings.TrimSpace(id))
	if err != nil {
		return nil, err
	}

	if item.ClientID != clientID {
		return nil, forbidden("you do not have permission to reveal this credential")
	}

	return s.revealCredential(ctx, item, clientUserID)
}

/*
ADMIN CREDENTIAL ACCESS

Admin can list and reveal all client credentials.
Admin does not need to know the encrypted value directly.
*/

func (s *Service) ListAdminCredentials(ctx context.Context, filter ListClientCredentialsFilter) ([]AdminClientTaxCredential, int, error) {
	if s == nil || s.credentialRepo == nil {
		return nil, 0, apperrors.Internal("tax credential service is not initialized")
	}

	items, totalItems, err := s.credentialRepo.ListCredentials(ctx, filter.Normalize())
	if err != nil {
		return nil, 0, err
	}

	return AdminClientCredentials(items), totalItems, nil
}

func (s *Service) GetAdminCredentialByID(ctx context.Context, id string) (*AdminClientTaxCredential, error) {
	if s == nil || s.credentialRepo == nil {
		return nil, apperrors.Internal("tax credential service is not initialized")
	}

	item, err := s.credentialRepo.FindCredentialByID(ctx, strings.TrimSpace(id))
	if err != nil {
		return nil, err
	}

	adminItem := item.Admin()

	return &adminItem, nil
}

func (s *Service) RevealAdminCredential(ctx context.Context, adminUserID string, id string) (*RevealedCredential, error) {
	if s == nil || s.credentialRepo == nil || s.encryptor == nil {
		return nil, apperrors.Internal("tax credential service is not initialized")
	}

	item, err := s.credentialRepo.FindCredentialByID(ctx, strings.TrimSpace(id))
	if err != nil {
		return nil, err
	}

	return s.revealCredential(ctx, item, adminUserID)
}

func (s *Service) DeleteAdminCredential(ctx context.Context, id string) error {
	if s == nil || s.credentialRepo == nil {
		return apperrors.Internal("tax credential service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("client tax credential id is required")
	}

	return s.credentialRepo.DeleteCredential(ctx, id)
}

func (s *Service) UpdateAdminCredentialStatus(ctx context.Context, id string, isActive bool) (*AdminClientTaxCredential, error) {
	if s == nil || s.credentialRepo == nil {
		return nil, apperrors.Internal("tax credential service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("client tax credential id is required")
	}

	item, err := s.credentialRepo.UpdateCredentialStatus(ctx, id, isActive)
	if err != nil {
		return nil, err
	}

	adminItem := item.Admin()

	return &adminItem, nil
}

/*
ACCOUNTANT CREDENTIAL ACCESS

Accountant can access credentials only if assigned to a service request
belonging to that client.
*/

func (s *Service) ListAccountantCredentials(ctx context.Context, accountantUserID string, filter ListClientCredentialsFilter) ([]PublicClientTaxCredential, int, error) {
	if s == nil || s.credentialRepo == nil {
		return nil, 0, apperrors.Internal("tax credential service is not initialized")
	}

	accountantUserID = strings.TrimSpace(accountantUserID)
	if accountantUserID == "" {
		return nil, 0, apperrors.InvalidInput("accountant user id is required")
	}

	filter = filter.Normalize()
	if filter.ClientID == "" {
		return nil, 0, apperrors.InvalidInput("client_id is required")
	}

	allowed, err := s.credentialRepo.AccountantCanAccessClient(ctx, accountantUserID, filter.ClientID)
	if err != nil {
		return nil, 0, err
	}

	if !allowed {
		return nil, 0, forbidden("you do not have permission to access credentials for this client")
	}

	items, totalItems, err := s.credentialRepo.ListCredentials(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return PublicClientCredentials(items), totalItems, nil
}

func (s *Service) GetAccountantCredentialByID(ctx context.Context, accountantUserID string, id string) (*PublicClientTaxCredential, error) {
	if s == nil || s.credentialRepo == nil {
		return nil, apperrors.Internal("tax credential service is not initialized")
	}

	accountantUserID = strings.TrimSpace(accountantUserID)
	if accountantUserID == "" {
		return nil, apperrors.InvalidInput("accountant user id is required")
	}

	item, err := s.credentialRepo.FindCredentialByID(ctx, strings.TrimSpace(id))
	if err != nil {
		return nil, err
	}

	allowed, err := s.credentialRepo.AccountantCanAccessClient(ctx, accountantUserID, item.ClientID)
	if err != nil {
		return nil, err
	}

	if !allowed {
		return nil, forbidden("you do not have permission to access this credential")
	}

	publicItem := item.Public()

	return &publicItem, nil
}

func (s *Service) RevealAccountantCredential(ctx context.Context, accountantUserID string, id string) (*RevealedCredential, error) {
	if s == nil || s.credentialRepo == nil || s.encryptor == nil {
		return nil, apperrors.Internal("tax credential service is not initialized")
	}

	accountantUserID = strings.TrimSpace(accountantUserID)
	if accountantUserID == "" {
		return nil, apperrors.InvalidInput("accountant user id is required")
	}

	item, err := s.credentialRepo.FindCredentialByID(ctx, strings.TrimSpace(id))
	if err != nil {
		return nil, err
	}

	allowed, err := s.credentialRepo.AccountantCanAccessClient(ctx, accountantUserID, item.ClientID)
	if err != nil {
		return nil, err
	}

	if !allowed {
		return nil, forbidden("you do not have permission to reveal this credential")
	}

	return s.revealCredential(ctx, item, accountantUserID)
}

/*
PRIVATE HELPERS
*/

func (s *Service) clientIDFromUserID(ctx context.Context, clientUserID string) (string, error) {
	if s == nil || s.credentialRepo == nil {
		return "", apperrors.Internal("tax credential service is not initialized")
	}

	clientUserID = strings.TrimSpace(clientUserID)
	if clientUserID == "" {
		return "", apperrors.InvalidInput("client user id is required")
	}

	return s.credentialRepo.FindClientIDByUserID(ctx, clientUserID)
}

func (s *Service) revealCredential(ctx context.Context, item *ClientTaxCredential, revealedByUserID string) (*RevealedCredential, error) {
	if s == nil || s.credentialRepo == nil || s.encryptor == nil {
		return nil, apperrors.Internal("tax credential service is not initialized")
	}

	if item == nil {
		return nil, apperrors.NotFound("client tax credential not found")
	}

	password, err := s.encryptor.Decrypt(item.EncryptedPassword)
	if err != nil {
		return nil, apperrors.InternalWrap(err, "failed to decrypt credential password")
	}

	if err := s.credentialRepo.MarkCredentialRevealed(ctx, item.ID, revealedByUserID); err != nil {
		return nil, err
	}

	return &RevealedCredential{
		ID:         item.ID,
		ClientID:   item.ClientID,
		SystemID:   item.SystemID,
		SystemName: item.SystemName,
		LoginURL:   item.LoginURL,
		Username:   item.Username,
		Password:   password,
		Notes:      item.Notes,
	}, nil
}

func forbidden(message string) error {
	return &apperrors.AppError{
		Code:       "forbidden",
		Message:    message,
		StatusCode: http.StatusForbidden,
	}
}