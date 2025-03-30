package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

type EmployeeGroups struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

// 外部APIのレスポンスの構造体
type ExternalAPIResponse struct {
	DivisionCode   string           `json:"divisionCode"`
	DivisionName   string           `json:"divisionName"`
	Gender         string           `json:"gender"`
	TypeCode       string           `json:"typeCode"`
	TypeName       string           `json:"typeName"`
	Code           string           `json:"code"`
	Key            string           `json:"key"`
	LastName       string           `json:"lastName"`
	FirstName      string           `json:"firstName"`
	EmployeeGroups []EmployeeGroups `json:"employeeGroups"`
}

// Lambda関数のレスポンス構造体
type APIResponse struct {
	Status  string                `json:"status"`
	Message string                `json:"message,omitempty"`
	Data    []ExternalAPIResponse `json:"data,omitempty"`
}

const (
	authorizationHeader = "Authorization"
	contentType         = "Content-Type"
	apllicationJson     = "application/json"
)

func callKotAPI(division string) ([]ExternalAPIResponse, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	apiToken := os.Getenv("API_ACCESS_TOKEN")
	if apiToken == "" {
		log.Println("ERROR: API_ACCESS_TOKEN が環境変数に設定されていません")
		return nil, fmt.Errorf("APIアクセストークンが設定されていません")
	}

	now := time.Now()
	dateStr := now.Format("2006-01-02")
	url := fmt.Sprintf("https://api.kingtime.jp/v1.0/employees?date=%s", dateStr)

	if division != "" {
		url += fmt.Sprintf("&division=%s", division)
	}

	log.Printf("INFO: KOT外部APIを呼び出し - URL: %s", url)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		log.Printf("ERROR: HTTPリクエスト作成エラー: %s", err.Error())
		return nil, err
	}

	req.Header.Set(authorizationHeader, "Bearer "+apiToken)
	req.Header.Set(contentType, apllicationJson)

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("ERROR: KOT外部APIリクエスト失敗: %s", err.Error())
		return nil, err
	}

	defer resp.Body.Close()

	log.Printf("INFO: 外部APIレスポンス受信 - ステータスコード: %d", resp.StatusCode)

	if resp.StatusCode != http.StatusOK {
		errMessage := fmt.Sprintf("KOT外部APIエラーステータスコード %d", resp.StatusCode)
		log.Println("ERROR: ", errMessage)
		return nil, errors.New(errMessage)
	}

	log.Println("responseBody: ", resp.Body)
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Println("ERROR: レスポンスボディ読み取りエラー:", err)
		return nil, err
	}

	var externalApiResponse []ExternalAPIResponse
	if err := json.Unmarshal(body, &externalApiResponse); err != nil {
		log.Println("ERROR: JSONパースエラー:", err)
		return nil, err
	}

	log.Printf("INFO: 外部APIのレスポンスデータ: %+v", externalApiResponse)

	return externalApiResponse, nil
}

func GetEmployees(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	log.Println("INFO: Lambda関数:getEmployeesFunction Start")

	division := request.PathParameters["division"]
	log.Printf("INFO: 受信したリクエスト: %+v", division)

	// KOT外部API呼び出し
	externalResp, err := callKotAPI(division)
	if err != nil {
		log.Println("ERROR: KOT外部API呼び出しエラー:", err)
		body := fmt.Sprintf(`{"status":"%d", "message":"%s"}`, http.StatusInternalServerError, err.Error())
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       body,
		}, nil
	}

	// 正常レスポンス
	responseBody, _ := json.Marshal(APIResponse{
		Status: fmt.Sprint(http.StatusOK),
		Data:   externalResp,
	})

	log.Print("INFO: Lambda関数のレスポンスを返却: ", responseBody)
	log.Println("INFO: Lambda関数:getEmployeesFunction End")

	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusOK,
		Body:       string(responseBody),
	}, nil
}

func main() {
	lambda.Start(GetEmployees)
}
