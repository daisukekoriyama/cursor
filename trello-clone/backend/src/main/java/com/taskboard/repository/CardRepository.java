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

    /**
     * カード検索。boardId / listId は null で絞り込みなし。pattern は LIKE 用(エスケープ文字は '\\')で、
     * 絞り込みなしなら "%"。completed は null で絞り込みなし。
     */
    @Query("""
            select c from Card c, TaskList l
            where l.id = c.listId
              and l.boardId = coalesce(:boardId, l.boardId)
              and c.listId = coalesce(:listId, c.listId)
              and lower(c.text) like :pattern escape '\\'
              and (:completed is null
                   or (:completed = true and c.completedAt is not null)
                   or (:completed = false and c.completedAt is null))
            order by l.sortOrder, c.sortOrder
            """)
    List<Card> search(UUID boardId, UUID listId, String pattern, Boolean completed);

    @Query("select max(c.sortOrder) from Card c where c.listId = :listId")
    Optional<Integer> findMaxSortOrder(UUID listId);
}
