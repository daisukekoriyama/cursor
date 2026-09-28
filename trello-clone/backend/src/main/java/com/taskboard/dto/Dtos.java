package com.taskboard.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class Dtos {

    private Dtos() {
    }

    public record BoardSummary(UUID id, String name) {
    }

    /** done は完了リストかどうか。ここへ移したカードには completedAt が自動で入る。 */
    public record ListResponse(UUID id, UUID boardId, String name, int order, boolean done) {
    }

    public record SubtaskResponse(UUID id, UUID cardId, String text, boolean done) {
    }

    public record CardResponse(
            UUID id,
            UUID listId,
            int order,
            String text,
            LocalDate due,
            LocalDate completedAt,
            List<SubtaskResponse> subtasks) {
    }

    /** updatedAt は、リスト・カード・小項目を最後に変更した日時(ISO 8601)。まだ変更がなければ null。 */
    public record BoardDetail(
            UUID id, String name, List<ListResponse> lists, List<CardResponse> cards, Instant updatedAt) {
    }

    public record CreateBoardRequest(@NotBlank(message = "name is required") String name) {
    }

    public record CreateListRequest(@NotBlank(message = "name is required") String name) {
    }

    public record UpdateListRequest(String name, Integer order, Boolean done) {
    }

    /** due は "yyyy-MM-dd"。省略または空文字は期限なし。 */
    public record CreateCardRequest(@NotBlank(message = "text is required") String text, String due) {
    }

    /** 省略(null)した項目は変更しない。due / completedAt は空文字を指定すると値を消す。 */
    /** listId だけを指定して別のリストへ移すと、移動先の末尾に置かれる(order を指定するとその値になる)。 */
    public record UpdateCardRequest(
            String text, String due, UUID listId, Integer order, String completedAt) {
    }

    public record CreateSubtaskRequest(@NotBlank(message = "text is required") String text) {
    }

    public record UpdateSubtaskRequest(String text, Boolean done) {
    }
}
