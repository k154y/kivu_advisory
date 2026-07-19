package password

import (
	"errors"
	"strings"
	"unicode"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"
)

const (
	defaultMinLength  = 10
	defaultBcryptCost = bcrypt.DefaultCost
)

var (
	ErrPasswordRequired  = errors.New("password is required")
	ErrPasswordTooShort  = errors.New("password is too short")
	ErrPasswordTooWeak   = errors.New("password is too weak")
	ErrPasswordTooCommon = errors.New("password is too common")
	ErrInvalidHash       = errors.New("invalid password hash")
)

type Config struct {
	MinLength  int
	BcryptCost int
}

func Hash(plainPassword string, cfg Config) (string, error) {
	cfg = normalizeConfig(cfg)

	if err := ValidatePlainPassword(plainPassword, cfg.MinLength); err != nil {
		return "", err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(plainPassword), cfg.BcryptCost)
	if err != nil {
		return "", err
	}

	return string(hashedPassword), nil
}

func Compare(hashedPassword string, plainPassword string) bool {
	hashedPassword = strings.TrimSpace(hashedPassword)

	if hashedPassword == "" || plainPassword == "" {
		return false
	}

	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(plainPassword))

	return err == nil
}

func NeedsRehash(hashedPassword string, cfg Config) bool {
	cfg = normalizeConfig(cfg)

	hashedPassword = strings.TrimSpace(hashedPassword)
	if hashedPassword == "" {
		return true
	}

	currentCost, err := bcrypt.Cost([]byte(hashedPassword))
	if err != nil {
		return true
	}

	return currentCost != cfg.BcryptCost
}

func ValidatePlainPassword(plainPassword string, minLength int) error {
	if strings.TrimSpace(plainPassword) == "" {
		return ErrPasswordRequired
	}

	if minLength < defaultMinLength {
		minLength = defaultMinLength
	}

	if utf8.RuneCountInString(plainPassword) < minLength {
		return ErrPasswordTooShort
	}

	if isCommonPassword(plainPassword) {
		return ErrPasswordTooCommon
	}

	if containsWeakSequence(plainPassword) {
		return ErrPasswordTooWeak
	}

	if hasTooManyRepeatedCharacters(plainPassword) {
		return ErrPasswordTooWeak
	}

	var hasUppercase bool
	var hasLowercase bool
	var hasNumber bool
	var hasSpecial bool

	for _, item := range plainPassword {
		switch {
		case unicode.IsUpper(item):
			hasUppercase = true
		case unicode.IsLower(item):
			hasLowercase = true
		case unicode.IsDigit(item):
			hasNumber = true
		case unicode.IsPunct(item) || unicode.IsSymbol(item):
			hasSpecial = true
		}
	}

	if !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial {
		return ErrPasswordTooWeak
	}

	return nil
}

func PasswordRules(minLength int) []string {
	if minLength < defaultMinLength {
		minLength = defaultMinLength
	}

	return []string{
		"Password must be at least 10 characters long.",
		"Password must contain at least one uppercase letter.",
		"Password must contain at least one lowercase letter.",
		"Password must contain at least one number.",
		"Password must contain at least one special character.",
		"Password must not be a common password.",
		"Password must not contain obvious sequences like 123456, abcdef, or qwerty.",
	}
}

func IsBcryptHash(value string) bool {
	value = strings.TrimSpace(value)
	if value == "" {
		return false
	}

	_, err := bcrypt.Cost([]byte(value))

	return err == nil
}

func normalizeConfig(cfg Config) Config {
	if cfg.MinLength < defaultMinLength {
		cfg.MinLength = defaultMinLength
	}

	if cfg.BcryptCost < bcrypt.MinCost || cfg.BcryptCost > bcrypt.MaxCost {
		cfg.BcryptCost = defaultBcryptCost
	}

	return cfg
}

func isCommonPassword(value string) bool {
	normalized := strings.ToLower(strings.TrimSpace(value))

	commonPasswords := map[string]bool{
		"password":      true,
		"password1":     true,
		"password12":    true,
		"password123":   true,
		"password123!":  true,
		"123456":        true,
		"12345678":      true,
		"123456789":     true,
		"1234567890":    true,
		"qwerty":        true,
		"qwerty123":     true,
		"qwerty123!":    true,
		"admin":         true,
		"admin123":      true,
		"admin123!":     true,
		"letmein":       true,
		"welcome":       true,
		"welcome123":    true,
		"welcome123!":   true,
		"kivu123":       true,
		"kivu123!":      true,
		"client123":     true,
		"client123!":    true,
		"accountant123": true,
	}

	return commonPasswords[normalized]
}

func containsWeakSequence(value string) bool {
	normalized := strings.ToLower(strings.TrimSpace(value))

	weakSequences := []string{
		"123456",
		"234567",
		"345678",
		"456789",
		"987654",
		"876543",
		"abcdef",
		"bcdefg",
		"qwerty",
		"asdfgh",
		"zxcvbn",
	}

	for _, sequence := range weakSequences {
		if strings.Contains(normalized, sequence) {
			return true
		}
	}

	return false
}

func hasTooManyRepeatedCharacters(value string) bool {
	var previous rune
	repeatedCount := 0

	for index, item := range value {
		if index == 0 {
			previous = item
			repeatedCount = 1
			continue
		}

		if item == previous {
			repeatedCount++
			if repeatedCount >= 4 {
				return true
			}
		} else {
			previous = item
			repeatedCount = 1
		}
	}

	return false
}
