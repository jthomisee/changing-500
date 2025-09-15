# Notification-related Lambda functions and resources

# Queue Notification Lambda Function
resource "aws_lambda_function" "queue_notification" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-queue-notification-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "queueNotification.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs22.x"
  timeout         = 30

  environment {
    variables = {
      SMS_QUEUE_URL              = aws_sqs_queue.sms_notification_queue.url
      EMAIL_QUEUE_URL            = aws_sqs_queue.email_notification_queue.url
      USERS_TABLE_NAME           = aws_dynamodb_table.users_table.name
      GAMES_TABLE_NAME           = aws_dynamodb_table.games_table.name
      GROUPS_TABLE_NAME          = aws_dynamodb_table.groups_table.name
    }
  }

  tags = local.common_tags
}

# Send SMS Notification Lambda Function
resource "aws_lambda_function" "send_sms_notification" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-send-sms-notification-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "sendSMSNotification.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs22.x"
  timeout         = 60

  environment {
    variables = {
      TWILIO_ACCOUNT_SID         = var.twilio_account_sid
      TWILIO_AUTH_TOKEN          = var.twilio_auth_token
      TWILIO_FROM_NUMBER         = var.twilio_from_number
      USERS_TABLE_NAME           = aws_dynamodb_table.users_table.name
      RSVP_BASE_URL              = "https://${var.domain_name}/rsvp"
    }
  }

  tags = local.common_tags
}

# Handle SMS Reply Lambda Function
resource "aws_lambda_function" "handle_sms_reply" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-handle-sms-reply-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "handleSMSReply.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs22.x"
  timeout         = 30

  environment {
    variables = {
      TWILIO_ACCOUNT_SID         = var.twilio_account_sid
      TWILIO_AUTH_TOKEN          = var.twilio_auth_token
      TWILIO_FROM_NUMBER         = var.twilio_from_number
      TWILIO_VALIDATE_SIGNATURE  = "false"
      USERS_TABLE_NAME           = aws_dynamodb_table.users_table.name
      GAMES_TABLE_NAME           = aws_dynamodb_table.games_table.name
    }
  }

  tags = local.common_tags
}

# Handle RSVP Link Lambda Function
resource "aws_lambda_function" "handle_rsvp_link" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-handle-rsvp-link-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "handleRSVPLink.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs22.x"
  timeout         = 30

  environment {
    variables = {
      GAMES_TABLE_NAME = aws_dynamodb_table.games_table.name
    }
  }

  tags = local.common_tags
}

# Send Email Notification Lambda Function (future implementation)
resource "aws_lambda_function" "send_email_notification" {
  filename         = "lambda.zip"
  function_name    = "${var.project_name}-send-email-notification-${var.environment}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "sendEmailNotification.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "nodejs22.x"
  timeout         = 60

  environment {
    variables = {
      USERS_TABLE_NAME = aws_dynamodb_table.users_table.name
      RSVP_BASE_URL    = "https://${var.domain_name}/rsvp"
    }
  }

  tags = local.common_tags
}

