package blog

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

const maxBlogRequestBodyBytes = 1 << 20

type Handler struct {
	service *Service
}

type createPostRequest struct {
	Title            string   `json:"title"`
	Slug             string   `json:"slug"`
	Excerpt          string   `json:"excerpt"`
	Body             string   `json:"body"`
	Category         string   `json:"category"`
	Tags             []string `json:"tags"`
	FeaturedImageURL string   `json:"featured_image_url"`
	Status           string   `json:"status"`
	IsFeatured       bool     `json:"is_featured"`
	MetaTitle        string   `json:"meta_title"`
	MetaDescription  string   `json:"meta_description"`
}

type updatePostRequest = createPostRequest

type updateStatusRequest struct {
	Status string `json:"status"`
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) PublicPosts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	filter := ListPostsFilter{
		Category:   r.URL.Query().Get("category"),
		IsFeatured: parseOptionalBoolQuery(r, "featured"),
		Search:     r.URL.Query().Get("search"),
		Page:       parseIntQuery(r, "page", 1),
		PageSize:   parseIntQuery(r, "page_size", 20),
	}

	items, totalItems, err := h.service.ListPublic(r.Context(), filter)
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	filter = filter.Normalize()
	response.OK(w, "blog posts retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) PublicPostDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	slug := r.URL.Query().Get("slug")
	if slug == "" {
		response.BadRequest(w, "blog slug is required", nil)
		return
	}

	item, err := h.service.GetPublicBySlug(r.Context(), slug)
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	response.OK(w, "blog post retrieved successfully", item)
}

func (h *Handler) AdminPosts(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.listAdminPosts(w, r)
	case http.MethodPost:
		h.createPost(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) AdminPostDetail(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.getAdminPostByID(w, r)
	case http.MethodPut:
		h.updatePost(w, r)
	case http.MethodDelete:
		h.deletePost(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) AdminPostStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		response.MethodNotAllowed(w)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		response.BadRequest(w, "blog id is required", nil)
		return
	}

	var request updateStatusRequest
	if err := readJSON(w, r, &request); err != nil {
		writeHandlerError(w, err)
		return
	}

	item, err := h.service.UpdateStatus(r.Context(), id, request.Status)
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	response.OK(w, "blog status updated successfully", item)
}

func (h *Handler) listAdminPosts(w http.ResponseWriter, r *http.Request) {
	filter := ListPostsFilter{
		Status:     r.URL.Query().Get("status"),
		Category:   r.URL.Query().Get("category"),
		IsFeatured: parseOptionalBoolQuery(r, "featured"),
		Search:     r.URL.Query().Get("search"),
		Page:       parseIntQuery(r, "page", 1),
		PageSize:   parseIntQuery(r, "page_size", 20),
	}

	items, totalItems, err := h.service.ListAdmin(r.Context(), filter)
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	filter = filter.Normalize()
	response.OK(w, "admin blog posts retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) createPost(w http.ResponseWriter, r *http.Request) {
	var request createPostRequest
	if err := readJSON(w, r, &request); err != nil {
		writeHandlerError(w, err)
		return
	}

	userID := middleware.UserIDFromContext(r.Context())
	item, err := h.service.Create(r.Context(), CreatePostInput{
		Title:            request.Title,
		Slug:             request.Slug,
		Excerpt:          request.Excerpt,
		Body:             request.Body,
		Category:         request.Category,
		Tags:             request.Tags,
		FeaturedImageURL: request.FeaturedImageURL,
		Status:           request.Status,
		IsFeatured:       request.IsFeatured,
		MetaTitle:        request.MetaTitle,
		MetaDescription:  request.MetaDescription,
		AuthorUserID:     userID,
	})
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	response.Created(w, "blog post created successfully", item)
}

func (h *Handler) getAdminPostByID(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		response.BadRequest(w, "blog id is required", nil)
		return
	}

	item, err := h.service.GetAdminByID(r.Context(), id)
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	response.OK(w, "blog post retrieved successfully", item)
}

func (h *Handler) updatePost(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		response.BadRequest(w, "blog id is required", nil)
		return
	}

	var request updatePostRequest
	if err := readJSON(w, r, &request); err != nil {
		writeHandlerError(w, err)
		return
	}

	userID := middleware.UserIDFromContext(r.Context())
	item, err := h.service.Update(r.Context(), id, UpdatePostInput{
		Title:            request.Title,
		Slug:             request.Slug,
		Excerpt:          request.Excerpt,
		Body:             request.Body,
		Category:         request.Category,
		Tags:             request.Tags,
		FeaturedImageURL: request.FeaturedImageURL,
		Status:           request.Status,
		IsFeatured:       request.IsFeatured,
		MetaTitle:        request.MetaTitle,
		MetaDescription:  request.MetaDescription,
		AuthorUserID:     userID,
	})
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	response.OK(w, "blog post updated successfully", item)
}

func (h *Handler) deletePost(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		response.BadRequest(w, "blog id is required", nil)
		return
	}

	if err := h.service.Delete(r.Context(), id); err != nil {
		writeHandlerError(w, err)
		return
	}

	response.OK(w, "blog post deleted successfully", map[string]any{"id": id})
}

func readJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxBlogRequestBodyBytes)
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

func parseIntQuery(r *http.Request, key string, fallback int) int {
	value := r.URL.Query().Get(key)
	if value == "" {
		return fallback
	}

	parsedValue, err := strconv.Atoi(value)
	if err != nil || parsedValue <= 0 {
		return fallback
	}

	return parsedValue
}

func parseOptionalBoolQuery(r *http.Request, key string) *bool {
	value := r.URL.Query().Get(key)
	if value == "" {
		return nil
	}

	parsedValue, err := strconv.ParseBool(value)
	if err != nil {
		return nil
	}

	return &parsedValue
}

func totalPages(totalItems int, pageSize int) int {
	if pageSize <= 0 {
		return 0
	}
	if totalItems == 0 {
		return 0
	}
	return (totalItems + pageSize - 1) / pageSize
}

func writeHandlerError(w http.ResponseWriter, err error) {
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
