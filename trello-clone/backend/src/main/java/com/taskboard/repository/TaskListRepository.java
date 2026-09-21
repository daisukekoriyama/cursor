package com.taskboard.repository;

import com.taskboard.domain.TaskList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TaskListRepository extends JpaRepository<TaskList, UUID> {

    List<TaskList> findByBoardIdOrderBySortOrderAsc(UUID boardId);

    @Query("select max(l.sortOrder) from TaskList l where l.boardId = :boardId")
    Optional<Integer> findMaxSortOrder(UUID boardId);
}
