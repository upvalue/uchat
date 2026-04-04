package chat

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// HTTPClient talks to the uchat GraphQL server.
type HTTPClient struct {
	endpoint string
	client   *http.Client
}

func NewHTTPClient(serverURL string) *HTTPClient {
	return &HTTPClient{
		endpoint: serverURL + "/graphql",
		client:   &http.Client{},
	}
}

type gqlRequest struct {
	Query     string         `json:"query"`
	Variables map[string]any `json:"variables,omitempty"`
}

type gqlResponse struct {
	Data   json.RawMessage `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

func (h *HTTPClient) do(req gqlRequest, target any) error {
	body, _ := json.Marshal(req)
	resp, err := h.client.Post(h.endpoint, "application/json", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("server returned %d: %s", resp.StatusCode, raw)
	}
	var gqlResp gqlResponse
	if err := json.NewDecoder(resp.Body).Decode(&gqlResp); err != nil {
		return err
	}
	if len(gqlResp.Errors) > 0 {
		return fmt.Errorf("graphql: %s", gqlResp.Errors[0].Message)
	}
	return json.Unmarshal(gqlResp.Data, target)
}

// Send sends a message to a room. The room parameter is a room path ("folder/name" or "name").
func (h *HTTPClient) Send(room, user, text string) (Message, error) {
	var result struct {
		SendMessage Message `json:"sendMessage"`
	}
	err := h.do(gqlRequest{
		Query: `mutation($room: String!, $user: String!, $body: JSON!) {
			sendMessage(room: $room, user: $user, body: $body) { id room user body timestamp }
		}`,
		Variables: map[string]any{
			"room": room,
			"user": user,
			"body": TextBody(text),
		},
	}, &result)
	return result.SendMessage, err
}

// GetMessages retrieves messages for a room. The room parameter is a room path.
func (h *HTTPClient) GetMessages(room string) ([]Message, error) {
	var result struct {
		Messages []Message `json:"messages"`
	}
	err := h.do(gqlRequest{
		Query: `query($room: String!) {
			messages(room: $room) { id room user body timestamp }
		}`,
		Variables: map[string]any{"room": room},
	}, &result)
	return result.Messages, err
}

// CreateRoom creates a room. Name and folder are separate; the folder can be empty.
func (h *HTTPClient) CreateRoom(name string, folder *string, description *string) error {
	if err := ValidateRoomName(name); err != nil {
		return err
	}
	var result struct {
		CreateRoom struct {
			Name        string  `json:"name"`
			Folder      *string `json:"folder"`
			Description *string `json:"description"`
			Position    int     `json:"position"`
		} `json:"createRoom"`
	}
	return h.do(gqlRequest{
		Query: `mutation($name: String!, $folder: String, $description: String) {
			createRoom(name: $name, folder: $folder, description: $description) { name folder description position }
		}`,
		Variables: map[string]any{"name": name, "folder": folder, "description": description},
	}, &result)
}

func (h *HTTPClient) EditMessage(id, text string) error {
	var result struct {
		EditMessage Message `json:"editMessage"`
	}
	return h.do(gqlRequest{
		Query: `mutation($id: ID!, $body: JSON!) {
			editMessage(id: $id, body: $body) { id }
		}`,
		Variables: map[string]any{
			"id":   id,
			"body": TextBody(text),
		},
	}, &result)
}
