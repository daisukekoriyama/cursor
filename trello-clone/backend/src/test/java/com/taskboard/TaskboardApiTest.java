package com.taskboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
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
    void onlyTheSeededDoneListIsFlaggedAsDone() {
        Integer count = jdbc.queryForObject(
                "select count(*) from lists l join boards b on b.id = l.board_id"
                        + " where b.name = 'マイボード' and l.is_done = (l.name = '完了')",
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
    void doneFlagOnAListDefaultsToFalseAndCanBeChanged() throws Exception {
        String boardId = createId("/boards", "{\"name\":\"test-done-flag\"}");
        String listId = createId("/boards/" + boardId + "/lists", "{\"name\":\"L\"}");

        mvc.perform(get("/boards/" + boardId))
                .andExpect(jsonPath("$.lists[0].done").value(false));

        mvc.perform(patch("/lists/" + listId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"done\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.done").value(true))
                .andExpect(jsonPath("$.name").value("L"));

        // done を省略した更新では変わらない
        mvc.perform(patch("/lists/" + listId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"L2\"}"))
                .andExpect(jsonPath("$.done").value(true));
    }

    @Test
    void movingCardsInAndOutOfADoneListSetsAndClearsCompletedAt() throws Exception {
        String today = LocalDate.now().toString();
        String boardId = createId("/boards", "{\"name\":\"test-done-move\"}");
        String todoId = createId("/boards/" + boardId + "/lists", "{\"name\":\"todo\"}");
        String doneId = createId("/boards/" + boardId + "/lists", "{\"name\":\"done\"}");
        String otherDoneId = createId("/boards/" + boardId + "/lists", "{\"name\":\"done2\"}");
        markDone(doneId);
        markDone(otherDoneId);
        String cardId = createId("/lists/" + todoId + "/cards", "{\"text\":\"a\"}");

        // 完了リストへ入ると今日の日付が入り、検索でも完了として見つかる
        patchCard(cardId, "{\"listId\":\"" + doneId + "\"}").andExpect(jsonPath("$.completedAt").value(today));
        mvc.perform(get("/cards").param("boardId", boardId).param("completed", "true"))
                .andExpect(jsonPath("$.length()").value(1));

        // 完了リスト同士の移動では終了日を変えない
        jdbc.update("update cards set completed_at = date '2026-01-02' where id = ?::uuid", cardId);
        patchCard(cardId, "{\"listId\":\"" + otherDoneId + "\"}").andExpect(jsonPath("$.completedAt").value("2026-01-02"));

        // 完了でないリストへ出ると消える
        patchCard(cardId, "{\"listId\":\"" + todoId + "\"}").andExpect(jsonPath("$.completedAt").doesNotExist());
        mvc.perform(get("/cards").param("boardId", boardId).param("completed", "false"))
                .andExpect(jsonPath("$.length()").value(1));

        // completedAt を明示したときは自動設定より優先する
        patchCard(cardId, "{\"listId\":\"" + doneId + "\",\"completedAt\":\"2026-03-04\"}")
                .andExpect(jsonPath("$.completedAt").value("2026-03-04"));
        patchCard(cardId, "{\"listId\":\"" + todoId + "\",\"completedAt\":\"2026-03-04\"}")
                .andExpect(jsonPath("$.completedAt").value("2026-03-04"));
    }

    @Test
    void aCardCreatedDirectlyInADoneListIsCompletedToday() throws Exception {
        String boardId = createId("/boards", "{\"name\":\"test-done-create\"}");
        String doneId = createId("/boards/" + boardId + "/lists", "{\"name\":\"done\"}");
        String todoId = createId("/boards/" + boardId + "/lists", "{\"name\":\"todo\"}");
        markDone(doneId);

        mvc.perform(post("/lists/" + doneId + "/cards").contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"x\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.completedAt").value(LocalDate.now().toString()));
        mvc.perform(post("/lists/" + todoId + "/cards").contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"y\"}"))
                .andExpect(jsonPath("$.completedAt").doesNotExist());
    }

    @Test
    void aBoardStartsWithoutAnUpdatedAtAndReadsDoNotSetIt() throws Exception {
        String boardId = createId("/boards", "{\"name\":\"test-updated-none\"}");
        String listId = createId("/boards/" + boardId + "/lists", "{\"name\":\"L\"}");
        String cardId = createId("/lists/" + listId + "/cards", "{\"text\":\"a\"}");

        // createBoard 自体では更新されず、中身を変えたときに初めて入る(ここでは上の2つの作成で入っている)
        String other = createId("/boards", "{\"name\":\"test-updated-other\"}");
        mvc.perform(get("/boards/" + other))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updatedAt").doesNotExist());
        assertThat(updatedAt(other)).isNull();

        // 読み取りでは変わらない
        resetUpdatedAt(boardId);
        mvc.perform(get("/boards/" + boardId)).andExpect(status().isOk());
        mvc.perform(get("/cards/" + cardId)).andExpect(status().isOk());
        mvc.perform(get("/cards").param("boardId", boardId)).andExpect(status().isOk());
        mvc.perform(get("/boards")).andExpect(status().isOk());
        assertThat(updatedAt(boardId)).isEqualTo(LONG_AGO);
    }

    @Test
    void everyWriteToTheContentOfABoardRecordsItsUpdatedAt() throws Exception {
        String boardId = createId("/boards", "{\"name\":\"test-updated\"}");
        String[] ids = new String[4]; // list, card, subtask, second card

        assertTouches(boardId, () -> ids[0] = createId("/boards/" + boardId + "/lists", "{\"name\":\"L\"}"));
        assertTouches(boardId, () -> patchOk("/lists/" + ids[0], "{\"name\":\"L2\"}"));
        assertTouches(boardId, () -> ids[1] = createId("/lists/" + ids[0] + "/cards", "{\"text\":\"a\"}"));
        assertTouches(boardId, () -> patchOk("/cards/" + ids[1], "{\"text\":\"b\"}"));
        assertTouches(boardId, () -> ids[2] = createId("/cards/" + ids[1] + "/subtasks", "{\"text\":\"s\"}"));
        assertTouches(boardId, () -> patchOk("/subtasks/" + ids[2], "{\"done\":true}"));
        assertTouches(boardId, () -> deleteOk("/subtasks/" + ids[2]));
        assertTouches(boardId, () -> ids[3] = createId("/lists/" + ids[0] + "/cards", "{\"text\":\"c\"}"));
        assertTouches(boardId, () -> deleteOk("/cards/" + ids[3]));
        assertTouches(boardId, () -> deleteOk("/lists/" + ids[0]));

        // ボード取得のレスポンスに、更新日時(ISO 8601の文字列)が含まれる
        mvc.perform(get("/boards/" + boardId))
                .andExpect(jsonPath("$.updatedAt").isString());
    }

    @Test
    void movingACardToAnotherBoardsListRecordsBothBoards() throws Exception {
        String boardA = createId("/boards", "{\"name\":\"test-updated-a\"}");
        String boardB = createId("/boards", "{\"name\":\"test-updated-b\"}");
        String listA = createId("/boards/" + boardA + "/lists", "{\"name\":\"A\"}");
        String listB = createId("/boards/" + boardB + "/lists", "{\"name\":\"B\"}");
        String cardId = createId("/lists/" + listA + "/cards", "{\"text\":\"a\"}");
        resetUpdatedAt(boardA);
        resetUpdatedAt(boardB);

        patchOk("/cards/" + cardId, "{\"listId\":\"" + listB + "\"}");

        assertThat(updatedAt(boardA)).isAfter(LONG_AGO);
        assertThat(updatedAt(boardB)).isAfter(LONG_AGO);
    }

    @Test
    void aRejectedWriteDoesNotRecordAnUpdate() throws Exception {
        String boardId = createId("/boards", "{\"name\":\"test-updated-rejected\"}");
        String listId = createId("/boards/" + boardId + "/lists", "{\"name\":\"L\"}");
        resetUpdatedAt(boardId);

        mvc.perform(post("/boards/" + boardId + "/lists")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\" \"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(delete("/lists/" + UUID.randomUUID())).andExpect(status().isNotFound());

        assertThat(updatedAt(boardId)).isEqualTo(LONG_AGO);
        assertThat(listId).isNotNull();
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
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("list not found"));

        mvc.perform(post("/boards").contentType(MediaType.APPLICATION_JSON).content("{broken"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listNameOver255CharactersIsRejectedWithA400OnCreateAndRename() throws Exception {
        String boardId = createId("/boards", "{\"name\":\"test-list-length\"}");
        String longName = "a".repeat(256);
        String maxName = "a".repeat(255);

        mvc.perform(post("/boards/" + boardId + "/lists")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + longName + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("name must be at most 255 characters"));

        String listId = createId("/boards/" + boardId + "/lists", "{\"name\":\"" + maxName + "\"}");

        mvc.perform(patch("/lists/" + listId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + longName + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("name must be at most 255 characters"));

        mvc.perform(patch("/lists/" + listId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + maxName + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(maxName));
    }

    @Test
    void boardNameOver255CharactersIsRejectedWithA400() throws Exception {
        mvc.perform(post("/boards")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + "b".repeat(256) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("name must be at most 255 characters"));

        createId("/boards", "{\"name\":\"test-" + "b".repeat(250) + "\"}");
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

    private void markDone(String listId) throws Exception {
        mvc.perform(patch("/lists/" + listId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"done\":true}"))
                .andExpect(status().isOk());
    }

    private org.springframework.test.web.servlet.ResultActions patchCard(String cardId, String json) throws Exception {
        return mvc.perform(patch("/cards/" + cardId).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isOk());
    }

    private static final OffsetDateTime LONG_AGO = OffsetDateTime.parse("2000-01-01T00:00:00Z");

    private OffsetDateTime updatedAt(String boardId) {
        return jdbc.queryForObject(
                "select updated_at from boards where id = ?::uuid", OffsetDateTime.class, boardId);
    }

    private void resetUpdatedAt(String boardId) {
        jdbc.update("update boards set updated_at = ?::timestamptz where id = ?::uuid", LONG_AGO.toString(), boardId);
    }

    private interface Action {
        void run() throws Exception;
    }

    /** 過去の日時に戻してから操作し、更新日時が新しくなったことを確かめる。 */
    private void assertTouches(String boardId, Action action) throws Exception {
        resetUpdatedAt(boardId);
        action.run();
        assertThat(updatedAt(boardId)).isAfter(LONG_AGO);
    }

    private void patchOk(String url, String json) throws Exception {
        mvc.perform(patch(url).contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isOk());
    }

    private void deleteOk(String url) throws Exception {
        mvc.perform(delete(url)).andExpect(status().isNoContent());
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
