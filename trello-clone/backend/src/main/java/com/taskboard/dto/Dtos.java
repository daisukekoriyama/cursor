package com.taskboard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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

    public record CreateBoardRequest(
            @NotBlank(message = "name is required")
            @Size(max = BOARD_NAME_MAX_LENGTH, message = "name must be at most 255 characters")
            String name) {
    }

    /** ボード名・リスト名の最大文字数。DB の boards.name / lists.name(VARCHAR(255))に合わせる。 */
    public static final int BOARD_NAME_MAX_LENGTH = 255;
    public static final int LIST_NAME_MAX_LENGTH = 255;

    /** 空白だけ(空文字を含む)を弾く。省略(null)は Bean Validation では検査されないので通る。 */
    private static final String NOT_BLANK = "(?!\\s*$)[\\s\\S]*";
    /** "yyyy-MM-dd" の形。空文字・空白だけは期限なしとして通す。実在する日付かはサービスで見る。 */
    private static final String OPTIONAL_DATE = "\\s*(\\d{4}-\\d{2}-\\d{2})?\\s*";

    public record CreateListRequest(
            @NotBlank(message = "name is required")
            @Size(max = LIST_NAME_MAX_LENGTH, message = "name must be at most 255 characters")
            String name) {
    }

    public record UpdateListRequest(
            @Pattern(regexp = NOT_BLANK, message = "name cannot be empty")
            @Size(max = LIST_NAME_MAX_LENGTH, message = "name must be at most 255 characters")
            String name,
            Integer order,
            Boolean done) {
    }

    /** due は "yyyy-MM-dd"。省略または空文字は期限なし。 */
    public record CreateCardRequest(@NotBlank(message = "text is required") String text, String due) {
    }

    /** 省略(null)した項目は変更しない。due / completedAt は空文字を指定すると値を消す。 */
    /** listId だけを指定して別のリストへ移すと、移動先の末尾に置かれる(order を指定するとその値になる)。 */
    public record UpdateCardRequest(
            @Pattern(regexp = NOT_BLANK, message = "text cannot be empty") String text,
            @Pattern(regexp = OPTIONAL_DATE, message = "due must be yyyy-MM-dd") String due,
            UUID listId,
            Integer order,
            @Pattern(regexp = OPTIONAL_DATE, message = "completedAt must be yyyy-MM-dd") String completedAt) {
    }

    public record CreateSubtaskRequest(@NotBlank(message = "text is required") String text) {
    }

    public record UpdateSubtaskRequest(
            @Pattern(regexp = NOT_BLANK, message = "text cannot be empty") String text,
            Boolean done) {
    }
}
