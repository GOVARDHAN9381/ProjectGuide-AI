<?php

class QdrantClient
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = 'http://localhost:6333';
    }

    public function request(string $method, string $endpoint, ?array $data = null): array
    {
        $url = $this->baseUrl . $endpoint;

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            if ($data !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
            $response = curl_exec($ch);
            if ($response === false) {
                $error = curl_error($ch);
                curl_close($ch);
                throw new Exception('Qdrant connection failed: ' . $error);
            }
            $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
        } else {
            $options = [
                'http' => [
                    'method' => $method,
                    'header' => "Content-Type: application/json\r\n",
                    'content' => $data !== null ? json_encode($data) : null,
                    'ignore_errors' => true,
                    'timeout' => 5,
                ]
            ];
            $context = stream_context_create($options);
            $response = @file_get_contents($url, false, $context);
            if ($response === false) {
                throw new Exception('Qdrant connection failed (stream context)');
            }
            $statusCode = 200;
            if (isset($http_response_header[0])) {
                preg_match('/HTTP\/\S+\s+(\d+)/', $http_response_header[0], $matches);
                $statusCode = isset($matches[1]) ? (int)$matches[1] : 200;
            }
        }

        $decoded = json_decode($response, true);

        if ($statusCode >= 400) {
            throw new Exception(
                'Qdrant error (' . $statusCode . '): ' . $response
            );
        }

        return $decoded ?? [];
    }

    public function getCollections(): array
    {
        return $this->request('GET', '/collections');
    }
}