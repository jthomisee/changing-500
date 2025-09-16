# DynamoDB Table for Games
resource "aws_dynamodb_table" "games_table" {
  name           = "${var.project_name}-games-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "createdBy"
    type = "S"
  }

  global_secondary_index {
    name            = "date-index"
    hash_key        = "date"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "createdBy-index"
    hash_key        = "createdBy"
    projection_type = "ALL"
  }

  global_secondary_index {
    name               = "status-date-index"
    hash_key           = "status"
    range_key          = "date"
    projection_type    = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-games-${var.environment}"
  })
}

# DynamoDB Table for Users
resource "aws_dynamodb_table" "users_table" {
  name           = "${var.project_name}-users-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "phone"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "phone-index"
    hash_key        = "phone"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-users-${var.environment}"
  })
}

# DynamoDB Table for Groups
resource "aws_dynamodb_table" "groups_table" {
  name           = "${var.project_name}-groups-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "groupId"

  attribute {
    name = "groupId"
    type = "S"
  }

  attribute {
    name = "name"
    type = "S"
  }

  global_secondary_index {
    name            = "name-index"
    hash_key        = "name"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-groups-${var.environment}"
  })
}

# DynamoDB Table for User-Group Memberships
resource "aws_dynamodb_table" "user_groups_table" {
  name           = "${var.project_name}-user-groups-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"
  range_key      = "groupId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "groupId"
    type = "S"
  }

  global_secondary_index {
    name            = "groupId-index"
    hash_key        = "groupId"
    range_key       = "userId"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-user-groups-${var.environment}"
  })
}
