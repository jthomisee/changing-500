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
          "arn:aws:ssm:*:*:parameter/changing-500/*"
        ]
      }
    ]
  })

  tags = local.common_tags
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

resource "aws_iam_role_policy_attachment" "lambda_ssm_policy_attachment" {
  policy_arn = aws_iam_policy.lambda_ssm_policy.arn
  role       = aws_iam_role.lambda_execution_role.name
}
