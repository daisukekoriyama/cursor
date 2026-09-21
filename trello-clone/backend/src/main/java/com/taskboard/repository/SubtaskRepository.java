package com.taskboard.repository;

import com.taskboard.domain.Subtask;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SubtaskRepository extends JpaRepository<Subtask, UUID> {

    List<Subtask> findByCardIdInOrderBySortOrderAsc(Collection<UUID> cardIds);

    @Query("select max(s.sortOrder) from Subtask s where s.cardId = :cardId")
    Optional<Integer> findMaxSortOrder(UUID cardId);
}
