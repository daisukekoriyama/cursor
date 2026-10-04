package com.taskboard.service;

import com.taskboard.domain.Board;
import com.taskboard.domain.Card;
import com.taskboard.domain.Subtask;
import com.taskboard.domain.TaskList;
import com.taskboard.dto.Dtos.BoardDetail;
import com.taskboard.dto.Dtos.BoardSummary;
import com.taskboard.dto.Dtos.CardResponse;
import com.taskboard.dto.Dtos.CreateBoardRequest;
import com.taskboard.dto.Dtos.CreateCardRequest;
import com.taskboard.dto.Dtos.CreateListRequest;
import com.taskboard.dto.Dtos.CreateSubtaskRequest;
import com.taskboard.dto.Dtos.ListResponse;
import com.taskboard.dto.Dtos.SubtaskResponse;
import com.taskboard.dto.Dtos.UpdateCardRequest;
import com.taskboard.dto.Dtos.UpdateListRequest;
import com.taskboard.dto.Dtos.UpdateSubtaskRequest;
import com.taskboard.repository.BoardRepository;
import com.taskboard.repository.CardRepository;
import com.taskboard.repository.SubtaskRepository;
import com.taskboard.repository.TaskListRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class TaskboardService {

    private final BoardRepository boards;
    private final TaskListRepository lists;
    private final CardRepository cards;
    private final SubtaskRepository subtasks;

    public TaskboardService(
            BoardRepository boards,
            TaskListRepository lists,
            CardRepository cards,
            SubtaskRepository subtasks) {
        this.boards = boards;
        this.lists = lists;
        this.cards = cards;
        this.subtasks = subtasks;
    }

    @Transactional(readOnly = true)
    public List<BoardSummary> listBoards() {
        return boards.findAll().stream().map(b -> new BoardSummary(b.getId(), b.getName())).toList();
    }

    public BoardSummary createBoard(CreateBoardRequest request) {
        Board board = boards.save(new Board(request.name().trim()));
        return new BoardSummary(board.getId(), board.getName());
    }

    @Transactional(readOnly = true)
    public BoardDetail getBoard(UUID boardId) {
        Board board = boards.findById(boardId).orElseThrow(notFound("board"));

        List<TaskList> boardLists = lists.findByBoardIdOrderBySortOrderAsc(boardId);
        List<UUID> listIds = boardLists.stream().map(TaskList::getId).toList();
        List<Card> boardCards = listIds.isEmpty() ? List.of() : cards.findByListIdInOrderBySortOrderAsc(listIds);
        List<UUID> cardIds = boardCards.stream().map(Card::getId).toList();
        Map<UUID, List<SubtaskResponse>> subtasksByCard = cardIds.isEmpty()
                ? Map.of()
                : subtasks.findByCardIdInOrderBySortOrderAsc(cardIds).stream()
                        .collect(Collectors.groupingBy(Subtask::getCardId, Collectors.mapping(this::toResponse, Collectors.toList())));

        return new BoardDetail(
                board.getId(),
                board.getName(),
                boardLists.stream().map(this::toResponse).toList(),
                boardCards.stream()
                        .map(c -> toResponse(c, subtasksByCard.getOrDefault(c.getId(), List.of())))
                        .toList(),
                board.getUpdatedAt());
    }

    @Transactional(readOnly = true)
    public CardResponse getCard(UUID cardId) {
        Card card = cards.findById(cardId).orElseThrow(notFound("card"));
        return toResponse(card, subtasksOf(List.of(cardId)).getOrDefault(cardId, List.of()));
    }

    /** 条件はすべてAND。keyword は大文字小文字を区別しない部分一致。省略した条件は絞り込まない。 */
    @Transactional(readOnly = true)
    public List<CardResponse> searchCards(UUID boardId, UUID listId, String keyword, Boolean completed) {
        String trimmed = keyword == null ? "" : keyword.trim().toLowerCase();
        String pattern = "%" + trimmed.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
        List<Card> found = cards.search(boardId, listId, pattern, completed);
        Map<UUID, List<SubtaskResponse>> subtasksByCard = subtasksOf(found.stream().map(Card::getId).toList());
        return found.stream().map(c -> toResponse(c, subtasksByCard.getOrDefault(c.getId(), List.of()))).toList();
    }

    private Map<UUID, List<SubtaskResponse>> subtasksOf(List<UUID> cardIds) {
        if (cardIds.isEmpty()) {
            return Map.of();
        }
        return subtasks.findByCardIdInOrderBySortOrderAsc(cardIds).stream()
                .collect(Collectors.groupingBy(Subtask::getCardId, Collectors.mapping(this::toResponse, Collectors.toList())));
    }

    public ListResponse createList(UUID boardId, CreateListRequest request) {
        if (!boards.existsById(boardId)) {
            throw new NotFoundException("board not found");
        }
        int order = lists.findMaxSortOrder(boardId).map(max -> max + 1).orElse(0);
        touchBoard(boardId);
        return toResponse(lists.save(new TaskList(boardId, request.name().trim(), order)));
    }

    public ListResponse updateList(UUID listId, UpdateListRequest request) {
        TaskList list = lists.findById(listId).orElseThrow(notFound("list"));
        if (request.name() != null) {
            list.setName(request.name().trim());
        }
        if (request.order() != null) {
            list.setSortOrder(request.order());
        }
        if (request.done() != null) {
            if (request.done() && !list.isDone()) {
                requireNoOtherDoneList(list);
            }
            list.setDone(request.done());
        }
        touchBoard(list.getBoardId());
        return toResponse(list);
    }

    // 1 ボードに完了リストは 1 つまで。別の完了リストが残っているときは、先に外してもらう
    private void requireNoOtherDoneList(TaskList list) {
        boolean another = lists.findByBoardIdOrderBySortOrderAsc(list.getBoardId()).stream()
                .anyMatch(other -> other.isDone() && !other.getId().equals(list.getId()));
        if (another) {
            throw new BadRequestException("board already has a done list");
        }
    }

    public void deleteList(UUID listId) {
        TaskList list = lists.findById(listId).orElseThrow(notFound("list"));
        touchBoard(list.getBoardId());
        lists.deleteById(listId);
    }

    public CardResponse createCard(UUID listId, CreateCardRequest request) {
        TaskList list = lists.findById(listId).orElseThrow(notFound("list"));
        int order = cards.findMaxSortOrder(listId).map(max -> max + 1).orElse(0);
        Card card = new Card(listId, request.text().trim(), parseDate(request.due(), "due"), order);
        if (list.isDone()) {
            card.setCompletedAt(LocalDate.now());
        }
        touchBoard(list.getBoardId());
        return toResponse(cards.save(card), List.of());
    }

    public CardResponse updateCard(UUID cardId, UpdateCardRequest request) {
        Card card = cards.findById(cardId).orElseThrow(notFound("card"));
        UUID fromListId = card.getListId();
        if (request.text() != null) {
            card.setText(request.text().trim());
        }
        if (request.due() != null) {
            card.setDue(parseDate(request.due(), "due"));
        }
        if (request.listId() != null) {
            TaskList target = lists.findById(request.listId()).orElseThrow(notFound("list"));
            if (!request.listId().equals(card.getListId())) {
                moveCard(card, target, request.order() == null);
            }
        }
        // completedAt を明示したときは、移動による自動設定より優先する
        if (request.completedAt() != null) {
            card.setCompletedAt(parseDate(request.completedAt(), "completedAt"));
        }
        if (request.order() != null) {
            card.setSortOrder(request.order());
        }
        // 別のボードのリストへ移したときは、移動元と移動先の両方を更新する
        touchBoardOfList(fromListId);
        touchBoardOfList(card.getListId());
        List<SubtaskResponse> cardSubtasks = subtasks.findByCardIdInOrderBySortOrderAsc(List.of(cardId)).stream()
                .map(this::toResponse)
                .toList();
        return toResponse(card, cardSubtasks);
    }

    public void deleteCard(UUID cardId) {
        Card card = cards.findById(cardId).orElseThrow(notFound("card"));
        touchBoardOfList(card.getListId());
        cards.deleteById(cardId);
    }

    public SubtaskResponse createSubtask(UUID cardId, CreateSubtaskRequest request) {
        Card card = cards.findById(cardId).orElseThrow(notFound("card"));
        touchBoardOfList(card.getListId());
        int order = subtasks.findMaxSortOrder(cardId).map(max -> max + 1).orElse(0);
        return toResponse(subtasks.save(new Subtask(cardId, request.text().trim(), order)));
    }

    public SubtaskResponse updateSubtask(UUID subtaskId, UpdateSubtaskRequest request) {
        Subtask subtask = subtasks.findById(subtaskId).orElseThrow(notFound("subtask"));
        if (request.text() != null) {
            subtask.setText(request.text().trim());
        }
        if (request.done() != null) {
            subtask.setDone(request.done());
        }
        touchBoardOfCard(subtask.getCardId());
        return toResponse(subtask);
    }

    public void deleteSubtask(UUID subtaskId) {
        Subtask subtask = subtasks.findById(subtaskId).orElseThrow(notFound("subtask"));
        touchBoardOfCard(subtask.getCardId());
        subtasks.deleteById(subtaskId);
    }

    /**
     * 別のリストへ移す。完了リストへ入るときは終了日(空のときだけ今日)を入れ、完了リストから
     * 完了でないリストへ出るときは終了日を消す。append が true なら移動先の末尾に置く。
     */
    private void moveCard(Card card, TaskList target, boolean append) {
        boolean fromDone = lists.findById(card.getListId()).map(TaskList::isDone).orElse(false);
        if (append) {
            card.setSortOrder(cards.findMaxSortOrder(target.getId()).map(max -> max + 1).orElse(0));
        }
        if (target.isDone()) {
            if (card.getCompletedAt() == null) {
                card.setCompletedAt(LocalDate.now());
            }
        } else if (fromDone) {
            card.setCompletedAt(null);
        }
        card.setListId(target.getId());
    }

    // ボードの中身を変えたときに、最終更新の日時を今にする(ボード自体の作成では呼ばない)
    private void touchBoard(UUID boardId) {
        boards.findById(boardId).ifPresent(board -> board.setUpdatedAt(Instant.now()));
    }

    private void touchBoardOfList(UUID listId) {
        lists.findById(listId).ifPresent(list -> touchBoard(list.getBoardId()));
    }

    private void touchBoardOfCard(UUID cardId) {
        cards.findById(cardId).ifPresent(card -> touchBoardOfList(card.getListId()));
    }

    private Supplier<NotFoundException> notFound(String what) {
        return () -> new NotFoundException(what + " not found");
    }

    private LocalDate parseDate(String value, String field) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw new BadRequestException(field + " must be yyyy-MM-dd");
        }
    }

    private ListResponse toResponse(TaskList list) {
        return new ListResponse(list.getId(), list.getBoardId(), list.getName(), list.getSortOrder(), list.isDone());
    }

    private CardResponse toResponse(Card card, List<SubtaskResponse> cardSubtasks) {
        return new CardResponse(
                card.getId(),
                card.getListId(),
                card.getSortOrder(),
                card.getText(),
                card.getDue(),
                card.getCompletedAt(),
                cardSubtasks);
    }

    private SubtaskResponse toResponse(Subtask subtask) {
        return new SubtaskResponse(subtask.getId(), subtask.getCardId(), subtask.getText(), subtask.isDone());
    }
}
