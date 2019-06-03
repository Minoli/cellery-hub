# ------------------------------------------------------------------------
#
# Copyright 2019 WSO2, Inc. (http://wso2.com)
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License
#
# ------------------------------------------------------------------------

DROP DATABASE IF EXISTS CELLERY_HUB;
CREATE DATABASE CELLERY_HUB;
USE CELLERY_HUB;

CREATE USER IF NOT EXISTS 'celleryhub'@'%' IDENTIFIED BY 'celleryhub';
GRANT ALL ON CELLERY_HUB.* TO 'celleryhub'@'%';

# This table is used for acquiring the MySQL write lock for a specific registry artifact
CREATE TABLE IF NOT EXISTS REGISTRY_ARTIFACT_LOCK (
    ARTIFACT_NAME VARCHAR(255) NOT NULL,
    LOCK_COUNT    INT          DEFAULT 0,
    PRIMARY KEY (ARTIFACT_NAME)
)
ENGINE = InnoDB
DEFAULT CHARSET = latin1;

CREATE TABLE IF NOT EXISTS REGISTRY_ORGANIZATION (
    ORG_NAME                 VARCHAR(255)               NOT NULL,
    DESCRIPTION              VARCHAR(255)               DEFAULT "",
    DEFAULT_IMAGE_VISIBILITY ENUM("PUBLIC", "PRIVATE")  NOT NULL DEFAULT "PUBLIC",
    CREATED_DATE             DATETIME                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ORG_NAME)
)
ENGINE = InnoDB
DEFAULT CHARSET = latin1;

CREATE TABLE IF NOT EXISTS REGISTRY_ORG_USER_MAPPING (
    USER_UUID    VARCHAR(36)  NOT NULL,
    ORG_NAME     VARCHAR(255) NOT NULL,
    USER_ROLE    VARCHAR(255) NOT NULL,
    CREATED_DATE DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (USER_UUID, ORG_NAME),
    FOREIGN KEY (ORG_NAME) REFERENCES REGISTRY_ORGANIZATION (ORG_NAME)
        ON DELETE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = latin1;

CREATE TABLE IF NOT EXISTS REGISTRY_ARTIFACT_IMAGE (
    ARTIFACT_IMAGE_ID  VARCHAR(36)                NOT NULL,
    ORG_NAME           VARCHAR(255)               NOT NULL,
    IMAGE_NAME         VARCHAR(255)               NOT NULL,
    DESCRIPTION        VARCHAR(255)               DEFAULT "",
    WEBSITE_URL        VARCHAR(255)               DEFAULT "",
    LICENSE_IDENTIFIER VARCHAR(255)               DEFAULT "",
    API_DOC_URL        VARCHAR(255)               DEFAULT "",
    SOURCE_URL         VARCHAR(255)               DEFAULT "",
    FIRST_AUTHOR       VARCHAR(255)               NOT NULL,
    VISIBILITY         ENUM("PUBLIC", "PRIVATE")  NOT NULL,
    PRIMARY KEY (ARTIFACT_IMAGE_ID),
    CONSTRAINT UC_ARTIFACT_IMG UNIQUE (ORG_NAME, IMAGE_NAME),
    FOREIGN KEY (ORG_NAME) REFERENCES REGISTRY_ORGANIZATION (ORG_NAME)
        ON DELETE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = latin1;

CREATE TABLE IF NOT EXISTS IMAGE_KEYWORDS (
    ARTIFACT_IMAGE_ID VARCHAR(36) NOT NULL,
    KEYWORD           VARCHAR(36) NOT NULL,
    PRIMARY KEY (KEYWORD),
    FOREIGN KEY (ARTIFACT_IMAGE_ID) REFERENCES REGISTRY_ARTIFACT_IMAGE (ARTIFACT_IMAGE_ID)
        ON DELETE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = latin1;

CREATE TABLE IF NOT EXISTS REGISTRY_ARTIFACT (
    ARTIFACT_ID       VARCHAR(36)  NOT NULL,
    ARTIFACT_IMAGE_ID VARCHAR(36)  NOT NULL,
    VERSION           VARCHAR(50)  NOT NULL,
    DESCRIPTION       VARCHAR(255) DEFAULT "",
    PULL_COUNT        INT          DEFAULT 0,
    PUSH_COUNT        INT          DEFAULT 0,
    LAST_AUTHOR       VARCHAR(255) NOT NULL,
    FIRST_AUTHOR      VARCHAR(255) NOT NULL,
    METADATA          BLOB         NOT NULL,
    VERIFIED          BOOL         DEFAULT FALSE,
    STATEFUL          BOOL         DEFAULT FALSE,
    CREATED_DATE      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UPDATED_DATE      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ARTIFACT_ID),
    CONSTRAINT UC_ARTIFACT UNIQUE (ARTIFACT_IMAGE_ID, VERSION),
    FOREIGN KEY (ARTIFACT_IMAGE_ID) REFERENCES REGISTRY_ARTIFACT_IMAGE (ARTIFACT_IMAGE_ID)
        ON DELETE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = latin1;

CREATE TABLE IF NOT EXISTS REGISTRY_ARTIFACT_INGRESS (
    ARTIFACT_ID  VARCHAR(36) NOT NULL,
    INGRESS_TYPE VARCHAR(36) NOT NULL,
    PRIMARY KEY (ARTIFACT_ID, INGRESS_TYPE),
    FOREIGN KEY (ARTIFACT_ID) REFERENCES REGISTRY_ARTIFACT (ARTIFACT_ID)
        ON DELETE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = latin1;

CREATE TABLE IF NOT EXISTS REGISTRY_ARTIFACT_LABEL (
    ARTIFACT_ID VARCHAR(36) NOT NULL,
    LABEL_KEY   VARCHAR(36) NOT NULL,
    LABEL_VALUE VARCHAR(36) NOT NULL,
    PRIMARY KEY (ARTIFACT_ID, LABEL_KEY),
    FOREIGN KEY (ARTIFACT_ID) REFERENCES REGISTRY_ARTIFACT (ARTIFACT_ID)
        ON DELETE CASCADE
)
ENGINE = InnoDB
DEFAULT CHARSET = latin1;