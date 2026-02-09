package com.example.dbackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiService {

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.model}")
    private String chatModel;

    @Value("${openai.embedding.model}")
    private String embeddingModel;

    private final RestClient restClient = RestClient.create();

    public String getAnswer(String partName, String question) {
        String systemPrompt = """
            당신은 'SIMVEX'라는 3D 공학 시뮬레이션 플랫폼의 AI 어시스턴트입니다.
            사용자가 선택한 기계 부품에 대해 공학적 원리, 재질, 역할 등을 전문적이면서도 알기 쉽게 설명해야 합니다.
            답변은 한국어로, 3문장 내외로 핵심만 요약해서 답변하세요.
            """;

        String userPrompt = String.format("현재 선택된 부품: %s\n사용자 질문: %s", partName, question);

        // ✅ [수정] temperature 설정을 제거하여 기본값(1)을 사용하도록 변경
        Map<String, Object> requestBody = Map.of(
                "model", chatModel,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                )
                // "temperature", 0.7  <-- 이 줄을 삭제했습니다.
        );

        try {
            Map response = restClient.post()
                    .uri("https://api.openai.com/v1/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            return (String) message.get("content");

        } catch (Exception e) {
            e.printStackTrace();
            // 에러 메시지를 좀 더 자세히 반환하여 디버깅을 돕습니다.
            return "AI 요청 실패: " + e.getMessage();
        }
    }
}