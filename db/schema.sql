DROP DATABASE IF EXISTS crm_db;

CREATE DATABASE crm_db;

USE crm_db;

CREATE TABLE stages (
  id INT NOT NULL AUTO_INCREMENT,
  stage VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE roles (
  id INT NOT NULL AUTO_INCREMENT,
  role VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE security_questions (
  id INT NOT NULL AUTO_INCREMENT,
  security_question TEXT NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE users (
	id INT NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
	email VARCHAR(255) NOT NULL UNIQUE,
	password_hash VARCHAR(255) NOT NULL,
  security_question_id INT NOT NULL,
  security_answer TEXT NOT NULL,
  role_id INT NOT NULL,
	PRIMARY KEY (id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (security_question_id) REFERENCES security_questions(id)  
);

CREATE TABLE accounts (
  id INT NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  company VARCHAR(255) NULL,
  address VARCHAR(255) NULL,
  city VARCHAR(255) NULL,
  state VARCHAR(50) NULL,
  zip VARCHAR(10) NULL,
  phone VARCHAR(100) NULL,
  cell VARCHAR(100) NULL,
  annual_revenue VARCHAR(100) NULL,
  user_id INT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE notes (
  id INT NOT NULL AUTO_INCREMENT,
  note TEXT NOT NULL,
  tim TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id INT NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE account_stages(
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  tim TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  amount INT NOT NULL,
  stage_id INT NOT NULL,
  FOREIGN KEY (stage_id) REFERENCES stages(id),
  account_id INT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  PRIMARY KEY (id)
);

CREATE TABLE account_stage_notes(
  account_stage_id INT NOT NULL,
  FOREIGN KEY (account_stage_id) REFERENCES account_stages(id),
  note_id INT NOT NULL,
  FOREIGN KEY (note_id) REFERENCES notes(id)
);

CREATE TABLE account_notes (
  note_id INT NOT NULL,
  FOREIGN KEY (note_id) REFERENCES notes(id),
  account_id INT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE todos (
  id INT NOT NULL AUTO_INCREMENT,
  todo VARCHAR(255) NOT NULL,
  due TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  account_stage_id INT NOT NULL,
  FOREIGN KEY (account_stage_id) REFERENCES account_stages(id),
  PRIMARY KEY (id)
);