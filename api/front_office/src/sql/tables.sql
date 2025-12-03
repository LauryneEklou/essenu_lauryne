CREATE DATABASE IF NOT EXISTS essenu
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

    USE essenu;

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin_contenu', 'admin_accompagnement', 'visiteur') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );

ALTER TABLE users ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active';

CREATE TABLE categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );

    CREATE TABLE documents (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        uuid CHAR(36) NOT NULL DEFAULT (UUID()),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_url VARCHAR(255),
        image VARCHAR(255),
        type VARCHAR(100),
        nb_page INT,
        category_id BIGINT,
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    ALTER TABLE documents
        ADD COLUMN nb_download INT NOT NULL DEFAULT 0;

SHOW COLUMNS FROM documents LIKE 'nb_page';


    CREATE TABLE news (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image VARCHAR(255),
        nb_vues INT DEFAULT 0,
        category_id BIGINT,
        published_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_news_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        CONSTRAINT fk_news_user FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE SET NULL );

    -- Newsletter subscribers table

    CREATE TABLE newsletter_subcribers (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    -- Newsletter subscribers table (consistent name used by API)
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE comments (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        news_id BIGINT NOT NULL,
        parent_id BIGINT NULL,
        user_id INT NOT NULL,
        content TEXT NOT NULL,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_comments_news FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE,
        CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE SET NULL
    );

CREATE INDEX idx_comments_news ON comments(news_id, created_at DESC);

CREATE TABLE news_views (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    news_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_newsviews_news FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE,
    CONSTRAINT fk_newsviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_news_user (news_id, user_id)
);

    CREATE TABLE services (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        created_by BIGINT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_services_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

CREATE INDEX idx_services_name ON services(name);

-- Table for assistance requests (contact form submissions)

    CREATE TABLE assistance_requests (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        nom VARCHAR(100),
        prenom VARCHAR(100),
        email VARCHAR(255) NOT NULL,
        telephone VARCHAR(50),
        service_id BIGINT NULL,
        service VARCHAR(150) NOT NULL,
        domaine VARCHAR(100),
        message TEXT NOT NULL,
        urgent TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_assistance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_assistance_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
    );

CREATE INDEX idx_assistance_email ON assistance_requests(email);
CREATE INDEX idx_assistance_status_created ON assistance_requests(created_at);

-- Ajout de la colonne `statut` aux demandes d'accompagnement si elle n'existe pas
ALTER TABLE assistance_requests
  ADD COLUMN IF NOT EXISTS statut ENUM('en_attente','acceptee','en_traitement','terminee','refusee') NOT NULL DEFAULT 'en_attente';

-- Index pour recherche par statut
CREATE INDEX idx_assistance_statut ON assistance_requests(statut);

-- ===== Tables pour les réponses / discussion et leurs pièces jointes =====

CREATE TABLE IF NOT EXISTS reponses_assistance (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    assistance_request_id BIGINT NOT NULL,
    user_id INT NULL,
    author_name VARCHAR(150) NULL,
    author_email VARCHAR(255) NULL,
    role ENUM('visiteur','admin') NOT NULL DEFAULT 'visiteur',
    content TEXT NOT NULL,
    parent_id BIGINT NULL,
    is_internal TINYINT(1) NOT NULL DEFAULT 0,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_reponses_assistance_request FOREIGN KEY (assistance_request_id) REFERENCES assistance_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_reponses_assistance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_reponses_assistance_parent FOREIGN KEY (parent_id) REFERENCES reponses_assistance(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_reponses_assistance_request ON reponses_assistance(assistance_request_id, created_at DESC);
CREATE INDEX idx_reponses_assistance_user ON reponses_assistance(user_id);
CREATE INDEX idx_reponses_assistance_is_read ON reponses_assistance(assistance_request_id, is_read);

CREATE TABLE IF NOT EXISTS reponse_attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reponse_id BIGINT NOT NULL,
    storage VARCHAR(50) DEFAULT 'local',
    file_url VARCHAR(1024) NOT NULL,
    filename VARCHAR(255) NULL,
    mime_type VARCHAR(255) NULL,
    file_size INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reponse_attachments_reponse FOREIGN KEY (reponse_id) REFERENCES reponses_assistance(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_reponse_attachments_reponse ON reponse_attachments(reponse_id);
