output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = "${aws_api_gateway_rest_api.dealin_holden_api.execution_arn}/${var.environment}"
}

output "api_gateway_invoke_url" {
  description = "Invoke URL of the API Gateway"
  value       = aws_api_gateway_stage.dealin_holden_api_stage.invoke_url
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.games_table.name
}

output "cloudfront_distribution_url" {
  description = "CloudFront distribution URL"
  value       = "https://${aws_cloudfront_distribution.website_distribution.domain_name}"
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.website_bucket.bucket
}

output "lambda_get_games_function_name" {
  description = "Name of the get games Lambda function"
  value       = aws_lambda_function.get_games.function_name
}

output "lambda_create_game_function_name" {
  description = "Name of the create game Lambda function"  
  value       = aws_lambda_function.create_game.function_name
}

output "website_url" {
  description = "Website URL with custom domain"
  value       = "https://dealinholden.com"
}

output "certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = aws_acm_certificate.website_cert.arn
}

output "certificate_validation_records" {
  description = "DNS validation records for the certificate"
  value = {
    for dvo in aws_acm_certificate.website_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
}