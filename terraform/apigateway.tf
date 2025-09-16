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

# Notifications API Resources
resource "aws_api_gateway_resource" "notifications_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_rest_api.changing_500_api.root_resource_id
  path_part   = "notifications"
}

resource "aws_api_gateway_resource" "notifications_queue_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.notifications_resource.id
  path_part   = "queue"
}

# Twilio webhook under /notifications
resource "aws_api_gateway_resource" "twilio_webhook_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.notifications_resource.id
  path_part   = "twilio-webhook"
}

# RSVP API Resources
resource "aws_api_gateway_resource" "rsvp_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_rest_api.changing_500_api.root_resource_id
  path_part   = "rsvp"
}

resource "aws_api_gateway_resource" "rsvp_game_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.rsvp_resource.id
  path_part   = "{gameId}"
}

# RSVP Token endpoints for no-login RSVP
resource "aws_api_gateway_resource" "rsvp_token_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_rest_api.changing_500_api.root_resource_id
  path_part   = "rsvp-token"
}

resource "aws_api_gateway_resource" "rsvp_token_detail_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.rsvp_token_resource.id
  path_part   = "{token}"
}

resource "aws_api_gateway_resource" "rsvp_token_respond_resource" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  parent_id   = aws_api_gateway_resource.rsvp_token_detail_resource.id
  path_part   = "respond"
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

# Notification methods
resource "aws_api_gateway_method" "notifications_queue_post_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.notifications_queue_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "notifications_queue_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.notifications_queue_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Twilio webhook methods
resource "aws_api_gateway_method" "twilio_webhook_post_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.twilio_webhook_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "twilio_webhook_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.twilio_webhook_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# RSVP methods
resource "aws_api_gateway_method" "rsvp_game_get_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.rsvp_game_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "rsvp_game_put_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.rsvp_game_resource.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "rsvp_game_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.rsvp_game_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# RSVP Token methods
resource "aws_api_gateway_method" "rsvp_token_get_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.rsvp_token_detail_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "rsvp_token_put_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.rsvp_token_respond_resource.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "rsvp_token_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.rsvp_token_detail_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "rsvp_token_respond_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.changing_500_api.id
  resource_id   = aws_api_gateway_resource.rsvp_token_respond_resource.id
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

# Notification integrations
resource "aws_api_gateway_integration" "notifications_queue_post_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.notifications_queue_resource.id
  http_method = aws_api_gateway_method.notifications_queue_post_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.queue_notification.invoke_arn
}

resource "aws_api_gateway_integration" "notifications_queue_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.notifications_queue_resource.id
  http_method = aws_api_gateway_method.notifications_queue_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# Twilio webhook integrations
resource "aws_api_gateway_integration" "twilio_webhook_post_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.twilio_webhook_resource.id
  http_method = aws_api_gateway_method.twilio_webhook_post_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.handle_sms_reply.invoke_arn
}

resource "aws_api_gateway_integration" "twilio_webhook_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.twilio_webhook_resource.id
  http_method = aws_api_gateway_method.twilio_webhook_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# RSVP integrations
resource "aws_api_gateway_integration" "rsvp_game_get_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.rsvp_game_resource.id
  http_method = aws_api_gateway_method.rsvp_game_get_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.handle_rsvp_link.invoke_arn
}

resource "aws_api_gateway_integration" "rsvp_game_put_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.rsvp_game_resource.id
  http_method = aws_api_gateway_method.rsvp_game_put_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.handle_rsvp_link.invoke_arn
}

resource "aws_api_gateway_integration" "rsvp_game_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.rsvp_game_resource.id
  http_method = aws_api_gateway_method.rsvp_game_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# RSVP Token integrations
resource "aws_api_gateway_integration" "rsvp_token_get_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.rsvp_token_detail_resource.id
  http_method = aws_api_gateway_method.rsvp_token_get_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_rsvp_token.invoke_arn
}

resource "aws_api_gateway_integration" "rsvp_token_put_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.rsvp_token_respond_resource.id
  http_method = aws_api_gateway_method.rsvp_token_put_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.update_rsvp_token.invoke_arn
}

resource "aws_api_gateway_integration" "rsvp_token_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.rsvp_token_detail_resource.id
  http_method = aws_api_gateway_method.rsvp_token_options_method.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_integration" "rsvp_token_respond_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.rsvp_token_respond_resource.id
  http_method = aws_api_gateway_method.rsvp_token_respond_options_method.http_method

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

# Notifications CORS
resource "aws_api_gateway_method_response" "notifications_queue_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.notifications_queue_resource.id
  http_method = aws_api_gateway_method.notifications_queue_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "notifications_queue_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.notifications_queue_resource.id
  http_method = aws_api_gateway_method.notifications_queue_options_method.http_method
  status_code = aws_api_gateway_method_response.notifications_queue_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Twilio webhook CORS
resource "aws_api_gateway_method_response" "twilio_webhook_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.twilio_webhook_resource.id
  http_method = aws_api_gateway_method.twilio_webhook_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "twilio_webhook_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.twilio_webhook_resource.id
  http_method = aws_api_gateway_method.twilio_webhook_options_method.http_method
  status_code = aws_api_gateway_method_response.twilio_webhook_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# RSVP CORS
resource "aws_api_gateway_method_response" "rsvp_game_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.rsvp_game_resource.id
  http_method = aws_api_gateway_method.rsvp_game_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "rsvp_game_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.rsvp_game_resource.id
  http_method = aws_api_gateway_method.rsvp_game_options_method.http_method
  status_code = aws_api_gateway_method_response.rsvp_game_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,PUT,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# RSVP Token CORS responses
resource "aws_api_gateway_method_response" "rsvp_token_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.rsvp_token_detail_resource.id
  http_method = aws_api_gateway_method.rsvp_token_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "rsvp_token_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.rsvp_token_detail_resource.id
  http_method = aws_api_gateway_method.rsvp_token_options_method.http_method
  status_code = aws_api_gateway_method_response.rsvp_token_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method_response" "rsvp_token_respond_options_200" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.rsvp_token_respond_resource.id
  http_method = aws_api_gateway_method.rsvp_token_respond_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "rsvp_token_respond_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.changing_500_api.id
  resource_id = aws_api_gateway_resource.rsvp_token_respond_resource.id
  http_method = aws_api_gateway_method.rsvp_token_respond_options_method.http_method
  status_code = aws_api_gateway_method_response.rsvp_token_respond_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'PUT,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
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
    
    aws_api_gateway_integration.notifications_queue_post_integration,
    aws_api_gateway_integration.notifications_queue_options_integration,
    aws_api_gateway_integration.rsvp_game_get_integration,
    aws_api_gateway_integration.rsvp_game_put_integration,
    aws_api_gateway_integration.rsvp_game_options_integration,
    aws_api_gateway_integration.rsvp_token_get_integration,
    aws_api_gateway_integration.rsvp_token_put_integration,
    aws_api_gateway_integration.rsvp_token_options_integration,
    aws_api_gateway_integration.rsvp_token_respond_options_integration,
    aws_api_gateway_integration.twilio_webhook_post_integration,
    aws_api_gateway_integration.twilio_webhook_options_integration,
    aws_api_gateway_integration_response.users_manage_options_integration_response,
    aws_api_gateway_integration_response.user_manage_options_integration_response,
    
    aws_api_gateway_integration_response.users_profile_options_integration_response,
    aws_api_gateway_integration_response.users_password_options_integration_response,
    aws_api_gateway_integration_response.users_reset_password_options_integration_response,
    aws_api_gateway_integration_response.groups_options_integration_response,
    aws_api_gateway_integration_response.group_join_options_integration_response,
    aws_api_gateway_integration_response.group_members_options_integration_response,
    aws_api_gateway_integration_response.group_member_options_integration_response,
    aws_api_gateway_integration_response.group_users_options_integration_response,
    
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
      
      aws_api_gateway_resource.users_profile_resource.id,
      aws_api_gateway_resource.users_password_resource.id,
      aws_api_gateway_resource.users_reset_password_resource.id,
      aws_api_gateway_resource.groups_resource.id,
      aws_api_gateway_resource.group_resource.id,
      aws_api_gateway_resource.group_join_resource.id,
      aws_api_gateway_resource.group_members_resource.id,
      aws_api_gateway_resource.group_member_resource.id,
      aws_api_gateway_resource.group_users_resource.id,
      
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
      aws_api_gateway_method_response.users_profile_options_200.id,
      aws_api_gateway_method_response.users_password_options_200.id,
      aws_api_gateway_method_response.users_reset_password_options_200.id,
      aws_api_gateway_method_response.groups_options_200.id,
      aws_api_gateway_method_response.group_join_options_200.id,
      aws_api_gateway_method_response.group_members_options_200.id,
      aws_api_gateway_method_response.group_member_options_200.id,
      aws_api_gateway_method_response.group_users_options_200.id,
      
      aws_api_gateway_method_response.notifications_queue_options_200.id,
      aws_api_gateway_method_response.rsvp_game_options_200.id,
      aws_api_gateway_integration_response.users_manage_options_integration_response.id,
      aws_api_gateway_integration_response.user_manage_options_integration_response.id,
      aws_api_gateway_integration_response.users_profile_options_integration_response.id,
      aws_api_gateway_integration_response.users_password_options_integration_response.id,
      aws_api_gateway_integration_response.users_reset_password_options_integration_response.id,
      aws_api_gateway_integration_response.groups_options_integration_response.id,
      aws_api_gateway_integration_response.group_join_options_integration_response.id,
      aws_api_gateway_integration_response.group_members_options_integration_response.id,
      aws_api_gateway_integration_response.group_member_options_integration_response.id,
      
      aws_api_gateway_integration_response.notifications_queue_options_integration_response.id,
      aws_api_gateway_integration_response.rsvp_game_options_integration_response.id,
      aws_api_gateway_method_response.rsvp_token_options_200.id,
      aws_api_gateway_method_response.rsvp_token_respond_options_200.id,
      aws_api_gateway_integration_response.rsvp_token_options_integration_response.id,
      aws_api_gateway_integration_response.rsvp_token_respond_options_integration_response.id,
      aws_api_gateway_resource.twilio_webhook_resource.id,
      aws_api_gateway_method.twilio_webhook_post_method.id,
      aws_api_gateway_method.twilio_webhook_options_method.id,
      aws_api_gateway_integration.twilio_webhook_post_integration.id,
      aws_api_gateway_integration.twilio_webhook_options_integration.id,
      aws_api_gateway_method_response.twilio_webhook_options_200.id,
      aws_api_gateway_integration_response.twilio_webhook_options_integration_response.id,
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