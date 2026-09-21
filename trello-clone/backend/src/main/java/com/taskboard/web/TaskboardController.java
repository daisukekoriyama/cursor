package com.taskboard.web;

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
import com.taskboard.service.TaskboardService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TaskboardController {

    private final TaskboardService service;

    public TaskboardController(TaskboardService service) {
        this.service = service;
    }

    @GetMapping("/boards")
    public List<BoardSummary> listBoards() {
        return service.listBoards();
    }

    @PostMapping("/boards")
    @ResponseStatus(HttpStatus.CREATED)
    public BoardSummary createBoard(@Valid @RequestBody CreateBoardRequest request) {
        return service.createBoard(request);
    }

    @GetMapping("/boards/{boardId}")
    public BoardDetail getBoard(@PathVariable UUID boardId) {
        return service.getBoard(boardId);
    }

    @PostMapping("/boards/{boardId}/lists")
    @ResponseStatus(HttpStatus.CREATED)
    public ListResponse createList(@PathVariable UUID boardId, @Valid @RequestBody CreateListRequest request) {
        return service.createList(boardId, request);
    }

    @PatchMapping("/lists/{listId}")
    public ListResponse updateList(@PathVariable UUID listId, @RequestBody UpdateListRequest request) {
        return service.updateList(listId, request);
    }

    @DeleteMapping("/lists/{listId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteList(@PathVariable UUID listId) {
        service.deleteList(listId);
    }

    @PostMapping("/lists/{listId}/cards")
    @ResponseStatus(HttpStatus.CREATED)
    public CardResponse createCard(@PathVariable UUID listId, @Valid @RequestBody CreateCardRequest request) {
        return service.createCard(listId, request);
    }

    @PatchMapping("/cards/{cardId}")
    public CardResponse updateCard(@PathVariable UUID cardId, @RequestBody UpdateCardRequest request) {
        return service.updateCard(cardId, request);
    }

    @DeleteMapping("/cards/{cardId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCard(@PathVariable UUID cardId) {
        service.deleteCard(cardId);
    }

    @PostMapping("/cards/{cardId}/subtasks")
    @ResponseStatus(HttpStatus.CREATED)
    public SubtaskResponse createSubtask(@PathVariable UUID cardId, @Valid @RequestBody CreateSubtaskRequest request) {
        return service.createSubtask(cardId, request);
    }

    @PatchMapping("/subtasks/{subtaskId}")
    public SubtaskResponse updateSubtask(@PathVariable UUID subtaskId, @RequestBody UpdateSubtaskRequest request) {
        return service.updateSubtask(subtaskId, request);
    }

    @DeleteMapping("/subtasks/{subtaskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSubtask(@PathVariable UUID subtaskId) {
        service.deleteSubtask(subtaskId);
    }
}
