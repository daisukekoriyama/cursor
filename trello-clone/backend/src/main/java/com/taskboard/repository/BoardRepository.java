package com.taskboard.repository;

import com.taskboard.domain.Board;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardRepository extends JpaRepository<Board, UUID> {
}
