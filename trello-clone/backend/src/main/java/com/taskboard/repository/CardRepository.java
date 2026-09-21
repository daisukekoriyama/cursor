package com.taskboard.repository;

import com.taskboard.domain.Card;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CardRepository extends JpaRepository<Card, UUID> {

    List<Card> findByListIdInOrderBySortOrderAsc(Collection<UUID> listIds);

    @Query("select max(c.sortOrder) from Card c where c.listId = :listId")
    Optional<Integer> findMaxSortOrder(UUID listId);
}
