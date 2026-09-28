package com.taskboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TaskboardApiTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @AfterEach
    void cleanUp() {
        jdbc.update("delete from boards where name like 'test-%'");
    }

    @Test
    void defaultBoardIsSeededWithThreeLists() {
        Integer count = jdbc.queryForObject(
                "select count(*) from lists l join boards b on b.id = l.board_id where b.name = 'マイボード'",
                Integer.class);
        assertThat(count).isEqualTo(3);
    }

    @Test
    void fullFlowAcrossBoardListCardAndSubtask() throws Exception {
        String boardId = createId("/boards", "{\"name\":\"test-flow\"}");
        String todoId = createId("/boards/" + boardId + "/lists", "{\"name\":\"未着手\"}");
        String doneId = createId("/boards/" + boardId + "/lists", "{\"name\":\"完了\"}");
        String cardId = createId("/lists/" + todoId + "/cards", "{\"text\":\"要件を読む\",\"due\":\"2026-09-25\"}");
        String subtaskId = createId("/cards/" + cardId + "/subtasks", "{\"text\":\"10章を読む\"}");

        mvc.perform(get("/boards/" + boardId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("test-flow"))
                .andExpect(jsonPath("$.lists.length()").value(2))
                .andExpect(jsonPath("$.lists[0].name").value("未着手"))
                .andExpect(jsonPath("$.lists[0].order").value(0))
                .andExpect(jsonPath("$.lists[1].order").value(1))
                .andExpect(jsonPath("$.cards[0].text").value("要件を読む"))
                .andExpect(jsonPath("$.cards[0].due").value("2026-09-25"))
                .andExpect(jsonPath("$.cards[0].listId").value(todoId))
                .andExpect(jsonPath("$.cards[0].subtasks[0].text").value("10章を読む"))
                .andExpect(jsonPath("$.cards[0].subtasks[0].done").value(false));

        mvc.perform(patch("/cards/" + cardId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"listId\":\"" + doneId + "\",\"completedAt\":\"2026-09-22\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.listId").value(doneId))
                .andExpect(jsonPath("$.completedAt").value("2026-09-22"))
                .andExpect(jsonPath("$.subtasks.length()").value(1));

        mvc.perform(patch("/cards/" + cardId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"due\":\"\",\"completedAt\":\"\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.due").doesNotExist())
                .andExpect(jsonPath("$.completedAt").doesNotExist());

        mvc.perform(patch("/subtasks/" + subtaskId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"done\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.done").value(true));

        mvc.perform(patch("/lists/" + todoId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"やること\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("やること"));

        mvc.perform(delete("/subtasks/" + subtaskId)).andExpect(status().isNoContent());
        mvc.perform(get("/boards/" + boardId))
                .andExpect(jsonPath("$.cards[0].subtasks.length()").value(0));
    }

    @Test
    void deletingAListRemovesItsCardsAndSubtasks() throws Exception {
        String boardId = createId("/boards", "{\"name\":\"test-cascade\"}");
        String listId = createId("/boards/" + boardId + "/lists", "{\"name\":\"L\"}");
        String cardId = createId("/lists/" + listId + "/cards", "{\"text\":\"c\"}");
        createId("/cards/" + cardId + "/subtasks", "{\"text\":\"s\"}");

        mvc.perform(delete("/lists/" + listId)).andExpect(status().isNoContent());

        mvc.perform(get("/boards/" + boardId))
                .andExpect(jsonPath("$.lists.length()").value(0))
                .andExpect(jsonPath("$.cards.length()").value(0));
        assertThat(jdbc.queryForObject("select count(*) from cards where id = ?::uuid", Integer.class, cardId))
                .isZero();
        assertThat(jdbc.queryForObject("select count(*) from subtasks where card_id = ?::uuid", Integer.class, cardId))
                .isZero();
    }

    @Test
    void newCardsAndSubtasksAreAppendedInOrder() throws Exception {
        String boardId = createId("/boards", "{\"name\":\"test-order\"}");
        String listId = createId("/boards/" + boardId + "/lists", "{\"name\":\"L\"}");
        createId("/lists/" + listId + "/cards", "{\"text\":\"first\"}");
        createId("/lists/" + listId + "/cards", "{\"text\":\"second\"}");
        String third = createId("/lists/" + listId + "/cards", "{\"text\":\"third\"}");
        createId("/cards/" + third + "/subtasks", "{\"text\":\"a\"}");
        createId("/cards/" + third + "/subtasks", "{\"text\":\"b\"}");

        mvc.perform(get("/boards/" + boardId))
                .andExpect(jsonPath("$.cards[0].text").value("first"))
                .andExpect(jsonPath("$.cards[0].order").value(0))
                .andExpect(jsonPath("$.cards[1].text").value("second"))
                .andExpect(jsonPath("$.cards[2].text").value("third"))
                .andExpect(jsonPath("$.cards[2].order").value(2))
                .andExpect(jsonPath("$.cards[2].subtasks[0].text").value("a"))
                .andExpect(jsonPath("$.cards[2].subtasks[1].text").value("b"));
    }

    @Test
    void movingACardToAnotherListPutsItAtTheEnd() throws Exception {
        String boardId = createId("/boards", "{\"name\":\"test-move\"}");
        String fromId = createId("/boards/" + boardId + "/lists", "{\"name\":\"from\"}");
        String toId = createId("/boards/" + boardId + "/lists", "{\"name\":\"to\"}");
        createId("/lists/" + fromId + "/cards", "{\"text\":\"a\"}");
        String moved = createId("/lists/" + fromId + "/cards", "{\"text\":\"b\"}");
        createId("/lists/" + toId + "/cards", "{\"text\":\"x\"}");
        createId("/lists/" + toId + "/cards", "{\"text\":\"y\"}");

        mvc.perform(patch("/cards/" + moved)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"listId\":\"" + toId + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.listId").value(toId))
                .andExpect(jsonPath("$.order").value(2));

        // 同じリストを指定しても並びは変わらない
        mvc.perform(patch("/cards/" + moved)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"listId\":\"" + toId + "\"}"))
                .andExpect(jsonPath("$.order").value(2));

        // 空のリストへ移すと先頭(0)になる
        String emptyId = createId("/boards/" + boardId + "/lists", "{\"name\":\"empty\"}");
        mvc.perform(patch("/cards/" + moved)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"listId\":\"" + emptyId + "\"}"))
                .andExpect(jsonPath("$.order").value(0));

        // order を明示したときはその値になる
        mvc.perform(patch("/cards/" + moved)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"listId\":\"" + toId + "\",\"order\":7}"))
                .andExpect(jsonPath("$.order").value(7));
    }

    @Test
    void invalidInputIsRejectedWithA400AndMessage() throws Exception {
        mvc.perform(post("/boards").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"  \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("name is required"));

        String boardId = createId("/boards", "{\"name\":\"test-invalid\"}");
        String listId = createId("/boards/" + boardId + "/lists", "{\"name\":\"L\"}");

        mvc.perform(post("/lists/" + listId + "/cards")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("text is required"));

        mvc.perform(post("/lists/" + listId + "/cards")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"x\",\"due\":\"not-a-date\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("due must be yyyy-MM-dd"));

        String cardId = createId("/lists/" + listId + "/cards", "{\"text\":\"ok\"}");
        mvc.perform(patch("/cards/" + cardId).contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("text cannot be empty"));

        mvc.perform(patch("/cards/" + cardId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"listId\":\"" + java.util.UUID.randomUUID() + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("listId not found"));

        mvc.perform(post("/boards").contentType(MediaType.APPLICATION_JSON).content("{broken"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unknownResourcesReturn404AndBadIdsReturn400() throws Exception {
        String unknown = java.util.UUID.randomUUID().toString();
        mvc.perform(get("/boards/" + unknown)).andExpect(status().isNotFound());
        mvc.perform(delete("/lists/" + unknown)).andExpect(status().isNotFound());
        mvc.perform(delete("/cards/" + unknown)).andExpect(status().isNotFound());
        mvc.perform(delete("/subtasks/" + unknown)).andExpect(status().isNotFound());
        mvc.perform(post("/boards/" + unknown + "/lists")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"x\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/boards/not-a-uuid")).andExpect(status().isBadRequest());
    }

    @Test
    void cardCanBeReadByIdWithSubtasks() throws Exception {
        String boardId = createId("/boards", "{\"name\":\"test-read\"}");
        String listId = createId("/boards/" + boardId + "/lists", "{\"name\":\"未着手\"}");
        String cardId = createId("/lists/" + listId + "/cards", "{\"text\":\"読むカード\",\"due\":\"2026-10-01\"}");
        createId("/cards/" + cardId + "/subtasks", "{\"text\":\"小項目\"}");

        mvc.perform(get("/cards/" + cardId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(cardId))
                .andExpect(jsonPath("$.text").value("読むカード"))
                .andExpect(jsonPath("$.due").value("2026-10-01"))
                .andExpect(jsonPath("$.subtasks[0].text").value("小項目"));

        mvc.perform(get("/cards/00000000-0000-4000-8000-00000000ffff")).andExpect(status().isNotFound());
        mvc.perform(get("/cards/not-a-uuid")).andExpect(status().isBadRequest());
    }

    @Test
    void cardsCanBeSearchedByKeywordListBoardAndCompletion() throws Exception {
        String boardId = createId("/boards", "{\"name\":\"test-search\"}");
        String otherBoardId = createId("/boards", "{\"name\":\"test-search-other\"}");
        String todoId = createId("/boards/" + boardId + "/lists", "{\"name\":\"未着手\"}");
        String doneId = createId("/boards/" + boardId + "/lists", "{\"name\":\"完了\"}");
        String otherListId = createId("/boards/" + otherBoardId + "/lists", "{\"name\":\"未着手\"}");
        createId("/lists/" + todoId + "/cards", "{\"text\":\"Apple pie\"}");
        String doneCard = createId("/lists/" + doneId + "/cards", "{\"text\":\"apple juice 100%\"}");
        createId("/lists/" + otherListId + "/cards", "{\"text\":\"apple in other board\"}");
        mvc.perform(patch("/cards/" + doneCard)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"completedAt\":\"2026-09-28\"}"))
                .andExpect(status().isOk());
        createId("/cards/" + doneCard + "/subtasks", "{\"text\":\"sub\"}");

        // 大文字小文字を区別しない部分一致 + ボード絞り込み(リスト順 → カード順)
        mvc.perform(get("/cards").param("boardId", boardId).param("keyword", "APPLE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].text").value("Apple pie"))
                .andExpect(jsonPath("$[1].text").value("apple juice 100%"))
                .andExpect(jsonPath("$[1].subtasks[0].text").value("sub"));

        // LIKEのワイルドカードは文字として扱う
        mvc.perform(get("/cards").param("boardId", boardId).param("keyword", "%"))
                .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/cards").param("boardId", boardId).param("keyword", "_"))
                .andExpect(jsonPath("$.length()").value(0));

        // リスト・完了状態の絞り込み
        mvc.perform(get("/cards").param("listId", todoId))
                .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/cards").param("boardId", boardId).param("completed", "true"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(doneCard));
        mvc.perform(get("/cards").param("boardId", boardId).param("completed", "false"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].text").value("Apple pie"));

        // 該当なしは空配列、不正なIDは400
        mvc.perform(get("/cards").param("boardId", boardId).param("keyword", "zzz"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/cards").param("boardId", "bad")).andExpect(status().isBadRequest());
    }

    private String createId(String url, String json) throws Exception {
        String body = mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return JsonPath.read(body, "$.id");
    }
}
