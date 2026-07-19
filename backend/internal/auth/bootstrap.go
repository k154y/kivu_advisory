package auth

import (
	"context"
	"strings"

	userpkg "github.com/kyves/kivu-advisory/backend/internal/user"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type AdminCreator interface {
	CreateAdmin(ctx context.Context, input userpkg.CreateAdminInput) (*userpkg.PublicUser, error)
}

type BootstrapAdminInput struct {
	FullName string
	Email    string
	Phone    string
	Password string
}

func BootstrapAdmin(ctx context.Context, users AdminCreator, input BootstrapAdminInput) error {
	if users == nil {
		return apperrors.Internal("admin bootstrap requires user service")
	}

	input.FullName = strings.TrimSpace(input.FullName)
	input.Email = NormalizeEmail(input.Email)
	input.Phone = strings.TrimSpace(input.Phone)
	input.Password = strings.TrimSpace(input.Password)

	if input.Email == "" || input.Password == "" {
		return nil
	}

	if input.FullName == "" {
		input.FullName = "System Administrator"
	}

	_, err := users.CreateAdmin(ctx, userpkg.CreateAdminInput{
		FullName: input.FullName,
		Email:    input.Email,
		Phone:    input.Phone,
		Password: input.Password,
	})
	if err != nil {
		if apperrors.IsConflict(err) {
			return nil
		}

		return err
	}

	return nil
}
