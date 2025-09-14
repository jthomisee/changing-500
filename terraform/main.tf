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

# IAM Role for Lambda
resource "aws_iam_role" "lambda_execution_role" {
  name = "${var.project_name}-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# IAM Policy for Lambda to access DynamoDB
resource "aws_iam_policy" "lambda_dynamodb_policy" {
  name        = "${var.project_name}-lambda-dynamodb-policy-${var.environment}"
  description = "IAM policy for Lambda to access DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.games_table.arn,
          "${aws_dynamodb_table.games_table.arn}/index/*",
          aws_dynamodb_table.users_table.arn,
          "${aws_dynamodb_table.users_table.arn}/index/*",
          aws_dynamodb_table.groups_table.arn,
          "${aws_dynamodb_table.groups_table.arn}/index/*",
          aws_dynamodb_table.user_groups_table.arn,
          "${aws_dynamodb_table.user_groups_table.arn}/index/*"
        ]
      }
    ]
  })
}

# Attach policies to Lambda role
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_execution_role.name
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb_policy" {
  policy_arn = aws_iam_policy.lambda_dynamodb_policy.arn
  role       = aws_iam_role.lambda_execution_role.name
}

# Lambda function package
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "../lambda"
  output_path = "lambda.zip"
}

# Get Games Lambda Function
resource "aws_lambda_function" "get_games" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-get-games-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "getGames.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      TABLE_NAME             = aws_dynamodb_table.games_table.name
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
    }
  }

  tags = local.common_tags
}

# Create Game Lambda Function
resource "aws_lambda_function" "create_game" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-create-game-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "createGame.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      TABLE_NAME             = aws_dynamodb_table.games_table.name
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
    }
  }

  tags = local.common_tags
}

# Update Game Lambda Function
resource "aws_lambda_function" "update_game" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-update-game-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "updateGame.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      TABLE_NAME             = aws_dynamodb_table.games_table.name
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
    }
  }

  tags = local.common_tags
}

# Delete Game Lambda Function
resource "aws_lambda_function" "delete_game" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-delete-game-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "deleteGame.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      TABLE_NAME             = aws_dynamodb_table.games_table.name
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
    }
  }

  tags = local.common_tags
}


# Register User Lambda Function
resource "aws_lambda_function" "register_user" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-register-user-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "registerUser.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      USERS_TABLE_NAME = aws_dynamodb_table.users_table.name
    }
  }

  tags = local.common_tags
}

# Login User Lambda Function
resource "aws_lambda_function" "login_user" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-login-user-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "loginUser.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      USERS_TABLE_NAME = aws_dynamodb_table.users_table.name
    }
  }

  tags = local.common_tags
}

# Search Users Lambda Function
resource "aws_lambda_function" "search_users" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-search-users-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "searchUsers.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      USERS_TABLE_NAME = aws_dynamodb_table.users_table.name
    }
  }

  tags = local.common_tags
}

# List Users Lambda Function (Admin only)
resource "aws_lambda_function" "list_users" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-list-users-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "listUsers.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      USERS_TABLE_NAME = aws_dynamodb_table.users_table.name
    }
  }

  tags = local.common_tags
}

# Update User Lambda Function (Admin only)
resource "aws_lambda_function" "update_user" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-update-user-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "updateUser.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      USERS_TABLE_NAME = aws_dynamodb_table.users_table.name
    }
  }

  tags = local.common_tags
}

# Update My Profile Lambda Function (User self-edit)
resource "aws_lambda_function" "update_my_profile" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-update-my-profile-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "updateMyProfile.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      USERS_TABLE_NAME = aws_dynamodb_table.users_table.name
    }
  }

  tags = local.common_tags
}

# Change Password Lambda Function (User self-edit)
resource "aws_lambda_function" "change_password" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-change-password-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "changePassword.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      USERS_TABLE_NAME = aws_dynamodb_table.users_table.name
    }
  }

  tags = local.common_tags
}

# Reset User Password Lambda Function (Admin only)
resource "aws_lambda_function" "reset_user_password" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-reset-user-password-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "resetUserPassword.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      USERS_TABLE_NAME = aws_dynamodb_table.users_table.name
    }
  }

  tags = local.common_tags
}

# Delete User Lambda Function (Admin only)
resource "aws_lambda_function" "delete_user" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-delete-user-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "deleteUser.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      USERS_TABLE_NAME       = aws_dynamodb_table.users_table.name
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
      GAMES_TABLE_NAME       = aws_dynamodb_table.games_table.name
    }
  }

  tags = local.common_tags
}

# Convert Stub User Lambda Function (Admin only)
resource "aws_lambda_function" "convert_stub_user" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-convert-stub-user-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "convertStubUser.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      USERS_TABLE_NAME = aws_dynamodb_table.users_table.name
    }
  }

  tags = local.common_tags
}

# Merge Stub User Lambda Function (Admin only)
resource "aws_lambda_function" "merge_stub_user" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-merge-stub-user-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "mergeStubUser.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      USERS_TABLE_NAME       = aws_dynamodb_table.users_table.name
      GAMES_TABLE_NAME       = aws_dynamodb_table.games_table.name
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
    }
  }

  tags = local.common_tags
}

# Create Group Lambda Function (Admin only)
resource "aws_lambda_function" "create_group" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-create-group-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "createGroup.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      GROUPS_TABLE_NAME     = aws_dynamodb_table.groups_table.name
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
    }
  }

  tags = local.common_tags
}

# List User Groups Lambda Function
resource "aws_lambda_function" "list_groups" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-list-groups-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "listGroups.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      GROUPS_TABLE_NAME     = aws_dynamodb_table.groups_table.name
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
    }
  }

  tags = local.common_tags
}

# Join Group Lambda Function
resource "aws_lambda_function" "join_group" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-join-group-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "joinGroup.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      GROUPS_TABLE_NAME     = aws_dynamodb_table.groups_table.name
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
    }
  }

  tags = local.common_tags
}

# Manage Group Members Lambda Function
resource "aws_lambda_function" "manage_group_members" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-manage-group-members-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "manageGroupMembers.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      GROUPS_TABLE_NAME      = aws_dynamodb_table.groups_table.name
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
      USERS_TABLE_NAME       = aws_dynamodb_table.users_table.name
    }
  }

  tags = local.common_tags
}

# List Group Users Lambda Function
resource "aws_lambda_function" "list_group_users" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-list-group-users-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "listGroupUsers.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
      USERS_TABLE_NAME       = aws_dynamodb_table.users_table.name
    }
  }

  tags = local.common_tags
}

# Create Stub User Lambda Function
resource "aws_lambda_function" "create_stub_user" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-create-stub-user-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "createStubUser.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      USERS_TABLE_NAME       = aws_dynamodb_table.users_table.name
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
    }
  }

  tags = local.common_tags
}

# API Gateway
resource "aws_api_gateway_rest_api" "changing_500_api" {
  name        = "${var.project_name}-api-${var.environment}"
  description = "API for Changing 500"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = local.common_tags
}

# API Gateway Resource
resource "aws_api_gateway_resource" "games_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_rest_api.changing_500_api.root_resource_id
  path_part   = "games"
}

# API Gateway Resource for individual games
resource "aws_api_gateway_resource" "game_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.games_resource.id
  path_part   = "{id}"
}


# API Gateway Resource for user endpoints
resource "aws_api_gateway_resource" "users_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_rest_api.changing_500_api.root_resource_id
  path_part   = "users"
}

resource "aws_api_gateway_resource" "users_register_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.users_resource.id
  path_part   = "register"
}

resource "aws_api_gateway_resource" "users_login_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.users_resource.id
  path_part   = "login"
}

resource "aws_api_gateway_resource" "users_search_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.users_resource.id
  path_part   = "search"
}

resource "aws_api_gateway_resource" "users_manage_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.users_resource.id
  path_part   = "manage"
}

resource "aws_api_gateway_resource" "user_manage_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.users_manage_resource.id
  path_part   = "{userId}"
}

resource "aws_api_gateway_resource" "users_profile_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.users_resource.id
  path_part   = "profile"
}

resource "aws_api_gateway_resource" "users_password_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.users_resource.id
  path_part   = "password"
}

resource "aws_api_gateway_resource" "users_reset_password_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.user_manage_resource.id
  path_part   = "reset-password"
}

resource "aws_api_gateway_resource" "user_convert_stub_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.user_manage_resource.id
  path_part   = "convert-stub"
}

resource "aws_api_gateway_resource" "user_merge_stub_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.user_manage_resource.id
  path_part   = "merge-stub"
}

# Groups API Resources
resource "aws_api_gateway_resource" "groups_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_rest_api.changing_500_api.root_resource_id
  path_part   = "groups"
}

resource "aws_api_gateway_resource" "group_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.groups_resource.id
  path_part   = "{groupId}"
}

resource "aws_api_gateway_resource" "group_join_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.group_resource.id
  path_part   = "join"
}

resource "aws_api_gateway_resource" "group_members_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.group_resource.id
  path_part   = "members"
}

resource "aws_api_gateway_resource" "group_member_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.group_members_resource.id
  path_part   = "{userId}"
}

resource "aws_api_gateway_resource" "group_users_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.group_resource.id
  path_part   = "users"
}

resource "aws_api_gateway_resource" "group_stub_users_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.group_resource.id
  path_part   = "stub-users"
}

# API Gateway Methods
resource "aws_api_gateway_method" "get_games_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.games_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "post_games_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.games_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "put_game_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.game_resource.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "delete_game_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.game_resource.id
  http_method   = "DELETE"
  authorization = "NONE"
}


# User Registration Methods
resource "aws_api_gateway_method" "users_register_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.users_register_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "users_register_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.users_register_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# User Login Methods
resource "aws_api_gateway_method" "users_login_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.users_login_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "users_login_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.users_login_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# User Search Methods
resource "aws_api_gateway_method" "users_search_get_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.users_search_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "users_search_post_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.users_search_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "users_search_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.users_search_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# User Management Methods (Admin only)
resource "aws_api_gateway_method" "users_manage_get_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.users_manage_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "users_manage_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.users_manage_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "user_manage_put_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.user_manage_resource.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "user_manage_delete_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.user_manage_resource.id
  http_method   = "DELETE"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "user_manage_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.user_manage_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Convert Stub User Methods
resource "aws_api_gateway_method" "user_convert_stub_put_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.user_convert_stub_resource.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "user_convert_stub_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.user_convert_stub_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Merge Stub User Methods
resource "aws_api_gateway_method" "user_merge_stub_post_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.user_merge_stub_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "user_merge_stub_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.user_merge_stub_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# User Profile Methods (self-edit)
resource "aws_api_gateway_method" "users_profile_put_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.users_profile_resource.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "users_profile_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.users_profile_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# User Password Change Methods
resource "aws_api_gateway_method" "users_password_put_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.users_password_resource.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "users_password_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.users_password_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# User Reset Password Methods (Admin only)
resource "aws_api_gateway_method" "users_reset_password_put_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.users_reset_password_resource.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "users_reset_password_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.users_reset_password_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Groups API Methods
resource "aws_api_gateway_method" "groups_get_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.groups_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "groups_post_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.groups_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "groups_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.groups_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "group_join_post_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.group_join_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "group_join_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.group_join_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Group Members Management Methods
resource "aws_api_gateway_method" "group_members_get_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.group_members_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "group_members_post_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.group_members_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "group_members_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.group_members_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "group_member_put_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.group_member_resource.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "group_member_delete_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.group_member_resource.id
  http_method   = "DELETE"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "group_member_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.group_member_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Group Users Methods
resource "aws_api_gateway_method" "group_users_get_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.group_users_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "group_users_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.group_users_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Group Stub Users Methods
resource "aws_api_gateway_method" "group_stub_users_post_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.group_stub_users_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "group_stub_users_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.group_stub_users_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# API Gateway Integrations
resource "aws_api_gateway_integration" "get_games_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.games_resource.id
  http_method = aws_api_gateway_method.get_games_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_games.invoke_arn
}

resource "aws_api_gateway_integration" "post_games_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.games_resource.id
  http_method = aws_api_gateway_method.post_games_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_game.invoke_arn
}

resource "aws_api_gateway_integration" "put_game_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.game_resource.id
  http_method = aws_api_gateway_method.put_game_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.update_game.invoke_arn
}

resource "aws_api_gateway_integration" "delete_game_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.game_resource.id
  http_method = aws_api_gateway_method.delete_game_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.delete_game.invoke_arn
}


# User Registration Integrations
resource "aws_api_gateway_integration" "users_register_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_register_resource.id
  http_method = aws_api_gateway_method.users_register_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.register_user.invoke_arn
}

resource "aws_api_gateway_integration" "users_register_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_register_resource.id
  http_method = aws_api_gateway_method.users_register_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# User Login Integrations
resource "aws_api_gateway_integration" "users_login_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_login_resource.id
  http_method = aws_api_gateway_method.users_login_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.login_user.invoke_arn
}

resource "aws_api_gateway_integration" "users_login_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_login_resource.id
  http_method = aws_api_gateway_method.users_login_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# User Search Integrations
resource "aws_api_gateway_integration" "users_search_get_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_search_resource.id
  http_method = aws_api_gateway_method.users_search_get_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.search_users.invoke_arn
}

resource "aws_api_gateway_integration" "users_search_post_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_search_resource.id
  http_method = aws_api_gateway_method.users_search_post_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.search_users.invoke_arn
}

resource "aws_api_gateway_integration" "users_search_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_search_resource.id
  http_method = aws_api_gateway_method.users_search_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# User Management Integrations
resource "aws_api_gateway_integration" "users_manage_get_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_manage_resource.id
  http_method = aws_api_gateway_method.users_manage_get_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.list_users.invoke_arn
}

resource "aws_api_gateway_integration" "users_manage_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_manage_resource.id
  http_method = aws_api_gateway_method.users_manage_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_integration" "user_manage_put_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.user_manage_resource.id
  http_method = aws_api_gateway_method.user_manage_put_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.update_user.invoke_arn
}

resource "aws_api_gateway_integration" "user_manage_delete_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.user_manage_resource.id
  http_method = aws_api_gateway_method.user_manage_delete_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.delete_user.invoke_arn
}

resource "aws_api_gateway_integration" "user_manage_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.user_manage_resource.id
  http_method = aws_api_gateway_method.user_manage_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# Convert Stub User Integrations
resource "aws_api_gateway_integration" "user_convert_stub_put_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.user_convert_stub_resource.id
  http_method = aws_api_gateway_method.user_convert_stub_put_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.convert_stub_user.invoke_arn
}

resource "aws_api_gateway_integration" "user_convert_stub_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.user_convert_stub_resource.id
  http_method = aws_api_gateway_method.user_convert_stub_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# Merge Stub User Integrations
resource "aws_api_gateway_integration" "user_merge_stub_post_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.user_merge_stub_resource.id
  http_method = aws_api_gateway_method.user_merge_stub_post_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.merge_stub_user.invoke_arn
}

resource "aws_api_gateway_integration" "user_merge_stub_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.user_merge_stub_resource.id
  http_method = aws_api_gateway_method.user_merge_stub_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# User Profile Integrations
resource "aws_api_gateway_integration" "users_profile_put_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_profile_resource.id
  http_method = aws_api_gateway_method.users_profile_put_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.update_my_profile.invoke_arn
}

resource "aws_api_gateway_integration" "users_profile_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_profile_resource.id
  http_method = aws_api_gateway_method.users_profile_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# User Password Change Integrations
resource "aws_api_gateway_integration" "users_password_put_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_password_resource.id
  http_method = aws_api_gateway_method.users_password_put_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.change_password.invoke_arn
}

resource "aws_api_gateway_integration" "users_password_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_password_resource.id
  http_method = aws_api_gateway_method.users_password_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# User Reset Password Integrations
resource "aws_api_gateway_integration" "users_reset_password_put_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_reset_password_resource.id
  http_method = aws_api_gateway_method.users_reset_password_put_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.reset_user_password.invoke_arn
}

resource "aws_api_gateway_integration" "users_reset_password_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_reset_password_resource.id
  http_method = aws_api_gateway_method.users_reset_password_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# Groups API Integrations
resource "aws_api_gateway_integration" "groups_get_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.groups_resource.id
  http_method = aws_api_gateway_method.groups_get_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.list_groups.invoke_arn
}

resource "aws_api_gateway_integration" "groups_post_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.groups_resource.id
  http_method = aws_api_gateway_method.groups_post_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_group.invoke_arn
}

resource "aws_api_gateway_integration" "groups_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.groups_resource.id
  http_method = aws_api_gateway_method.groups_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_integration" "group_join_post_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_join_resource.id
  http_method = aws_api_gateway_method.group_join_post_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.join_group.invoke_arn
}

resource "aws_api_gateway_integration" "group_join_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_join_resource.id
  http_method = aws_api_gateway_method.group_join_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# Group Members Management Integrations
resource "aws_api_gateway_integration" "group_members_get_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_members_resource.id
  http_method = aws_api_gateway_method.group_members_get_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.manage_group_members.invoke_arn
}

resource "aws_api_gateway_integration" "group_members_post_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_members_resource.id
  http_method = aws_api_gateway_method.group_members_post_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.manage_group_members.invoke_arn
}

resource "aws_api_gateway_integration" "group_members_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_members_resource.id
  http_method = aws_api_gateway_method.group_members_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_integration" "group_member_put_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_member_resource.id
  http_method = aws_api_gateway_method.group_member_put_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.manage_group_members.invoke_arn
}

resource "aws_api_gateway_integration" "group_member_delete_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_member_resource.id
  http_method = aws_api_gateway_method.group_member_delete_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.manage_group_members.invoke_arn
}

resource "aws_api_gateway_integration" "group_member_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_member_resource.id
  http_method = aws_api_gateway_method.group_member_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# Group Users Integrations
resource "aws_api_gateway_integration" "group_users_get_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_users_resource.id
  http_method = aws_api_gateway_method.group_users_get_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.list_group_users.invoke_arn
}

resource "aws_api_gateway_integration" "group_users_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_users_resource.id
  http_method = aws_api_gateway_method.group_users_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# Group Stub Users Integrations
resource "aws_api_gateway_integration" "group_stub_users_post_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_stub_users_resource.id
  http_method = aws_api_gateway_method.group_stub_users_post_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_stub_user.invoke_arn
}

resource "aws_api_gateway_integration" "group_stub_users_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_stub_users_resource.id
  http_method = aws_api_gateway_method.group_stub_users_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# CORS Configuration
resource "aws_api_gateway_method" "games_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.games_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "games_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.games_resource.id
  http_method = aws_api_gateway_method.games_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "games_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.games_resource.id
  http_method = aws_api_gateway_method.games_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "games_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.games_resource.id
  http_method = aws_api_gateway_method.games_options_method.http_method
  status_code = aws_api_gateway_method_response.games_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS Configuration for /games/{id}
resource "aws_api_gateway_method" "game_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.game_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "game_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.game_resource.id
  http_method = aws_api_gateway_method.game_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "game_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.game_resource.id
  http_method = aws_api_gateway_method.game_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "game_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.game_resource.id
  http_method = aws_api_gateway_method.game_options_method.http_method
  status_code = aws_api_gateway_method_response.game_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS Configuration for User Endpoints
resource "aws_api_gateway_method_response" "users_register_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_register_resource.id
  http_method = aws_api_gateway_method.users_register_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "users_register_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_register_resource.id
  http_method = aws_api_gateway_method.users_register_options_method.http_method
  status_code = aws_api_gateway_method_response.users_register_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method_response" "users_login_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_login_resource.id
  http_method = aws_api_gateway_method.users_login_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "users_login_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_login_resource.id
  http_method = aws_api_gateway_method.users_login_options_method.http_method
  status_code = aws_api_gateway_method_response.users_login_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method_response" "users_search_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_search_resource.id
  http_method = aws_api_gateway_method.users_search_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "users_search_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_search_resource.id
  http_method = aws_api_gateway_method.users_search_options_method.http_method
  status_code = aws_api_gateway_method_response.users_search_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Additional CORS configurations for missing endpoints
resource "aws_api_gateway_method_response" "users_manage_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_manage_resource.id
  http_method = aws_api_gateway_method.users_manage_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "users_manage_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_manage_resource.id
  http_method = aws_api_gateway_method.users_manage_options_method.http_method
  status_code = aws_api_gateway_method_response.users_manage_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method_response" "user_manage_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.user_manage_resource.id
  http_method = aws_api_gateway_method.user_manage_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "user_manage_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.user_manage_resource.id
  http_method = aws_api_gateway_method.user_manage_options_method.http_method
  status_code = aws_api_gateway_method_response.user_manage_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Convert Stub User CORS
resource "aws_api_gateway_method_response" "user_convert_stub_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.user_convert_stub_resource.id
  http_method = aws_api_gateway_method.user_convert_stub_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "user_convert_stub_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.user_convert_stub_resource.id
  http_method = aws_api_gateway_method.user_convert_stub_options_method.http_method
  status_code = aws_api_gateway_method_response.user_convert_stub_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'PUT,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Merge Stub User CORS
resource "aws_api_gateway_method_response" "user_merge_stub_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.user_merge_stub_resource.id
  http_method = aws_api_gateway_method.user_merge_stub_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "user_merge_stub_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.user_merge_stub_resource.id
  http_method = aws_api_gateway_method.user_merge_stub_options_method.http_method
  status_code = aws_api_gateway_method_response.user_merge_stub_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method_response" "users_profile_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_profile_resource.id
  http_method = aws_api_gateway_method.users_profile_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "users_profile_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_profile_resource.id
  http_method = aws_api_gateway_method.users_profile_options_method.http_method
  status_code = aws_api_gateway_method_response.users_profile_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'PUT,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method_response" "users_password_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_password_resource.id
  http_method = aws_api_gateway_method.users_password_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "users_password_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_password_resource.id
  http_method = aws_api_gateway_method.users_password_options_method.http_method
  status_code = aws_api_gateway_method_response.users_password_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'PUT,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method_response" "users_reset_password_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_reset_password_resource.id
  http_method = aws_api_gateway_method.users_reset_password_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "users_reset_password_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.users_reset_password_resource.id
  http_method = aws_api_gateway_method.users_reset_password_options_method.http_method
  status_code = aws_api_gateway_method_response.users_reset_password_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'PUT,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Groups CORS Responses
resource "aws_api_gateway_method_response" "groups_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.groups_resource.id
  http_method = aws_api_gateway_method.groups_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "groups_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.groups_resource.id
  http_method = aws_api_gateway_method.groups_options_method.http_method
  status_code = aws_api_gateway_method_response.groups_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method_response" "group_join_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_join_resource.id
  http_method = aws_api_gateway_method.group_join_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "group_join_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_join_resource.id
  http_method = aws_api_gateway_method.group_join_options_method.http_method
  status_code = aws_api_gateway_method_response.group_join_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Group Members Management CORS Responses
resource "aws_api_gateway_method_response" "group_members_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_members_resource.id
  http_method = aws_api_gateway_method.group_members_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "group_members_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_members_resource.id
  http_method = aws_api_gateway_method.group_members_options_method.http_method
  status_code = aws_api_gateway_method_response.group_members_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method_response" "group_member_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_member_resource.id
  http_method = aws_api_gateway_method.group_member_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "group_member_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_member_resource.id
  http_method = aws_api_gateway_method.group_member_options_method.http_method
  status_code = aws_api_gateway_method_response.group_member_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Group Users CORS
resource "aws_api_gateway_method_response" "group_users_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_users_resource.id
  http_method = aws_api_gateway_method.group_users_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "group_users_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_users_resource.id
  http_method = aws_api_gateway_method.group_users_options_method.http_method
  status_code = aws_api_gateway_method_response.group_users_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Group Stub Users CORS
resource "aws_api_gateway_method_response" "group_stub_users_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_stub_users_resource.id
  http_method = aws_api_gateway_method.group_stub_users_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "group_stub_users_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.group_stub_users_resource.id
  http_method = aws_api_gateway_method.group_stub_users_options_method.http_method
  status_code = aws_api_gateway_method_response.group_stub_users_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Lambda Permissions for API Gateway
resource "aws_lambda_permission" "get_games_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_games.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "create_game_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_game.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "update_game_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_game.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "delete_game_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete_game.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}


# Lambda Permissions for User Endpoints
resource "aws_lambda_permission" "register_user_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.register_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "login_user_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.login_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "search_users_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.search_users.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "list_users_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.list_users.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "update_user_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "update_my_profile_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_my_profile.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "change_password_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.change_password.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "reset_user_password_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.reset_user_password.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "delete_user_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "convert_stub_user_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.convert_stub_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "merge_stub_user_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.merge_stub_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

# Groups Lambda Permissions
resource "aws_lambda_permission" "create_group_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_group.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "list_groups_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.list_groups.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "join_group_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.join_group.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "manage_group_members_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.manage_group_members.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "list_group_users_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.list_group_users.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "create_stub_user_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_stub_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "changing_500_api_deployment" {
  depends_on = [
    aws_api_gateway_integration.get_games_integration,
    aws_api_gateway_integration.post_games_integration,
    aws_api_gateway_integration.put_game_integration,
    aws_api_gateway_integration.delete_game_integration,
    aws_api_gateway_integration.games_options_integration,
    aws_api_gateway_integration.game_options_integration,
    aws_api_gateway_integration.users_register_integration,
    aws_api_gateway_integration.users_register_options_integration,
    aws_api_gateway_integration.users_login_integration,
    aws_api_gateway_integration.users_login_options_integration,
    aws_api_gateway_integration.users_search_get_integration,
    aws_api_gateway_integration.users_search_post_integration,
    aws_api_gateway_integration.users_search_options_integration,
    aws_api_gateway_integration.users_manage_get_integration,
    aws_api_gateway_integration.users_manage_options_integration,
    aws_api_gateway_integration.user_manage_put_integration,
    aws_api_gateway_integration.user_manage_delete_integration,
    aws_api_gateway_integration.user_manage_options_integration,
    aws_api_gateway_integration.user_convert_stub_put_integration,
    aws_api_gateway_integration.user_convert_stub_options_integration,
    aws_api_gateway_integration.user_merge_stub_post_integration,
    aws_api_gateway_integration.user_merge_stub_options_integration,
    aws_api_gateway_integration.users_profile_put_integration,
    aws_api_gateway_integration.users_profile_options_integration,
    aws_api_gateway_integration.users_password_put_integration,
    aws_api_gateway_integration.users_password_options_integration,
    aws_api_gateway_integration.users_reset_password_put_integration,
    aws_api_gateway_integration.users_reset_password_options_integration,
    aws_api_gateway_integration.groups_get_integration,
    aws_api_gateway_integration.groups_post_integration,
    aws_api_gateway_integration.groups_options_integration,
    aws_api_gateway_integration.group_join_post_integration,
    aws_api_gateway_integration.group_join_options_integration,
    aws_api_gateway_integration.group_members_get_integration,
    aws_api_gateway_integration.group_members_post_integration,
    aws_api_gateway_integration.group_members_options_integration,
    aws_api_gateway_integration.group_member_put_integration,
    aws_api_gateway_integration.group_member_delete_integration,
    aws_api_gateway_integration.group_member_options_integration,
    aws_api_gateway_integration.group_users_get_integration,
    aws_api_gateway_integration.group_users_options_integration,
    aws_api_gateway_integration.group_stub_users_post_integration,
    aws_api_gateway_integration.group_stub_users_options_integration,
    aws_api_gateway_integration_response.users_manage_options_integration_response,
    aws_api_gateway_integration_response.user_manage_options_integration_response,
    aws_api_gateway_integration_response.user_convert_stub_options_integration_response,
    aws_api_gateway_integration_response.user_merge_stub_options_integration_response,
    aws_api_gateway_integration_response.users_profile_options_integration_response,
    aws_api_gateway_integration_response.users_password_options_integration_response,
    aws_api_gateway_integration_response.users_reset_password_options_integration_response,
    aws_api_gateway_integration_response.groups_options_integration_response,
    aws_api_gateway_integration_response.group_join_options_integration_response,
    aws_api_gateway_integration_response.group_members_options_integration_response,
    aws_api_gateway_integration_response.group_member_options_integration_response,
    aws_api_gateway_integration_response.group_users_options_integration_response,
    aws_api_gateway_integration_response.group_stub_users_options_integration_response,
  ]

  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.games_resource.id,
      aws_api_gateway_resource.game_resource.id,
      aws_api_gateway_resource.users_resource.id,
      aws_api_gateway_resource.users_register_resource.id,
      aws_api_gateway_resource.users_login_resource.id,
      aws_api_gateway_resource.users_search_resource.id,
      aws_api_gateway_resource.users_manage_resource.id,
      aws_api_gateway_resource.user_manage_resource.id,
      aws_api_gateway_resource.user_convert_stub_resource.id,
      aws_api_gateway_resource.user_merge_stub_resource.id,
      aws_api_gateway_resource.users_profile_resource.id,
      aws_api_gateway_resource.users_password_resource.id,
      aws_api_gateway_resource.users_reset_password_resource.id,
      aws_api_gateway_resource.groups_resource.id,
      aws_api_gateway_resource.group_resource.id,
      aws_api_gateway_resource.group_join_resource.id,
      aws_api_gateway_resource.group_members_resource.id,
      aws_api_gateway_resource.group_member_resource.id,
      aws_api_gateway_resource.group_users_resource.id,
      aws_api_gateway_resource.group_stub_users_resource.id,
      aws_api_gateway_method.get_games_method.id,
      aws_api_gateway_method.post_games_method.id,
      aws_api_gateway_method.put_game_method.id,
      aws_api_gateway_method.delete_game_method.id,
      aws_api_gateway_method.games_options_method.id,
      aws_api_gateway_method.game_options_method.id,
      aws_api_gateway_method.users_register_method.id,
      aws_api_gateway_method.users_register_options_method.id,
      aws_api_gateway_method.users_login_method.id,
      aws_api_gateway_method.users_login_options_method.id,
      aws_api_gateway_method.users_search_get_method.id,
      aws_api_gateway_method.users_search_post_method.id,
      aws_api_gateway_method.users_search_options_method.id,
      aws_api_gateway_method.users_manage_get_method.id,
      aws_api_gateway_method.users_manage_options_method.id,
      aws_api_gateway_method.user_manage_put_method.id,
      aws_api_gateway_method.user_manage_delete_method.id,
      aws_api_gateway_method.user_manage_options_method.id,
      aws_api_gateway_method.user_convert_stub_put_method.id,
      aws_api_gateway_method.user_convert_stub_options_method.id,
      aws_api_gateway_method.user_merge_stub_post_method.id,
      aws_api_gateway_method.user_merge_stub_options_method.id,
      aws_api_gateway_method.users_profile_put_method.id,
      aws_api_gateway_method.users_profile_options_method.id,
      aws_api_gateway_method.users_password_put_method.id,
      aws_api_gateway_method.users_password_options_method.id,
      aws_api_gateway_method.users_reset_password_put_method.id,
      aws_api_gateway_method.users_reset_password_options_method.id,
      aws_api_gateway_method.groups_get_method.id,
      aws_api_gateway_method.groups_post_method.id,
      aws_api_gateway_method.groups_options_method.id,
      aws_api_gateway_method.group_join_post_method.id,
      aws_api_gateway_method.group_join_options_method.id,
      aws_api_gateway_method.group_members_get_method.id,
      aws_api_gateway_method.group_members_post_method.id,
      aws_api_gateway_method.group_members_options_method.id,
      aws_api_gateway_method.group_member_put_method.id,
      aws_api_gateway_method.group_member_delete_method.id,
      aws_api_gateway_method.group_member_options_method.id,
      aws_api_gateway_method.group_users_get_method.id,
      aws_api_gateway_method.group_users_options_method.id,
      aws_api_gateway_method.group_stub_users_post_method.id,
      aws_api_gateway_method.group_stub_users_options_method.id,
      aws_api_gateway_integration.get_games_integration.id,
      aws_api_gateway_integration.post_games_integration.id,
      aws_api_gateway_integration.put_game_integration.id,
      aws_api_gateway_integration.delete_game_integration.id,
      aws_api_gateway_integration.games_options_integration.id,
      aws_api_gateway_integration.game_options_integration.id,
      aws_api_gateway_integration.users_register_integration.id,
      aws_api_gateway_integration.users_register_options_integration.id,
      aws_api_gateway_integration.users_login_integration.id,
      aws_api_gateway_integration.users_login_options_integration.id,
      aws_api_gateway_integration.users_search_get_integration.id,
      aws_api_gateway_integration.users_search_post_integration.id,
      aws_api_gateway_integration.users_search_options_integration.id,
      aws_api_gateway_integration.users_manage_get_integration.id,
      aws_api_gateway_integration.users_manage_options_integration.id,
      aws_api_gateway_integration.user_manage_put_integration.id,
      aws_api_gateway_integration.user_manage_delete_integration.id,
      aws_api_gateway_integration.user_manage_options_integration.id,
      aws_api_gateway_integration.users_profile_put_integration.id,
      aws_api_gateway_integration.users_profile_options_integration.id,
      aws_api_gateway_integration.users_password_put_integration.id,
      aws_api_gateway_integration.users_password_options_integration.id,
      aws_api_gateway_integration.users_reset_password_put_integration.id,
      aws_api_gateway_integration.users_reset_password_options_integration.id,
      aws_api_gateway_integration.groups_get_integration.id,
      aws_api_gateway_integration.groups_post_integration.id,
      aws_api_gateway_integration.groups_options_integration.id,
      aws_api_gateway_integration.group_join_post_integration.id,
      aws_api_gateway_integration.group_join_options_integration.id,
      aws_api_gateway_integration.group_members_get_integration.id,
      aws_api_gateway_integration.group_members_post_integration.id,
      aws_api_gateway_integration.group_members_options_integration.id,
      aws_api_gateway_integration.group_member_put_integration.id,
      aws_api_gateway_integration.group_member_delete_integration.id,
      aws_api_gateway_integration.group_member_options_integration.id,
      aws_api_gateway_method_response.users_manage_options_200.id,
      aws_api_gateway_method_response.user_manage_options_200.id,
      aws_api_gateway_method_response.user_convert_stub_options_200.id,
      aws_api_gateway_method_response.user_merge_stub_options_200.id,
      aws_api_gateway_method_response.users_profile_options_200.id,
      aws_api_gateway_method_response.users_password_options_200.id,
      aws_api_gateway_method_response.users_reset_password_options_200.id,
      aws_api_gateway_method_response.groups_options_200.id,
      aws_api_gateway_method_response.group_join_options_200.id,
      aws_api_gateway_method_response.group_members_options_200.id,
      aws_api_gateway_method_response.group_member_options_200.id,
      aws_api_gateway_method_response.group_users_options_200.id,
      aws_api_gateway_method_response.group_stub_users_options_200.id,
      aws_api_gateway_integration_response.users_manage_options_integration_response.id,
      aws_api_gateway_integration_response.user_manage_options_integration_response.id,
      aws_api_gateway_integration_response.users_profile_options_integration_response.id,
      aws_api_gateway_integration_response.users_password_options_integration_response.id,
      aws_api_gateway_integration_response.users_reset_password_options_integration_response.id,
      aws_api_gateway_integration_response.groups_options_integration_response.id,
      aws_api_gateway_integration_response.group_join_options_integration_response.id,
      aws_api_gateway_integration_response.group_members_options_integration_response.id,
      aws_api_gateway_integration_response.group_member_options_integration_response.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "changing_500_api_stage" {
  deployment_id = aws_api_gateway_deployment.changing_500_api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  stage_name    = var.environment

  tags = local.common_tags
}

# API Gateway Custom Domain
resource "aws_api_gateway_domain_name" "api_domain" {
  domain_name              = "api.changing500.com"
  regional_certificate_arn = aws_acm_certificate_validation.api_cert.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = local.common_tags
}

# API Gateway Base Path Mapping (maps root / to /prod stage)
resource "aws_api_gateway_base_path_mapping" "api_mapping" {
  api_id      = aws_api_gateway_rest_api.changing_500_api.id
  stage_name  = aws_api_gateway_stage.changing_500_api_stage.stage_name
  domain_name = aws_api_gateway_domain_name.api_domain.domain_name
  base_path   = ""  # Empty string maps root path
}

# S3 Bucket for static website
resource "aws_s3_bucket" "website_bucket" {
  bucket = "${var.project_name}-website-${var.environment}-${random_string.bucket_suffix.result}"

  tags = local.common_tags
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

resource "aws_s3_bucket_website_configuration" "website_config" {
  bucket = aws_s3_bucket.website_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "website_pab" {
  bucket = aws_s3_bucket.website_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "website_policy" {
  bucket = aws_s3_bucket.website_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website_bucket.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.website_pab]
}

# ACM Certificate for CloudFront (must be in us-east-1)
resource "aws_acm_certificate" "website_cert" {
  domain_name = "changing500.com"
  subject_alternative_names = [
    "www.changing500.com",
    "dealinholden.com", 
    "www.dealinholden.com"
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.common_tags
}

# Separate ACM Certificate for API Gateway (REGIONAL)
resource "aws_acm_certificate" "api_cert" {
  domain_name       = "api.changing500.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.common_tags
}

# Data source for existing Route53 hosted zone for changing500.com
data "aws_route53_zone" "changing500" {
  name = "changing500.com."
}

# Data source for existing Route53 hosted zone for dealinholden.com (if different)
data "aws_route53_zone" "dealinholden" {
  name = "dealinholden.com."
}

# Route53 records for ACM certificate validation
resource "aws_route53_record" "website_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.website_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
      zone   = dvo.domain_name
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  # Use the appropriate hosted zone based on the domain
  zone_id = contains(["changing500.com", "www.changing500.com"], each.value.zone) ? data.aws_route53_zone.changing500.zone_id : data.aws_route53_zone.dealinholden.zone_id

  # Ensure certificate is created first
  depends_on = [aws_acm_certificate.website_cert]
}

# Route53 validation records for API ACM certificate
resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.changing500.zone_id

  # Ensure certificate is created first
  depends_on = [aws_acm_certificate.api_cert]
}

# ACM Certificate Validation for website
resource "aws_acm_certificate_validation" "website_cert" {
  certificate_arn         = aws_acm_certificate.website_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.website_cert_validation : record.fqdn]
  
  timeouts {
    create = "5m"
  }
}

# ACM Certificate Validation for API
resource "aws_acm_certificate_validation" "api_cert" {
  certificate_arn         = aws_acm_certificate.api_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
  
  timeouts {
    create = "5m"
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "website_distribution" {
  origin {
    domain_name = aws_s3_bucket.website_bucket.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.website_bucket.bucket}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  
  aliases = [
    "changing500.com", 
    "www.changing500.com",
    "dealinholden.com",
    "www.dealinholden.com"
  ]

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.website_bucket.bucket}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    # Associate the redirect function
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.domain_redirect.arn
    }

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.website_cert.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = local.common_tags
}

# CloudFront Function for domain redirect
resource "aws_cloudfront_function" "domain_redirect" {
  name    = "${var.project_name}-domain-redirect-${var.environment}"
  runtime = "cloudfront-js-1.0"
  comment = "Redirect dealinholden.com to changing500.com"
  publish = true
  code    = file("${path.module}/cloudfront-function.js")
}

# Route53 A record for changing500.com pointing to CloudFront
resource "aws_route53_record" "website_a_record" {
  zone_id = data.aws_route53_zone.changing500.zone_id
  name    = "changing500.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.website_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# Route53 AAAA record for changing500.com (IPv6) pointing to CloudFront
resource "aws_route53_record" "website_aaaa_record" {
  zone_id = data.aws_route53_zone.changing500.zone_id
  name    = "changing500.com"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.website_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.website_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# Route53 CNAME record for www.changing500.com pointing to changing500.com
resource "aws_route53_record" "website_www_cname" {
  zone_id = data.aws_route53_zone.changing500.zone_id
  name    = "www.changing500.com"
  type    = "CNAME"
  ttl     = 300
  records = ["changing500.com"]
}

# Route53 A record for api.changing500.com pointing to API Gateway
resource "aws_route53_record" "api_a_record" {
  zone_id = data.aws_route53_zone.changing500.zone_id
  name    = "api.changing500.com"
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.api_domain.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.api_domain.regional_zone_id
    evaluate_target_health = false
  }
}

# Route53 AAAA record for api.changing500.com (IPv6) pointing to API Gateway
resource "aws_route53_record" "api_aaaa_record" {
  zone_id = data.aws_route53_zone.changing500.zone_id
  name    = "api.changing500.com"
  type    = "AAAA"

  alias {
    name                   = aws_api_gateway_domain_name.api_domain.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.api_domain.regional_zone_id
    evaluate_target_health = false
  }
}

# Route53 A record for dealinholden.com pointing to CloudFront (for redirect)
resource "aws_route53_record" "old_website_a_record" {
  zone_id = data.aws_route53_zone.dealinholden.zone_id
  name    = "dealinholden.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.website_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# Route53 AAAA record for dealinholden.com (IPv6) pointing to CloudFront
resource "aws_route53_record" "old_website_aaaa_record" {
  zone_id = data.aws_route53_zone.dealinholden.zone_id
  name    = "dealinholden.com"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.website_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.website_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# Route53 CNAME record for www.dealinholden.com pointing to dealinholden.com
resource "aws_route53_record" "old_website_www_cname" {
  zone_id = data.aws_route53_zone.dealinholden.zone_id
  name    = "www.dealinholden.com"
  type    = "CNAME"
  ttl     = 300
  records = ["dealinholden.com"]
}

# SSM Parameter for admin password
resource "aws_ssm_parameter" "admin_password" {
  name  = "/changing-500/admin-password"
  type  = "SecureString"
  value = "dealin2025" # Default password - change manually in AWS console

  tags = local.common_tags
  
  lifecycle {
    ignore_changes = [value]
  }
}

# SSM Parameter for JWT secret
resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/changing-500/jwt-secret"
  type  = "SecureString"
  value = "your-secret-jwt-key-change-this-in-production" # Default secret - change manually in AWS console

  tags = local.common_tags
  
  lifecycle {
    ignore_changes = [value]
  }
}

# IAM policy for Lambda to access SSM Parameter Store
resource "aws_iam_policy" "lambda_ssm_policy" {
  name        = "${var.project_name}-lambda-ssm-policy-${var.environment}"
  description = "Policy for Lambda to access SSM Parameter Store"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = [
          aws_ssm_parameter.admin_password.arn,
          aws_ssm_parameter.jwt_secret.arn
        ]
      }
    ]
  })

  tags = local.common_tags
}

# Attach SSM policy to Lambda execution role
resource "aws_iam_role_policy_attachment" "lambda_ssm_policy_attachment" {
  policy_arn = aws_iam_policy.lambda_ssm_policy.arn
  role       = aws_iam_role.lambda_execution_role.name
}