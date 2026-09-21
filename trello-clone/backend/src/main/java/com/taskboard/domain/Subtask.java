package com.taskboard.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "subtasks")
public class Subtask {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "card_id", nullable = false)
    private UUID cardId;

    @Column(nullable = false)
    private String text;

    @Column(nullable = false)
    private boolean done;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected Subtask() {
    }

    public Subtask(UUID cardId, String text, int sortOrder) {
        this.cardId = cardId;
        this.text = text;
        this.sortOrder = sortOrder;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCardId() {
        return cardId;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public boolean isDone() {
        return done;
    }

    public void setDone(boolean done) {
        this.done = done;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
