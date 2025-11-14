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
SHOW COLUMNS FROM documents LIKE 'nb_page';
ALTER TABLE documents
    ADD COLUMN nb_download INT NOT NULL DEFAULT 0;

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
