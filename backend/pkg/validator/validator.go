package validator

import (
	"errors"
	"net/mail"
	"regexp"
	"strings"
	"unicode/utf8"

	passwordpkg "github.com/kyves/kivu-advisory/backend/pkg/password"
)

type Errors map[string]string

type Validator struct {
	errors Errors
}

var (
	phonePattern = regexp.MustCompile(`^\+?[0-9\s\-()]{7,30}$`)
	codePattern  = regexp.MustCompile(`^[a-z][a-z0-9_\.]*$`)
	slugPattern  = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
)

func New() *Validator {
	return &Validator{
		errors: make(Errors),
	}
}

func (v *Validator) Valid() bool {
	return len(v.errors) == 0
}

func (v *Validator) Errors() Errors {
	if v == nil {
		return Errors{}
	}

	return v.errors
}

func (v *Validator) Add(field string, message string) {
	if v == nil {
		return
	}

	field = strings.TrimSpace(field)
	message = strings.TrimSpace(message)

	if field == "" || message == "" {
		return
	}

	if _, exists := v.errors[field]; !exists {
		v.errors[field] = message
	}
}

func (v *Validator) Check(condition bool, field string, message string) {
	if !condition {
		v.Add(field, message)
	}
}

func RequiredField(v *Validator, field string, value string) {
	if strings.TrimSpace(value) == "" {
		v.Add(field, field+" is required")
	}
}

func ValidateStringLength(v *Validator, field string, value string, minLength int, maxLength int, required bool) {
	value = strings.TrimSpace(value)

	if value == "" {
		if required {
			v.Add(field, field+" is required")
		}

		return
	}

	length := utf8.RuneCountInString(value)

	if minLength > 0 && length < minLength {
		v.Add(field, field+" must be at least "+intToString(minLength)+" characters")
		return
	}

	if maxLength > 0 && length > maxLength {
		v.Add(field, field+" must not exceed "+intToString(maxLength)+" characters")
		return
	}
}

func ValidateEmail(v *Validator, field string, value string) {
	value = NormalizeEmail(value)

	if value == "" {
		v.Add(field, field+" is required")
		return
	}

	if _, err := mail.ParseAddress(value); err != nil {
		v.Add(field, "invalid email address")
		return
	}
}

func ValidatePhone(v *Validator, field string, value string, required bool) {
	value = strings.TrimSpace(value)

	if value == "" {
		if required {
			v.Add(field, field+" is required")
		}

		return
	}

	if !phonePattern.MatchString(value) {
		v.Add(field, "invalid phone number")
		return
	}
}

func ValidatePassword(v *Validator, field string, value string, minLength int) {
	if err := passwordpkg.ValidatePlainPassword(value, minLength); err != nil {
		switch {
		case errors.Is(err, passwordpkg.ErrPasswordRequired):
			v.Add(field, field+" is required")
		case errors.Is(err, passwordpkg.ErrPasswordTooShort):
			v.Add(field, "password must be at least 10 characters long")
		case errors.Is(err, passwordpkg.ErrPasswordTooCommon):
			v.Add(field, "password is too common; choose a stronger password")
		case errors.Is(err, passwordpkg.ErrPasswordTooWeak):
			v.Add(field, "password must include uppercase, lowercase, number, special character, and must not contain obvious sequences")
		default:
			v.Add(field, "password is invalid")
		}
	}
}

func ValidateCode(v *Validator, field string, value string, required bool) {
	value = NormalizeCode(value)

	if value == "" {
		if required {
			v.Add(field, field+" is required")
		}

		return
	}

	if !codePattern.MatchString(value) {
		v.Add(field, field+" must be machine-readable, for example invoice.approve")
	}
}

func ValidateSlug(v *Validator, field string, value string, required bool) {
	value = NormalizeSlug(value)

	if value == "" {
		if required {
			v.Add(field, field+" is required")
		}

		return
	}

	if !slugPattern.MatchString(value) {
		v.Add(field, field+" must be a valid URL slug")
	}
}

func ValidateOneOf(v *Validator, field string, value string, allowedValues ...string) {
	value = strings.TrimSpace(value)

	if value == "" {
		v.Add(field, field+" is required")
		return
	}

	for _, allowedValue := range allowedValues {
		if value == allowedValue {
			return
		}
	}

	v.Add(field, field+" has an invalid value")
}

func ValidateOneOfFold(v *Validator, field string, value string, allowedValues ...string) {
	value = strings.TrimSpace(strings.ToLower(value))

	if value == "" {
		v.Add(field, field+" is required")
		return
	}

	for _, allowedValue := range allowedValues {
		if value == strings.TrimSpace(strings.ToLower(allowedValue)) {
			return
		}
	}

	v.Add(field, field+" has an invalid value")
}

func ValidatePositiveInt(v *Validator, field string, value int) {
	if value <= 0 {
		v.Add(field, field+" must be greater than zero")
	}
}

func ValidateNonNegativeInt(v *Validator, field string, value int) {
	if value < 0 {
		v.Add(field, field+" must not be negative")
	}
}

func NormalizeEmail(email string) string {
	return strings.TrimSpace(strings.ToLower(email))
}

func NormalizeCode(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	value = strings.ReplaceAll(value, " ", "_")
	value = strings.ReplaceAll(value, "-", "_")

	return value
}

func NormalizeSlug(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	value = strings.ReplaceAll(value, " ", "-")
	value = strings.ReplaceAll(value, "_", "-")

	for strings.Contains(value, "--") {
		value = strings.ReplaceAll(value, "--", "-")
	}

	value = strings.Trim(value, "-")

	return value
}

func StringLength(value string) int {
	return utf8.RuneCountInString(strings.TrimSpace(value))
}

func IsEmail(value string) bool {
	value = NormalizeEmail(value)
	if value == "" {
		return false
	}

	_, err := mail.ParseAddress(value)

	return err == nil
}

func IsPhone(value string) bool {
	value = strings.TrimSpace(value)
	if value == "" {
		return false
	}

	return phonePattern.MatchString(value)
}

func IsCode(value string) bool {
	value = NormalizeCode(value)
	if value == "" {
		return false
	}

	return codePattern.MatchString(value)
}

func IsSlug(value string) bool {
	value = NormalizeSlug(value)
	if value == "" {
		return false
	}

	return slugPattern.MatchString(value)
}

func intToString(value int) string {
	return strings.TrimSpace(strings.ReplaceAll(strings.ReplaceAll(formatInt(value), "\n", ""), "\t", ""))
}

func formatInt(value int) string {
	return strconvItoa(value)
}

func strconvItoa(value int) string {
	digits := "0123456789"

	if value == 0 {
		return "0"
	}

	negative := value < 0
	if negative {
		value = -value
	}

	result := ""

	for value > 0 {
		result = string(digits[value%10]) + result
		value = value / 10
	}

	if negative {
		result = "-" + result
	}

	return result
}