CREATE DATABASE lostfound;
USE lostfound;

-- USERS
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','user') DEFAULT 'user'
);

-- ITEMS
CREATE TABLE items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    item_name VARCHAR(100) NOT NULL,
    category ENUM('phone','laptop','keys','wallet_purse','charger','miscellaneous') NOT NULL,
    description TEXT,
    location_found VARCHAR(255),
    found_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('listed','claimed','returned','junked') DEFAULT 'listed',
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- CLAIMS
CREATE TABLE claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    proof_text TEXT,
    proof_image VARCHAR(255),
    claim_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    admin_status ENUM('pending','approved','rejected') DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- DEFAULT ADMIN
INSERT INTO users (username, password, role)
VALUES ('admin', 'admin123', 'admin');