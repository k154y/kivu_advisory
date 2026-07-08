package notification

import "strings"

type Recipient struct {
	UserID   string
	FullName string
	Email    string
	Phone    string
	Role     string
}

func (r Recipient) Normalize() Recipient {
	r.UserID = strings.TrimSpace(r.UserID)
	r.FullName = strings.TrimSpace(r.FullName)
	r.Email = strings.TrimSpace(strings.ToLower(r.Email))
	r.Phone = strings.TrimSpace(r.Phone)
	r.Role = strings.TrimSpace(strings.ToLower(r.Role))

	return r
}