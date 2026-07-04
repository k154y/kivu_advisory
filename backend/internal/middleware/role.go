package middleware

import "strings"

func NormalizeRole(role string) string {
	return strings.TrimSpace(strings.ToLower(role))
}

func IsKnownRole(role string) bool {
	switch NormalizeRole(role) {
	case RoleAdmin, RoleClient, RoleAccountant:
		return true
	default:
		return false
	}
}

func HasRole(user *AuthenticatedUser, allowedRoles ...string) bool {
	if user == nil {
		return false
	}

	userRole := NormalizeRole(user.Role)
	if userRole == "" {
		return false
	}

	for _, allowedRole := range allowedRoles {
		if userRole == NormalizeRole(allowedRole) {
			return true
		}
	}

	return false
}

func IsAdmin(user *AuthenticatedUser) bool {
	return HasRole(user, RoleAdmin)
}

func IsClient(user *AuthenticatedUser) bool {
	return HasRole(user, RoleClient)
}

func IsAccountant(user *AuthenticatedUser) bool {
	return HasRole(user, RoleAccountant)
}

func CanAccessAdminDashboard(user *AuthenticatedUser) bool {
	return IsAdmin(user)
}

func CanAccessClientDashboard(user *AuthenticatedUser) bool {
	return IsClient(user)
}

func CanAccessAccountantDashboard(user *AuthenticatedUser) bool {
	return IsAccountant(user)
}

func CanCreateAccountants(user *AuthenticatedUser) bool {
	return IsAdmin(user)
}

func CanManageAccountants(user *AuthenticatedUser) bool {
	return IsAdmin(user)
}

func CanManageClients(user *AuthenticatedUser) bool {
	return IsAdmin(user)
}

func CanManageWebsiteContent(user *AuthenticatedUser) bool {
	return IsAdmin(user)
}

func CanManageServices(user *AuthenticatedUser) bool {
	return IsAdmin(user)
}

func CanManageBlog(user *AuthenticatedUser) bool {
	return IsAdmin(user)
}

func CanManageTestimonials(user *AuthenticatedUser) bool {
	return IsAdmin(user)
}

func CanViewAllServiceRequests(user *AuthenticatedUser) bool {
	return IsAdmin(user)
}

func CanAssignServiceRequests(user *AuthenticatedUser) bool {
	return IsAdmin(user)
}

func CanViewAssignedWork(user *AuthenticatedUser) bool {
	return IsAccountant(user)
}

func CanSubmitServiceRequest(user *AuthenticatedUser) bool {
	return IsClient(user)
}

func CanUploadClientDocuments(user *AuthenticatedUser) bool {
	return IsClient(user)
}

func CanUploadFinalDocuments(user *AuthenticatedUser) bool {
	return IsAdmin(user) || IsAccountant(user)
}

func CanViewConsultations(user *AuthenticatedUser) bool {
	return IsAdmin(user)
}

func CanManageConsultations(user *AuthenticatedUser) bool {
	return IsAdmin(user)
}

func CanSendMessages(user *AuthenticatedUser) bool {
	return IsAdmin(user) || IsClient(user) || IsAccountant(user)
}

func RoleDisplayName(role string) string {
	switch NormalizeRole(role) {
	case RoleAdmin:
		return "Admin"
	case RoleClient:
		return "Client"
	case RoleAccountant:
		return "Accountant"
	default:
		return "Unknown"
	}
}