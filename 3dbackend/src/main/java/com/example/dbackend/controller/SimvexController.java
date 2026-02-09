package com.example.dbackend.controller;

import com.example.dbackend.service.AiService; // ✅ 서비스 임포트 필수
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor // ✅ 생성자 주입 자동화
@CrossOrigin(origins = "http://localhost:5173")
public class SimvexController {

    private final AiService aiService; // ✅ 진짜 AI 서비스 연결

    // (기존 partDatabase 코드 등은 그대로 두셔도 됩니다...)

    /**
     * 2. AI 어시스턴트 질문 API (Real OpenAI 연동)
     */
    @PostMapping("/ai/ask")
    public ResponseEntity<Map<String, String>> askAi(@RequestBody Map<String, String> request) {
        String question = request.get("question");
        String currentPart = request.get("currentPart");

        // ✅ [수정됨] 가짜 문자열 대신 실제 AI 서비스를 호출합니다.
        String answer = aiService.getAnswer(currentPart, question);

        Map<String, String> response = new HashMap<>();
        response.put("answer", answer);

        return ResponseEntity.ok(response);
    }

    // (기존 getPartDetail 메서드는 그대로 유지하세요)
}