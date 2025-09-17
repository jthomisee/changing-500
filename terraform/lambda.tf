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
  runtime         = "nodejs22.x"
  timeout         = 30

  environment {
    variables = {
      TABLE_NAME             = aws_dynamodb_table.games_table.name
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
    }
  }

  tags = local.common_tags
}

# Get User Games Lambda Function (efficient user-specific game queries)
resource "aws_lambda_function" "get_user_games" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-get-user-games-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "getUserGames.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs22.x"
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
  runtime         = "nodejs22.x"
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
  runtime         = "nodejs22.x"
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
  runtime         = "nodejs22.x"
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
  runtime         = "nodejs22.x"
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
  runtime         = "nodejs22.x"
  timeout         = 30
  memory_size      = 512  # Increased from default 128MB for faster bcrypt operations

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
  runtime         = "nodejs22.x"
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
  runtime         = "nodejs22.x"
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
  runtime         = "nodejs22.x"
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
  runtime         = "nodejs22.x"
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
  runtime         = "nodejs22.x"
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
  runtime         = "nodejs22.x"
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
  runtime         = "nodejs22.x"
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

# Create Group Lambda Function (Admin only)
resource "aws_lambda_function" "create_group" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-create-group-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "createGroup.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs22.x"
  timeout         = 30

  environment {
    variables = {
      GROUPS_TABLE_NAME      = aws_dynamodb_table.groups_table.name
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
  runtime         = "nodejs22.x"
  timeout         = 30

  environment {
    variables = {
      GROUPS_TABLE_NAME      = aws_dynamodb_table.groups_table.name
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
  runtime         = "nodejs22.x"
  timeout         = 30

  environment {
    variables = {
      GROUPS_TABLE_NAME      = aws_dynamodb_table.groups_table.name
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
    }
  }

  tags = local.common_tags
}

# List Public Groups Lambda Function
resource "aws_lambda_function" "list_public_groups" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-list-public-groups-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "listPublicGroups.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs22.x"
  timeout         = 30

  environment {
    variables = {
      GROUPS_TABLE_NAME      = aws_dynamodb_table.groups_table.name
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
  runtime         = "nodejs22.x"
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
  runtime         = "nodejs22.x"
  timeout         = 30

  environment {
    variables = {
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
      USERS_TABLE_NAME       = aws_dynamodb_table.users_table.name
    }
  }

  tags = local.common_tags
}

# Add User To Group Lambda Function
resource "aws_lambda_function" "add_group_user" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-add-user-to-group-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "addUserToGroup.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs22.x"
  timeout         = 30

  environment {
    variables = {
      USERS_TABLE_NAME       = aws_dynamodb_table.users_table.name
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
    }
  }

  tags = local.common_tags
}

# Update Group Lambda Function
resource "aws_lambda_function" "update_group" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-update-group-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "updateGroup.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs22.x"
  timeout         = 30

  environment {
    variables = {
      GROUPS_TABLE_NAME      = aws_dynamodb_table.groups_table.name
      USER_GROUPS_TABLE_NAME = aws_dynamodb_table.user_groups_table.name
    }
  }

  tags = local.common_tags
}

# Lambda permissions for API Gateway to invoke functions
resource "aws_lambda_permission" "api_gateway_get_games" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_games.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_create_game" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_game.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_update_game" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_game.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_delete_game" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete_game.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_register_user" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.register_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_login_user" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.login_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_search_users" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.search_users.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_list_users" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.list_users.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_update_user" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_delete_user" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_update_my_profile" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_my_profile.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_change_password" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.change_password.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_reset_user_password" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.reset_user_password.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_list_groups" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.list_groups.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_create_group" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_group.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_join_group" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.join_group.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_manage_group_members" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.manage_group_members.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_list_group_users" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.list_group_users.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_add_group_user" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.add_group_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

# Permission for Twilio webhook to invoke handle_sms_reply via API Gateway
resource "aws_lambda_permission" "api_gateway_twilio_webhook" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.handle_sms_reply.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

# Notification Lambda permissions
resource "aws_lambda_permission" "api_gateway_queue_notification" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.queue_notification.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_handle_rsvp_link" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.handle_rsvp_link.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_get_rsvp_token" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_rsvp_token.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_update_rsvp_token" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_rsvp_token.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_list_public_groups" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.list_public_groups.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_update_group" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_group.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_user_games_invoke_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_user_games.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.changing_500_api.execution_arn}/*/*"
}