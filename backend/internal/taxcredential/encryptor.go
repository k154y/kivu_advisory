package taxcredential

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"os"
	"strings"
)

const CredentialEncryptionKeyEnv = "CREDENTIAL_ENCRYPTION_KEY"

var (
	ErrEncryptionKeyRequired = errors.New("credential encryption key is required")
	ErrEncryptionKeyTooShort = errors.New("credential encryption key must have at least 32 characters")
	ErrCiphertextInvalid     = errors.New("encrypted credential value is invalid")
)

type Encryptor interface {
	Encrypt(plainText string) (string, error)
	Decrypt(cipherText string) (string, error)
}

type AESGCMEncryptor struct {
	gcm cipher.AEAD
}

func NewEncryptorFromEnv() (*AESGCMEncryptor, error) {
	return NewAESGCMEncryptor(os.Getenv(CredentialEncryptionKeyEnv))
}

func NewAESGCMEncryptor(secret string) (*AESGCMEncryptor, error) {
	key, err := buildEncryptionKey(secret)
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	return &AESGCMEncryptor{
		gcm: gcm,
	}, nil
}

func (e *AESGCMEncryptor) Encrypt(plainText string) (string, error) {
	plainText = strings.TrimSpace(plainText)
	if plainText == "" {
		return "", errors.New("plain text value is required")
	}

	nonce := make([]byte, e.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	sealedValue := e.gcm.Seal(nonce, nonce, []byte(plainText), nil)

	return base64.StdEncoding.EncodeToString(sealedValue), nil
}

func (e *AESGCMEncryptor) Decrypt(cipherText string) (string, error) {
	cipherText = strings.TrimSpace(cipherText)
	if cipherText == "" {
		return "", ErrCiphertextInvalid
	}

	decodedValue, err := base64.StdEncoding.DecodeString(cipherText)
	if err != nil {
		return "", ErrCiphertextInvalid
	}

	nonceSize := e.gcm.NonceSize()
	if len(decodedValue) <= nonceSize {
		return "", ErrCiphertextInvalid
	}

	nonce := decodedValue[:nonceSize]
	encryptedValue := decodedValue[nonceSize:]

	plainText, err := e.gcm.Open(nil, nonce, encryptedValue, nil)
	if err != nil {
		return "", ErrCiphertextInvalid
	}

	return string(plainText), nil
}

func buildEncryptionKey(secret string) ([]byte, error) {
	secret = strings.TrimSpace(secret)
	if secret == "" {
		return nil, ErrEncryptionKeyRequired
	}

	if decodedSecret, err := base64.StdEncoding.DecodeString(secret); err == nil && len(decodedSecret) == 32 {
		return decodedSecret, nil
	}

	if len(secret) < 32 {
		return nil, ErrEncryptionKeyTooShort
	}

	hash := sha256.Sum256([]byte(secret))

	return hash[:], nil
}