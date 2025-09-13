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

  global_secondary_index {
    name            = "date-index"
    hash_key        = "date"
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

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-users-${var.environment}"
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
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.games_table.arn,
          "${aws_dynamodb_table.games_table.arn}/index/*",
          aws_dynamodb_table.users_table.arn,
          "${aws_dynamodb_table.users_table.arn}/index/*"
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
      TABLE_NAME = aws_dynamodb_table.games_table.name
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
      TABLE_NAME = aws_dynamodb_table.games_table.name
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
      TABLE_NAME = aws_dynamodb_table.games_table.name
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
      TABLE_NAME = aws_dynamodb_table.games_table.name
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

# API Gateway
resource "aws_api_gateway_rest_api" "dealin_holden_api" {
  name        = "${var.project_name}-api-${var.environment}"
  description = "API for Dealin Holden"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = local.common_tags
}

# API Gateway Resource
resource "aws_api_gateway_resource" "games_resource" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  parent_id   = aws_api_gateway_rest_api.dealin_holden_api.root_resource_id
  path_part   = "games"
}

# API Gateway Resource for individual games
resource "aws_api_gateway_resource" "game_resource" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  parent_id   = aws_api_gateway_resource.games_resource.id
  path_part   = "{id}"
}


# API Gateway Resource for user endpoints
resource "aws_api_gateway_resource" "users_resource" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  parent_id   = aws_api_gateway_rest_api.dealin_holden_api.root_resource_id
  path_part   = "users"
}

resource "aws_api_gateway_resource" "users_register_resource" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  parent_id   = aws_api_gateway_resource.users_resource.id
  path_part   = "register"
}

resource "aws_api_gateway_resource" "users_login_resource" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  parent_id   = aws_api_gateway_resource.users_resource.id
  path_part   = "login"
}

resource "aws_api_gateway_resource" "users_search_resource" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  parent_id   = aws_api_gateway_resource.users_resource.id
  path_part   = "search"
}

resource "aws_api_gateway_resource" "users_manage_resource" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  parent_id   = aws_api_gateway_resource.users_resource.id
  path_part   = "manage"
}

resource "aws_api_gateway_resource" "user_manage_resource" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  parent_id   = aws_api_gateway_resource.users_manage_resource.id
  path_part   = "{userId}"
}

# API Gateway Methods
resource "aws_api_gateway_method" "get_games_method" {
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.games_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "post_games_method" {
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.games_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "put_game_method" {
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.game_resource.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "delete_game_method" {
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.game_resource.id
  http_method   = "DELETE"
  authorization = "NONE"
}


# User Registration Methods
resource "aws_api_gateway_method" "users_register_method" {
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.users_register_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "users_register_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.users_register_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# User Login Methods
resource "aws_api_gateway_method" "users_login_method" {
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.users_login_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "users_login_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.users_login_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# User Search Methods
resource "aws_api_gateway_method" "users_search_get_method" {
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.users_search_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "users_search_post_method" {
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.users_search_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "users_search_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.users_search_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# User Management Methods (Admin only)
resource "aws_api_gateway_method" "users_manage_get_method" {
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.users_manage_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "users_manage_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.users_manage_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "user_manage_put_method" {
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.user_manage_resource.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "user_manage_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.user_manage_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# API Gateway Integrations
resource "aws_api_gateway_integration" "get_games_integration" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id = aws_api_gateway_resource.games_resource.id
  http_method = aws_api_gateway_method.get_games_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_games.invoke_arn
}

resource "aws_api_gateway_integration" "post_games_integration" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id = aws_api_gateway_resource.games_resource.id
  http_method = aws_api_gateway_method.post_games_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_game.invoke_arn
}

resource "aws_api_gateway_integration" "put_game_integration" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id = aws_api_gateway_resource.game_resource.id
  http_method = aws_api_gateway_method.put_game_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.update_game.invoke_arn
}

resource "aws_api_gateway_integration" "delete_game_integration" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id = aws_api_gateway_resource.game_resource.id
  http_method = aws_api_gateway_method.delete_game_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.delete_game.invoke_arn
}


# User Registration Integrations
resource "aws_api_gateway_integration" "users_register_integration" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id = aws_api_gateway_resource.users_register_resource.id
  http_method = aws_api_gateway_method.users_register_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.register_user.invoke_arn
}

resource "aws_api_gateway_integration" "users_register_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
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
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id = aws_api_gateway_resource.users_login_resource.id
  http_method = aws_api_gateway_method.users_login_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.login_user.invoke_arn
}

resource "aws_api_gateway_integration" "users_login_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
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
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id = aws_api_gateway_resource.users_search_resource.id
  http_method = aws_api_gateway_method.users_search_get_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.search_users.invoke_arn
}

resource "aws_api_gateway_integration" "users_search_post_integration" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id = aws_api_gateway_resource.users_search_resource.id
  http_method = aws_api_gateway_method.users_search_post_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.search_users.invoke_arn
}

resource "aws_api_gateway_integration" "users_search_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
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
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id = aws_api_gateway_resource.users_manage_resource.id
  http_method = aws_api_gateway_method.users_manage_get_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.list_users.invoke_arn
}

resource "aws_api_gateway_integration" "users_manage_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
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
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id = aws_api_gateway_resource.user_manage_resource.id
  http_method = aws_api_gateway_method.user_manage_put_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.update_user.invoke_arn
}

resource "aws_api_gateway_integration" "user_manage_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id = aws_api_gateway_resource.user_manage_resource.id
  http_method = aws_api_gateway_method.user_manage_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# CORS Configuration
resource "aws_api_gateway_method" "games_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.games_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "games_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
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
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
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
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
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
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id   = aws_api_gateway_resource.game_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "game_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
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
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
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
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
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
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
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
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
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
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
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
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
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
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
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
  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id
  resource_id = aws_api_gateway_resource.users_search_resource.id
  http_method = aws_api_gateway_method.users_search_options_method.http_method
  status_code = aws_api_gateway_method_response.users_search_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Lambda Permissions for API Gateway
resource "aws_lambda_permission" "get_games_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_games.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dealin_holden_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "create_game_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_game.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dealin_holden_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "update_game_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_game.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dealin_holden_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "delete_game_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete_game.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dealin_holden_api.execution_arn}/*/*"
}


# Lambda Permissions for User Endpoints
resource "aws_lambda_permission" "register_user_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.register_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dealin_holden_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "login_user_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.login_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dealin_holden_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "search_users_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.search_users.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dealin_holden_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "list_users_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.list_users.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dealin_holden_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "update_user_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dealin_holden_api.execution_arn}/*/*"
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "dealin_holden_api_deployment" {
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
    aws_api_gateway_integration.user_manage_options_integration,
  ]

  rest_api_id = aws_api_gateway_rest_api.dealin_holden_api.id

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
      aws_api_gateway_method.user_manage_options_method.id,
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
      aws_api_gateway_integration.user_manage_options_integration.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "dealin_holden_api_stage" {
  deployment_id = aws_api_gateway_deployment.dealin_holden_api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.dealin_holden_api.id
  stage_name    = var.environment

  tags = local.common_tags
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

# ACM Certificate for Custom Domain (must be in us-east-1)
resource "aws_acm_certificate" "website_cert" {
  domain_name               = "dealinholden.com"
  subject_alternative_names = ["www.dealinholden.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.common_tags
}

# Data source for existing Route53 hosted zone
data "aws_route53_zone" "main" {
  zone_id = "Z072096332UAWA6RHZJTK"
}

# Route53 records for ACM certificate validation
resource "aws_route53_record" "website_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.website_cert.domain_validation_options : dvo.domain_name => {
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
  zone_id         = data.aws_route53_zone.main.zone_id
}

# ACM Certificate Validation
resource "aws_acm_certificate_validation" "website_cert" {
  certificate_arn         = aws_acm_certificate.website_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.website_cert_validation : record.fqdn]
  
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
  
  aliases = ["dealinholden.com", "www.dealinholden.com"]

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.website_bucket.bucket}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

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

# Route53 A record for dealinholden.com pointing to CloudFront
resource "aws_route53_record" "website_a_record" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "dealinholden.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.website_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# Route53 AAAA record for dealinholden.com (IPv6) pointing to CloudFront
resource "aws_route53_record" "website_aaaa_record" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "dealinholden.com"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.website_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.website_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# Route53 CNAME record for www.dealinholden.com pointing to dealinholden.com
resource "aws_route53_record" "website_www_cname" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.dealinholden.com"
  type    = "CNAME"
  ttl     = 300
  records = ["dealinholden.com"]
}

# SSM Parameter for admin password
resource "aws_ssm_parameter" "admin_password" {
  name  = "/dealin-holden/admin-password"
  type  = "SecureString"
  value = "dealin2025" # Default password - change manually in AWS console

  tags = local.common_tags
  
  lifecycle {
    ignore_changes = [value]
  }
}

# SSM Parameter for JWT secret
resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/dealin-holden/jwt-secret"
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