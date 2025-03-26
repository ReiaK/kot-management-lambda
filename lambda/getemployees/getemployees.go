package main

import (
	"context"
	"fmt"
	"io"
	"net/http"

	"github.com/aws/aws-lambda-go/lambda"
)

type SucessResponse struct {
	Data interface{} `json:"data"`
}

type ErrorResponse struct {
	StatusCode   int    `json:"status_code"`
	ErrorMessage string `json:"error_message"`
}

type APIResponse struct {
	Sucess bool           `json:"success"`
	Data   interface{}    `json:"data,omitempty"`
	Error  *ErrorResponse `json:"error,omitempty"`
}

func NewSuccessResponse(data interface{}) APIResponse {
	return APIResponse{
		Sucess: true,
		Data:   data,
	}
}

func NewErrorResponse(statusCode int, message string) APIResponse {
	return APIResponse{
		Sucess: false,
		Error: &ErrorResponse{
			StatusCode:   statusCode,
			ErrorMessage: message,
		},
	}
}

type getEmployeesRequest struct {
	Date             string `schema:"date"`
	Division         string `schema:"division"`
	IncludeResigner  bool   `schema:"includeResigner"`
	AdditionalFields string `schema:"additionalFields"`
}

type Response struct {
	Message string `json:"message"`
}

func GetEmployees(ctx context.Context, req *http.Request) (Response, error) {
	resp, err := http.Get("https://httpbin.org/json")
	if err != nil {
		fmt.Println("Error:", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error:", err)
	}

	message := fmt.Sprintf(`Hello, %s!`, body)
	return Response{Message: message}, nil
}

func main() {
	lambda.Start(GetEmployees)
}
