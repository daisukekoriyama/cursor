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
                        .toList());
    }

    public ListResponse createList(UUID boardId, CreateListRequest request) {
        if (!boards.existsById(boardId)) {
            throw new NotFoundException("board not found");
        }
        int order = lists.findMaxSortOrder(boardId).map(max -> max + 1).orElse(0);
        return toResponse(lists.save(new TaskList(boardId, request.name().trim(), order)));
    }

    public ListResponse updateList(UUID listId, UpdateListRequest request) {
        TaskList list = lists.findById(listId).orElseThrow(notFound("list"));
        if (request.name() != null) {
            list.setName(requireText(request.name(), "name"));
        }
        if (request.order() != null) {
            list.setSortOrder(request.order());
        }
        return toResponse(list);
    }

    public void deleteList(UUID listId) {
        if (!lists.existsById(listId)) {
            throw new NotFoundException("list not found");
        }
        lists.deleteById(listId);
    }

    public CardResponse createCard(UUID listId, CreateCardRequest request) {
        if (!lists.existsById(listId)) {
            throw new NotFoundException("list not found");
        }
        int order = cards.findMaxSortOrder(listId).map(max -> max + 1).orElse(0);
        Card card = cards.save(new Card(listId, request.text().trim(), parseDate(request.due(), "due"), order));
        return toResponse(card, List.of());
    }

    public CardResponse updateCard(UUID cardId, UpdateCardRequest request) {
        Card card = cards.findById(cardId).orElseThrow(notFound("card"));
        if (request.text() != null) {
            card.setText(requireText(request.text(), "text"));
        }
        if (request.due() != null) {
            card.setDue(parseDate(request.due(), "due"));
        }
        if (request.completedAt() != null) {
            card.setCompletedAt(parseDate(request.completedAt(), "completedAt"));
        }
        if (request.listId() != null) {
            if (!lists.existsById(request.listId())) {
                throw new BadRequestException("listId not found");
            }
            card.setListId(request.listId());
        }
        if (request.order() != null) {
            card.setSortOrder(request.order());
        }
        List<SubtaskResponse> cardSubtasks = subtasks.findByCardIdInOrderBySortOrderAsc(List.of(cardId)).stream()
                .map(this::toResponse)
                .toList();
        return toResponse(card, cardSubtasks);
    }

    public void deleteCard(UUID cardId) {
        if (!cards.existsById(cardId)) {
            throw new NotFoundException("card not found");
        }
        cards.deleteById(cardId);
    }

    public SubtaskResponse createSubtask(UUID cardId, CreateSubtaskRequest request) {
        if (!cards.existsById(cardId)) {
            throw new NotFoundException("card not found");
        }
        int order = subtasks.findMaxSortOrder(cardId).map(max -> max + 1).orElse(0);
        return toResponse(subtasks.save(new Subtask(cardId, request.text().trim(), order)));
    }

    public SubtaskResponse updateSubtask(UUID subtaskId, UpdateSubtaskRequest request) {
        Subtask subtask = subtasks.findById(subtaskId).orElseThrow(notFound("subtask"));
        if (request.text() != null) {
            subtask.setText(requireText(request.text(), "text"));
        }
        if (request.done() != null) {
            subtask.setDone(request.done());
        }
        return toResponse(subtask);
    }

    public void deleteSubtask(UUID subtaskId) {
        if (!subtasks.existsById(subtaskId)) {
            throw new NotFoundException("subtask not found");
        }
        subtasks.deleteById(subtaskId);
    }

    private Supplier<NotFoundException> notFound(String what) {
        return () -> new NotFoundException(what + " not found");
    }

    private String requireText(String value, String field) {
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            throw new BadRequestException(field + " cannot be empty");
        }
        return trimmed;
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
        return new ListResponse(list.getId(), list.getBoardId(), list.getName(), list.getSortOrder());
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
