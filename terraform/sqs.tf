# SQS Queues for notification processing

# SMS Notification Queue
resource "aws_sqs_queue" "sms_notification_queue" {
  name                      = "${var.project_name}-sms-notifications-${var.environment}"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 1209600 # 14 days
  receive_wait_time_seconds = 20
  visibility_timeout_seconds = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.sms_notification_dlq.arn
    maxReceiveCount     = 3
  })

  tags = local.common_tags
}

# SMS Notification Dead Letter Queue
resource "aws_sqs_queue" "sms_notification_dlq" {
  name                      = "${var.project_name}-sms-notifications-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days

  tags = local.common_tags
}

# Email Notification Queue
resource "aws_sqs_queue" "email_notification_queue" {
  name                      = "${var.project_name}-email-notifications-${var.environment}"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 1209600 # 14 days
  receive_wait_time_seconds = 20
  visibility_timeout_seconds = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.email_notification_dlq.arn
    maxReceiveCount     = 3
  })

  tags = local.common_tags
}

# Email Notification Dead Letter Queue
resource "aws_sqs_queue" "email_notification_dlq" {
  name                      = "${var.project_name}-email-notifications-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days

  tags = local.common_tags
}

# SQS Queue Policy for SMS notifications
resource "aws_sqs_queue_policy" "sms_notification_queue_policy" {
  queue_url = aws_sqs_queue.sms_notification_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution_role.arn
        }
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.sms_notification_queue.arn
      }
    ]
  })
}

# SQS Queue Policy for Email notifications
resource "aws_sqs_queue_policy" "email_notification_queue_policy" {
  queue_url = aws_sqs_queue.email_notification_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution_role.arn
        }
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage", 
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.email_notification_queue.arn
      }
    ]
  })
}

# Lambda event source mapping for SMS queue
resource "aws_lambda_event_source_mapping" "sms_queue_trigger" {
  event_source_arn = aws_sqs_queue.sms_notification_queue.arn
  function_name    = aws_lambda_function.send_sms_notification.arn
  batch_size       = 10
  maximum_batching_window_in_seconds = 5

  depends_on = [aws_lambda_function.send_sms_notification]
}

# Lambda event source mapping for Email queue (future implementation)
resource "aws_lambda_event_source_mapping" "email_queue_trigger" {
  event_source_arn = aws_sqs_queue.email_notification_queue.arn
  function_name    = aws_lambda_function.send_email_notification.arn
  batch_size       = 10
  maximum_batching_window_in_seconds = 5

  depends_on = [aws_lambda_function.send_email_notification]
}